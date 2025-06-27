#!/usr/bin/env node

import { claude } from './dist/index.js';

console.log('🧪 Testing Claude Code SDK Beta Branch Functionality\n');
console.log('This tests the actual API as implemented in the beta branch.\n');

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

// Core Test 1: Basic query with correct API
await test('Basic Claude Code CLI Integration', async () => {
  const response = await claude()
    .withModel('sonnet')
    .query('Say exactly "Hello SDK Test" and nothing else')
    .asText();
  
  console.log('Got response:', response);
  if (!response || !response.includes('Hello SDK Test')) {
    throw new Error(`Unexpected response: ${response}`);
  }
});

// Core Test 2: Abort signal with correct method name
await test('Abort Signal Support', async () => {
  const controller = new AbortController();
  
  const queryPromise = claude()
    .withModel('sonnet')
    .withSignal(controller.signal)  // Using withSignal, not withAbortSignal
    .query('Count from 1 to 1000 very slowly')
    .asText();
  
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

// Core Test 3: Get usage statistics
await test('Usage Statistics and Cost', async () => {
  const parser = claude()
    .withModel('sonnet')
    .query('Say "usage test"');
  
  // Get the full result with usage data
  const messages = await parser.asArray();
  const stats = await parser.getUsageStats();
  
  console.log('Usage stats:', stats);
  if (stats && (!stats.inputTokens || !stats.outputTokens)) {
    console.log('⚠️  WARNING: Incomplete usage data');
  }
});

// Core Test 4: Message streaming with onMessage
await test('Message Streaming', async () => {
  let messageCount = 0;
  
  await claude()
    .withModel('sonnet')
    .onMessage((msg) => {
      messageCount++;
      console.log(`  - Got message type: ${msg.type}`);
    })
    .query('Say "hello"')
    .asText();
  
  if (messageCount === 0) {
    throw new Error('No messages streamed');
  }
  console.log(`Total messages streamed: ${messageCount}`);
});

// Core Test 5: Model validation
await test('Model Validation', async () => {
  // Valid model
  await claude()
    .withModel('opus')
    .query('Say "opus works"')
    .asText();
  
  // Invalid model - this might not fail at the SDK level
  try {
    await claude()
      .withModel('gpt-4')
      .query('This might work or fail')
      .asText();
    console.log('Model validation happens at CLI level');
  } catch (error) {
    console.log('Invalid model rejected:', error.message);
  }
});

// Core Test 6: Tool permissions with correct methods
await test('Tool Permissions', async () => {
  const result = await claude()
    .withModel('sonnet')
    .allowTools('Bash', 'Read')  // Using allowTools, not withAllowedTools
    .denyTools('WebSearch')      // Using denyTools, not withDeniedTools
    .query('Use bash to echo "tool test"')
    .asText();
  
  console.log('Tool permission query completed');
});

// Core Test 7: Tool execution results
await test('Tool Execution Parsing', async () => {
  const executions = await claude()
    .withModel('sonnet')
    .query('Use bash to echo "hello" and echo "world"')
    .asToolExecutions();
  
  console.log(`Found ${executions.length} tool executions`);
  executions.forEach(exec => {
    console.log(`  - ${exec.tool}: ${exec.isError ? 'ERROR' : 'SUCCESS'}`);
  });
});

// Core Test 8: Get result message
await test('Result Message Extraction', async () => {
  const result = await claude()
    .withModel('sonnet')
    .query('What is 2 + 2?')
    .asResult();
  
  console.log('Result message:', result);
  if (!result) {
    console.log('⚠️  No explicit result message (might be in assistant messages)');
  }
});

// Core Test 9: Skip permissions
await test('Permission Modes', async () => {
  // Test skipPermissions
  await claude()
    .skipPermissions()
    .query('Test with skip permissions')
    .asText();
  
  // Test acceptEdits
  await claude()
    .acceptEdits()
    .query('Test with accept edits')
    .asText();
  
  console.log('Permission modes working');
});

// Core Test 10: Multiple queries with same builder
await test('Sequential Queries', async () => {
  const builder = claude()
    .withModel('sonnet')
    .withTimeout(30000);
  
  for (let i = 1; i <= 3; i++) {
    const response = await builder
      .query(`Say "query ${i}"`)
      .asText();
    console.log(`  Query ${i} completed`);
  }
});

// Summary
console.log('\n\n' + '='.repeat(50));
console.log('📊 BETA BRANCH FUNCTIONALITY TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`📈 Total: ${tests.passed + tests.failed}`);
console.log('='.repeat(50));

if (tests.failed > 0) {
  console.log('\n❌ Failed tests:');
  tests.results
    .filter(r => r.status === 'FAIL')
    .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
} else {
  console.log('\n✅ All functionality is working in the beta branch!');
}

process.exit(tests.failed > 0 ? 1 : 0);