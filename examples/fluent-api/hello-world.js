import { claude } from '../../dist/index.mjs';

/**
 * Hello World Example using Fluent API
 * Demonstrates the simplest usage of the Claude Code SDK with fluent API syntax
 */

// Simple query
const result = await claude()
  .query('Say hello!')
  .asText();

console.log(result);

// With model selection
const sonnetResult = await claude()
  .withModel('sonnet')
  .query('Write a haiku about programming')
  .asText();

console.log('\nHaiku with Sonnet model:');
console.log(sonnetResult);

// Interactive example with streaming
console.log('\nStreaming example:');
await claude()
  .withModel('haiku')
  .query('Count from 1 to 5 slowly')
  .stream(async (message) => {
    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          process.stdout.write(block.text);
        }
      }
    }
  });
console.log();