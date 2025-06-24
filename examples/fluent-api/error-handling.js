import { claude } from '../../dist/index.mjs';

/**
 * Error Handling Example using Fluent API
 * Demonstrates various error handling patterns with the SDK
 */

// 1. Basic error handling with try-catch
console.log('1. Basic error handling:');
try {
  const result = await claude()
    .withTimeout(5000) // Very short timeout to trigger error
    .query('Write a 1000 word essay')
    .asText();
  
  console.log(result);
} catch (error) {
  console.error('Error occurred:', error.message);
  if (error.code) {
    console.error('Error code:', error.code);
  }
}

// 2. Handling specific error types
console.log('\n2. Handling specific error types:');
try {
  const result = await claude()
    .withModel('invalid-model')
    .query('Test query')
    .asText();
} catch (error) {
  if (error.name === 'ClaudeCodeError') {
    console.error('Claude Code specific error:', error.message);
  } else if (error.name === 'ValidationError') {
    console.error('Validation error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}

// 3. Graceful degradation with error recovery
console.log('\n3. Error recovery with fallback:');
async function queryWithFallback(prompt, options = {}) {
  try {
    // Try with preferred model
    return await claude()
      .withModel('opus')
      .withTimeout(30000)
      .query(prompt)
      .asText();
  } catch (error) {
    console.warn('Primary query failed, trying fallback...');
    // Fallback to faster model with longer timeout
    return await claude()
      .withModel('haiku')
      .withTimeout(60000)
      .query(prompt)
      .asText();
  }
}

const fallbackResult = await queryWithFallback('What is 2+2?');
console.log('Result with fallback:', fallbackResult);

// 4. Handling streaming errors
console.log('\n4. Handling streaming errors:');
try {
  const messages = claude()
    .withModel('sonnet')
    .onMessage(msg => {
      if (msg.type === 'error') {
        console.error('Stream error:', msg);
      }
    })
    .query('Generate some content')
    .asMessages();
  
  for await (const message of messages) {
    console.log('Message type:', message.type);
    if (message.type === 'assistant') {
      console.log('Content blocks:', message.content.length);
    }
  }
} catch (error) {
  console.error('Stream processing error:', error);
}

// 5. Tool usage error handling
console.log('\n5. Tool usage error handling:');
try {
  const result = await claude()
    .allowTools('Read')
    .denyTools('Write', 'Edit') // Explicitly deny write operations
    .onToolUse(tool => {
      console.log(`Tool requested: ${tool.name}`);
      if (tool.name === 'Write' || tool.name === 'Edit') {
        throw new Error(`Denied tool: ${tool.name}`);
      }
    })
    .query('Create a new file called test.txt')
    .asText();
  
  console.log(result);
} catch (error) {
  console.error('Tool usage error:', error.message);
}

// 6. Timeout and cancellation
console.log('\n6. Timeout handling:');
const controller = new AbortController();

// Cancel after 2 seconds
setTimeout(() => controller.abort(), 2000);

try {
  const result = await claude()
    .withTimeout(10000)
    .withEnv({ ABORT_SIGNAL: controller.signal })
    .query('Write a long story')
    .asText();
  
  console.log(result);
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Query was cancelled');
  } else {
    console.error('Other error:', error.message);
  }
}

// 7. Validation errors
console.log('\n7. Validation error handling:');
try {
  // Invalid tool name
  const result = await claude()
    .allowTools('InvalidToolName')
    .query('Do something')
    .asText();
} catch (error) {
  console.error('Validation error:', error.message);
}

// 8. Error context and debugging
console.log('\n8. Debugging with error context:');
const debugQuery = claude()
  .debug(true)
  .withLogger({
    info: (msg, context) => console.log('[INFO]', msg, context),
    error: (msg, context) => console.error('[ERROR]', msg, context),
    warn: (msg, context) => console.warn('[WARN]', msg, context),
    debug: (msg, context) => console.log('[DEBUG]', msg, context)
  })
  .withModel('sonnet')
  .query('Simple test query');

try {
  const result = await debugQuery.asText();
  console.log('Debug query result:', result);
} catch (error) {
  console.error('Debug query failed:', error);
  // Error will include detailed context from logger
}