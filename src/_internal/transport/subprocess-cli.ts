import { execa, type ExecaChildProcess } from 'execa';
import which from 'which';
import { createInterface } from 'node:readline';
import { platform } from 'node:os';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { CLIConnectionError, CLINotFoundError, ProcessError, CLIJSONDecodeError } from '../../errors.js';
import type { ClaudeCodeOptions, CLIOutput } from '../../types.js';

export class SubprocessCLITransport {
  private process?: ExecaChildProcess;
  private options: ClaudeCodeOptions;
  private prompt: string;

  constructor(prompt: string, options: ClaudeCodeOptions = {}) {
    this.prompt = prompt;
    this.options = options;
  }

  private async findCLI(): Promise<string> {
    // First, try to find in PATH - try both 'claude' and 'claude-code' for compatibility
    try {
      return await which('claude');
    } catch {
      // Try the alternative name
      try {
        return await which('claude-code');
      } catch {
        // Not found in PATH, continue to check other locations
      }
    }

    // Common installation paths to check
    const paths: string[] = [];
    const isWindows = platform() === 'win32';
    const home = homedir();

    if (isWindows) {
      paths.push(
        join(home, 'AppData', 'Local', 'Programs', 'claude', 'claude.exe'),
        join(home, 'AppData', 'Local', 'Programs', 'claude-code', 'claude-code.exe'),
        'C:\\Program Files\\claude\\claude.exe',
        'C:\\Program Files\\claude-code\\claude-code.exe'
      );
    } else {
      paths.push(
        '/usr/local/bin/claude',
        '/usr/local/bin/claude-code',
        '/usr/bin/claude',
        '/usr/bin/claude-code',
        '/opt/homebrew/bin/claude',
        '/opt/homebrew/bin/claude-code',
        join(home, '.local', 'bin', 'claude'),
        join(home, '.local', 'bin', 'claude-code'),
        join(home, 'bin', 'claude'),
        join(home, 'bin', 'claude-code'),
        join(home, '.claude', 'local', 'claude')  // Claude's custom installation path
      );
    }

    // Try global npm/yarn paths
    try {
      const { stdout: npmPrefix } = await execa('npm', ['config', 'get', 'prefix']);
      if (npmPrefix) {
        paths.push(
          join(npmPrefix.trim(), 'bin', 'claude'),
          join(npmPrefix.trim(), 'bin', 'claude-code')
        );
      }
    } catch {
      // Ignore error and continue
    }

    // Check each path
    for (const path of paths) {
      try {
        await execa(path, ['--version']);
        return path;
      } catch {
      // Ignore error and continue
    }
    }

    throw new CLINotFoundError();
  }

  private buildCommand(): string[] {
    const args: string[] = [this.prompt, '--print', '--output-format', 'json'];

    // Claude CLI supported flags (from --help)
    if (this.options.model) args.push('--model', this.options.model);
    if (this.options.debug) args.push('--debug');
    
    // Note: Claude CLI handles authentication internally
    // It will use either session auth or API key based on user's setup

    // Handle allowed/disallowed tools (Claude CLI uses camelCase flags)
    if (this.options.allowedTools && this.options.allowedTools.length > 0) {
      args.push('--allowedTools', this.options.allowedTools.join(','));
    }
    if (this.options.deniedTools && this.options.deniedTools.length > 0) {
      args.push('--disallowedTools', this.options.deniedTools.join(','));
    }

    // Handle permission mode
    if (this.options.permissionMode === 'bypassPermissions') {
      args.push('--dangerously-skip-permissions');
    }

    // Handle MCP config
    if (this.options.mcpServers && this.options.mcpServers.length > 0) {
      const mcpConfig = this.options.mcpServers.map(server => ({
        command: server.command,
        args: server.args,
        env: server.env
      }));
      args.push('--mcp-config', JSON.stringify(mcpConfig));
    }

    return args;
  }

  async connect(): Promise<void> {
    const cliPath = await this.findCLI();
    const args = this.buildCommand();

    const env = {
      ...process.env,
      ...this.options.env,
      CLAUDE_CODE_ENTRYPOINT: 'sdk-ts'
    };

    try {
      this.process = execa(cliPath, args, {
        env,
        cwd: this.options.cwd,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
        buffer: false
      });
    } catch (error) {
      throw new CLIConnectionError(`Failed to start Claude Code CLI: ${error}`);
    }
  }

  async *receiveMessages(): AsyncGenerator<CLIOutput> {
    if (!this.process || !this.process.stdout) {
      throw new CLIConnectionError('Not connected to CLI');
    }

    const rl = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });

    try {
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed) as CLIOutput;
          yield parsed;
          
          if (parsed.type === 'end') {
            break;
          }
        } catch (error) {
          throw new CLIJSONDecodeError(
            `Failed to parse CLI output: ${error}`,
            trimmed
          );
        }
      }
    } finally {
      rl.close();
    }

    // Wait for process to exit
    try {
      await this.process;
    } catch (error: any) {
      if (error.exitCode !== 0) {
        throw new ProcessError(
          `Claude Code CLI exited with code ${error.exitCode}`,
          error.exitCode,
          error.signal
        );
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.cancel();
      this.process = undefined;
    }
  }
}