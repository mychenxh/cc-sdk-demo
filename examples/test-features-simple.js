#!/usr/bin/env node

/**
 * Simple Feature Tests
 * 
 * Test each enhanced feature individually
 */

import { 
  query,
  createTokenStream,
  createPermissionManager,
  createTelemetryProvider,
  createRetryExecutor,
  detectErrorType
} from '../dist/index.mjs';

console.log('🧪 Testing Enhanced Features\n');

// Test 1: Permission Manager (doesn't require API calls)
console.log('1️⃣ Testing Permission Manager');
console.log('------------------------------');
(async () => {
  const permissionManager = createPermissionManager({
    allowedTools: ['Read', 'Write', 'Edit'],
    deniedTools: ['Bash', 'WebSearch']
  });

  const tools = ['Read', 'Write', 'Edit', 'Bash', 'WebSearch'];
  for (const tool of tools) {
    const allowed = await permissionManager.isToolAllowed(tool, { userId: 'test' });
    console.log(`${tool}: ${allowed ? '✅ Allowed' : '❌ Denied'}`);
  }
  console.log();
})();

// Test 2: Retry Executor (doesn't require API calls)
console.log('2️⃣ Testing Retry Executor');
console.log('--------------------------');
(async () => {
  const retryExecutor = createRetryExecutor({
    maxAttempts: 3,
    initialDelay: 200,
    multiplier: 2
  });

  let attempts = 0;
  try {
    const result = await retryExecutor.execute(async () => {
      attempts++;
      console.log(`Attempt ${attempts}...`);
      if (attempts < 2) {
        throw new Error('Temporary failure');
      }
      return 'Success!';
    });
    console.log(`✅ Result: ${result}`);
    console.log('📊 Stats:', retryExecutor.getStats());
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
  console.log();
})();

// Test 3: Error Detection
console.log('3️⃣ Testing Error Detection');
console.log('---------------------------');
(() => {
  const testMessages = [
    'Rate limit exceeded',
    'Tool permission denied: Bash',
    'Authentication failed',
    'Network timeout',
    'Invalid request'
  ];

  for (const msg of testMessages) {
    const errorType = detectErrorType(msg);
    console.log(`"${msg}" → ${errorType}`);
  }
  console.log();
})();

// Test 4: Token Streaming (requires API call)
console.log('4️⃣ Testing Token Streaming');
console.log('---------------------------');
(async () => {
  try {
    // Create a fresh generator for token streaming
    const tokenStream = createTokenStream(
      query('Say exactly: "Hello world from SDK"', { temperature: 0 })
    );
    
    console.log('Streaming tokens:');
    let count = 0;
    for await (const chunk of tokenStream.tokens()) {
      process.stdout.write(chunk.token);
      count++;
    }
    
    console.log(`\n✅ Streamed ${count} tokens`);
    console.log('📊 Metrics:', tokenStream.getMetrics());
  } catch (error) {
    console.error('❌ Token streaming failed:', error.message);
  }
  console.log();
})();

// Test 5: Basic Query (to verify SDK works)
console.log('5️⃣ Testing Basic Query');
console.log('-----------------------');
(async () => {
  try {
    const messages = [];
    for await (const message of query('Reply with exactly: OK')) {
      messages.push(message);
      if (message.type === 'assistant') {
        console.log('Assistant response:', message.content);
      }
    }
    console.log(`✅ Query completed with ${messages.length} messages`);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
})();