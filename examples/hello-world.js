/**
 * Hello World Example
 * Demonstrates the simplest usage of the Claude Code SDK
 */

import { query } from '@instantlyeasy/claude-code-sdk-ts';

async function main() {
  console.log('Asking Claude to say Hello World...\n');
  
  for await (const message of query('Say "Hello World!"')) {
    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          console.log('Claude says:', block.text);
        }
      }
    }
  }
}

main().catch(console.error);