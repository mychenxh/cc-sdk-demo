import { claude } from '@instantlyeasy/claude-code-sdk-ts';

/**
 * Hello World Example using Fluent API
 * 
 * This example demonstrates the simplest usage of the Claude Code SDK
 * with the fluent API syntax. Perfect for getting started quickly.
 * 
 * Prerequisites:
 * - npm install @instantlyeasy/claude-code-sdk-ts
 * - Claude Code CLI installed and configured
 */

async function main() {
  try {
    // Simple query
    console.log('1. Basic Query Example');
    console.log('---------------------\n');
    
    const result = await claude()
      .query('Say hello!')
      .asText();
    
    console.log('Response:', result);
  } catch (error) {
    console.error('Error in basic query:', error.message);
  }

  try {
    // With model selection
    console.log('\n\n2. Model Selection Example');
    console.log('--------------------------\n');
    
    const sonnetResult = await claude()
      .withModel('sonnet')
      .query('Write a haiku about programming')
      .asText();
    
    console.log('Haiku with Sonnet model:');
    console.log(sonnetResult);
  } catch (error) {
    console.error('Error with model selection:', error.message);
  }

  try {
    // Interactive example with streaming
    console.log('\n\n3. Streaming Example');
    console.log('--------------------\n');
    
    console.log('Streaming response (watch it appear in real-time):');
    
    await claude()
      .withModel('sonnet')
      .query('Count from 1 to 5 slowly, one number per line')
      .stream(async (message) => {
        if (message.type === 'assistant') {
          for (const block of message.content) {
            if (block.type === 'text') {
              process.stdout.write(block.text);
            }
          }
        }
      });
    
    console.log('\n\n✅ Streaming completed!');
  } catch (error) {
    console.error('Error in streaming:', error.message);
  }
  
  console.log('\n✨ All examples completed!');
}

// Run the examples
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});