import { SubprocessCLITransport } from './transport/subprocess-cli.js';
import type { ClaudeCodeOptions, Message } from '../types.js';
import { detectErrorType, createTypedError } from '../errors.js';

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

  private parseMessage(output: Record<string, unknown>): Message | null {
    // Handle stream-json format directly from CLI
    switch (output.type) {
      case 'user':
        return {
          type: 'user',
          content: output.message?.content || ''
        };
      
      case 'assistant':
        return {
          type: 'assistant',
          content: output.message?.content || []
        };
        
      case 'system':
        return {
          type: 'system',
          subtype: output.subtype,
          data: output
        };
        
      case 'result':
        return {
          type: 'result',
          subtype: output.subtype,
          content: output.result || '',
          usage: output.usage,
          cost: {
            total_cost: output.total_cost_usd
          }
        };
      
      case 'error': {
        const errorMessage = (output.error as { message?: string })?.message || 'Unknown error';
        const errorType = detectErrorType(errorMessage);
        throw createTypedError(errorType, errorMessage, output.error as { code?: string; stack?: string });
      }
      
      default:
        // Skip unknown message types
        return null;
    }
  }
}