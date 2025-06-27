#!/usr/bin/env node

import { claude } from './dist/index.js';

console.log('🧪 Testing Claude Code SDK Core Functionality (Beta Branch)\n');

const tests = {
  passed: 0,
  failed: 0
};

async function test(name, fn) {
  console.log(`\n📋 ${name}`);
  try {
    await fn();
    tests.passed++;
    console.log('✅ PASSED');
  } catch (error) {
    tests.failed++;
    console.log(`❌ FAILED: ${error.message}`);
  }
}

// Test 1: Basic query
await test('Basic Query', async () => {
  const response = await claude()
    .withModel('sonnet')
    .query('Say "Hello Beta SDK"')
    .asText();
  
  if (!response.includes('Hello Beta SDK')) {
    throw new Error('Response missing expected text');
  }
});

// Test 2: Abort signal
await test('Abort Signal', async () => {
  const controller = new AbortController();
  
  const queryPromise = claude()
    .withModel('sonnet')
    .withSignal(controller.signal)
    .query('Count to 100 slowly')
    .asText();
  
  setTimeout(() => controller.abort(), 200);
  
  try {
    await queryPromise;
    throw new Error('Should have aborted');
  } catch (error) {
    if (!error.message.includes('abort')) {
      throw error;
    }
  }
});

// Test 3: Message streaming
await test('Message Streaming', async () => {
  let count = 0;
  
  await claude()
    .onMessage(() => count++)
    .query('Say hello')
    .asText();
  
  if (count === 0) {
    throw new Error('No messages streamed');
  }
});

// Test 4: Tool permissions
await test('Tool Permissions', async () => {
  await claude()
    .allowTools('Bash')
    .denyTools('WebSearch')
    .query('Echo test')
    .asText();
});

// Test 5: Permission modes
await test('Permission Modes', async () => {
  await claude()
    .skipPermissions()
    .query('Test skip')
    .asText();
  
  await claude()
    .acceptEdits()
    .query('Test accept')
    .asText();
});

// Test 6: Tool results
await test('Tool Execution Results', async () => {
  const executions = await claude()
    .query('Use bash to echo "test"')
    .asToolExecutions();
  
  console.log(`  Found ${executions.length} tool executions`);
});

// Test 7: Result message
await test('Result Message', async () => {
  const result = await claude()
    .query('What is 2+2?')
    .asResult();
  
  console.log(`  Result: ${result || 'No explicit result'}`);
});

// Test 8: Multiple formats
await test('Multiple Output Formats', async () => {
  const parser = claude().query('Say "format test"');
  
  const text = await parser.asText();
  const array = await parser.asArray();
  const result = await parser.asResult();
  
  if (!text) throw new Error('No text output');
  if (!array.length) throw new Error('No array output');
});

// Summary
console.log('\n' + '='.repeat(40));
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log('='.repeat(40));

if (tests.failed === 0) {
  console.log('\n🎉 All core functionality working!');
  console.log('📦 Beta branch is ready for testing.');
} else {
  console.log('\n⚠️  Some tests failed.');
}

process.exit(tests.failed > 0 ? 1 : 0);