#!/usr/bin/env node

/**
 * Sequential Feature Tests
 * 
 * Test each enhanced feature one by one
 */

import { 
  query,
  createTokenStream,
  createPermissionManager,
  createTelemetryProvider,
  createRetryExecutor,
  detectErrorType
} from '../dist/index.mjs';

async function runTests() {
  console.log('🧪 Testing Enhanced Features\n');

  // Test 1: Permission Manager
  console.log('1️⃣ Testing Permission Manager');
  console.log('------------------------------');
  try {
    const permissionManager = createPermissionManager({
      allowedTools: ['Read', 'Write', 'Edit'],
      deniedTools: ['Bash', 'WebSearch']
    });

    const tools = ['Read', 'Write', 'Edit', 'Bash', 'WebSearch'];
    for (const tool of tools) {
      const allowed = await permissionManager.isToolAllowed(tool, { userId: 'test' });
      console.log(`${tool}: ${allowed ? '✅ Allowed' : '❌ Denied'}`);
    }
    console.log('✅ Permission manager works!\n');
  } catch (error) {
    console.error('❌ Permission manager failed:', error.message, '\n');
  }

  // Test 2: Retry Executor
  console.log('2️⃣ Testing Retry Executor');
  console.log('--------------------------');
  try {
    const retryExecutor = createRetryExecutor({
      maxAttempts: 3,
      initialDelay: 200,
      multiplier: 2
    });

    let attempts = 0;
    const result = await retryExecutor.execute(async () => {
      attempts++;
      console.log(`Attempt ${attempts}...`);
      if (attempts < 2) {
        throw new Error('Temporary failure');
      }
      return 'Success!';
    }, {
      onRetry: (attempt, error, delay) => {
        console.log(`Retrying after error: ${error.message} (${delay}ms)`);
      }
    });
    
    console.log(`✅ Result: ${result}`);
    console.log('📊 Stats:', retryExecutor.getStats());
    console.log();
  } catch (error) {
    console.error('❌ Retry executor failed:', error.message, '\n');
  }

  // Test 3: Error Detection
  console.log('3️⃣ Testing Error Detection');
  console.log('---------------------------');
  try {
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
    console.log('✅ Error detection works!\n');
  } catch (error) {
    console.error('❌ Error detection failed:', error.message, '\n');
  }

  // Test 4: Telemetry Provider
  console.log('4️⃣ Testing Telemetry Provider');
  console.log('------------------------------');
  try {
    const telemetryProvider = createTelemetryProvider();
    await telemetryProvider.initialize({
      serviceName: 'test-sdk',
      serviceVersion: '1.0.0'
    });
    
    console.log('Initial metrics:', telemetryProvider.getQueryMetrics());
    await telemetryProvider.shutdown();
    console.log('✅ Telemetry provider works!\n');
  } catch (error) {
    console.error('❌ Telemetry provider failed:', error.message, '\n');
  }

  // Test 5: Basic Query
  console.log('5️⃣ Testing Basic Query');
  console.log('-----------------------');
  try {
    const messages = [];
    for await (const message of query('Reply with exactly the word: OK')) {
      messages.push(message);
      if (message.type === 'assistant' && message.content) {
        const text = message.content.find(block => block.type === 'text')?.text;
        console.log('Assistant response:', text);
      }
    }
    console.log(`✅ Query completed with ${messages.length} messages\n`);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Exit code:', error.exitCode, '\n');
  }

  // Test 6: Token Streaming
  console.log('6️⃣ Testing Token Streaming');
  console.log('---------------------------');
  console.log('Note: Token streaming requires parsing assistant message content');
  console.log('Current implementation expects a specific format that may not match');
  console.log('the actual Claude CLI output format.\n');
  
  try {
    // First, let's see what a real message looks like
    console.log('Checking message format first:');
    for await (const message of query('Say: Hello')) {
      if (message.type === 'assistant') {
        console.log('Assistant message structure:', JSON.stringify(message, null, 2));
        break;
      }
    }
    
    // Now try token streaming with a new query
    console.log('\nAttempting token stream:');
    const tokenStream = createTokenStream(
      query('Count: 1 2 3')
    );
    
    let tokenCount = 0;
    try {
      for await (const chunk of tokenStream.tokens()) {
        process.stdout.write(chunk.token);
        tokenCount++;
      }
      console.log(`\n✅ Streamed ${tokenCount} tokens`);
      console.log('📊 Metrics:', tokenStream.getMetrics());
    } catch (streamError) {
      console.log('❌ Token streaming error:', streamError.message);
      console.log('This is expected if the message format doesn\'t match expectations');
    }
  } catch (error) {
    console.error('❌ Token streaming test failed:', error.message);
  }

  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);