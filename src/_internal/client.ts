import { SubprocessCLITransport } from './transport/subprocess-cli.js';
import type { ClaudeCodeOptions, Message, CLIOutput } from '../types.js';
import { ClaudeSDKError } from '../errors.js';

export class InternalClient {
  private options: ClaudeCodeOptions;
  private prompt: string;

  constructor(prompt: string, options: ClaudeCodeOptions = {}) {
    this.prompt = prompt;
    this.options = options;
  }

  async *processQuery(): AsyncGenerator<Message> {
    const transport = new SubprocessCLITransport(this.prompt, this.options);

    try {
      await transport.connect();

      for await (const output of transport.receiveMessages()) {
        const message = this.parseMessage(output);
        if (message) {
          yield message;
        }
      }
    } finally {
      await transport.disconnect();
    }
  }

  private parseMessage(output: CLIOutput): Message | null {
    switch (output.type) {
      case 'message':
        return output.data;
      
      case 'error':
        throw new ClaudeSDKError(`CLI error: ${output.error.message}`);
      
      case 'end':
        return null;
      
      default:
        // Handle unknown message types gracefully
        console.warn('Unknown CLI output type:', output);
        return null;
    }
  }
}