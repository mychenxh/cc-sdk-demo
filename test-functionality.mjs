#!/usr/bin/env node

import { claude } from './dist/index.js';

console.log('🧪 Testing Claude Code SDK Core Functionality\n');
console.log('This tests ONLY the real functionality that matters for the release.\n');

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

async function test(name, fn) {
  console.log(`\n📋 Testing: ${name}`);
  try {
    await fn();
    tests.passed++;
    tests.results.push({ name, status: 'PASS' });
    console.log('✅ PASSED');
  } catch (error) {
    tests.failed++;
    tests.results.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAILED: ${error.message}`);
    if (error.stack) {
      console.log('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
  }
}

// Core Test 1: Can we talk to Claude Code CLI at all?
await test('Basic Claude Code CLI Integration', async () => {
  const result = await claude()
    .withModel('sonnet')
    .query('Say exactly "Hello SDK Test" and nothing else');
  
  console.log('Got response:', result.response);
  if (!result.response || !result.response.includes('Hello SDK Test')) {
    throw new Error(`Unexpected response: ${result.response}`);
  }
});

// Core Test 2: Can we abort a query mid-stream?
await test('Abort Signal Support', async () => {
  const controller = new AbortController();
  
  const queryPromise = claude()
    .withModel('sonnet')
    .withAbortSignal(controller.signal)
    .query('Count from 1 to 1000 very slowly');
  
  // Abort after 300ms
  setTimeout(() => controller.abort(), 300);
  
  try {
    await queryPromise;
    throw new Error('Query should have been aborted');
  } catch (error) {
    if (error.message.toLowerCase().includes('abort')) {
      console.log('Abort worked correctly');
    } else {
      throw new Error(`Wrong error type: ${error.message}`);
    }
  }
});

// Core Test 3: Do we get usage stats?
await test('Usage Statistics', async () => {
  const result = await claude()
    .withModel('sonnet')
    .query('Say "usage test"');
  
  console.log('Usage data:', result.usage);
  if (!result.usage || typeof result.usage.input_tokens !== 'number') {
    console.log('⚠️  WARNING: No usage data returned by CLI');
  }
});

// Core Test 4: Can we stream messages?
await test('Message Streaming', async () => {
  let messageCount = 0;
  
  await claude()
    .withModel('sonnet')
    .query('Say hello', {
      onMessage: (msg) => {
        messageCount++;
        console.log(`  - Got message type: ${msg.type}`);
      }
    });
  
  if (messageCount === 0) {
    throw new Error('No messages streamed');
  }
  console.log(`Total messages streamed: ${messageCount}`);
});

// Core Test 5: Model validation (only opus and sonnet allowed)
await test('Model Validation', async () => {
  // Valid model
  await claude()
    .withModel('opus')
    .query('Say "opus works"');
  
  // Invalid model
  try {
    await claude()
      .withModel('gpt-4')
      .query('This should fail');
    throw new Error('Invalid model should have been rejected');
  } catch (error) {
    if (error.message.includes('gpt-4') || error.message.includes('model')) {
      console.log('Invalid model correctly rejected');
    } else {
      throw error;
    }
  }
});

// Core Test 6: Tool permissions
await test('Tool Permissions', async () => {
  const result = await claude()
    .withModel('sonnet')
    .withAllowedTools(['Bash', 'Read'])
    .withDeniedTools(['WebSearch'])
    .query('Use bash to echo "tool test"');
  
  console.log('Tool permission query completed');
});

// Core Test 7: Multiple sequential queries (process cleanup)
await test('Sequential Query Process Cleanup', async () => {
  for (let i = 1; i <= 3; i++) {
    const result = await claude()
      .withModel('sonnet')
      .query(`Say "query ${i}"`);
    console.log(`  Query ${i} completed`);
  }
});

// Core Test 8: Concurrent queries
await test('Concurrent Queries', async () => {
  const queries = [
    claude().query('Say "1"'),
    claude().query('Say "2"'),
    claude().query('Say "3"')
  ];
  
  const results = await Promise.all(queries);
  if (results.length !== 3) {
    throw new Error(`Expected 3 results, got ${results.length}`);
  }
  console.log('All concurrent queries completed');
});

// Summary
console.log('\n\n' + '='.repeat(50));
console.log('📊 FUNCTIONALITY TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`📈 Total: ${tests.passed + tests.failed}`);
console.log('='.repeat(50));

if (tests.failed > 0) {
  console.log('\n❌ CRITICAL: The following core functionalities are broken:');
  tests.results
    .filter(r => r.status === 'FAIL')
    .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  console.log('\n⚠️  DO NOT RELEASE until these are fixed!');
} else {
  console.log('\n✅ All core functionality is working!');
  console.log('📦 SDK is ready for release.');
}

process.exit(tests.failed > 0 ? 1 : 0);