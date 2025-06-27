import { SubprocessCLITransport } from './transport/subprocess-cli.js';
import type { ClaudeCodeOptions, Message, CLIOutput, AssistantMessage } from '../types.js';
import { detectErrorType, createTypedError } from '../errors.js';
import { loadSafeEnvironmentOptions } from '../environment.js';
import { applyEnvironmentOptions } from './options-merger.js';

export class InternalClient {
  private options: ClaudeCodeOptions;
  private prompt: string;

  constructor(prompt: string, options: ClaudeCodeOptions = {}) {
    this.prompt = prompt;
    
    // Load safe environment variables and merge with user options
    const envOptions = loadSafeEnvironmentOptions();
    this.options = applyEnvironmentOptions(options, envOptions);
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
    // Handle CLIOutput types based on actual CLI output
    switch (output.type) {
      case 'assistant': {
        // Extract the actual assistant message from the wrapper
        const assistantMsg = output as AssistantMessage;
        if (assistantMsg.message) {
          // Return a simplified assistant message with just the content
          return {
            type: 'assistant',
            content: assistantMsg.message.content,
            session_id: assistantMsg.session_id
          } as AssistantMessage;
        }
        return output as Message;
      }
        
      case 'system':
        // System messages (like init) - skip these
        return null;
        
      case 'result':
        // Result message with usage stats - return it
        return output as Message;
        
      case 'error': {
        const errorMessage = output.error?.message || 'Unknown error';
        const errorType = detectErrorType(errorMessage);
        throw createTypedError(errorType, errorMessage, output.error);
      }
      
      default:
        // Skip unknown message types
        return null;
    }
  }
}