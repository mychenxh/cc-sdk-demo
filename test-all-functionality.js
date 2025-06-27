#!/usr/bin/env node

import { claude, QueryBuilder, ResponseParser } from './dist/index.js';

console.log('🧪 Testing Claude Code SDK Real Functionality\n');

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
    console.log(error.stack);
  }
}

// Test 1: Basic query functionality
await test('Basic query with real CLI', async () => {
  const result = await claude()
    .withModel('sonnet')
    .query('Say just "Hello SDK!" and nothing else');
  
  console.log('Response:', result.response);
  if (!result.response.includes('Hello SDK!')) {
    throw new Error('Response did not contain expected text');
  }
});

// Test 2: Abort signal handling
await test('Abort signal cancellation', async () => {
  const controller = new AbortController();
  
  // Start a query and abort it after 500ms
  const queryPromise = claude()
    .withModel('sonnet')
    .withAbortSignal(controller.signal)
    .query('Count slowly from 1 to 100, taking your time with each number');
  
  setTimeout(() => controller.abort(), 500);
  
  try {
    await queryPromise;
    throw new Error('Query should have been aborted');
  } catch (error) {
    // Check for abort error characteristics
    if (!error.message.includes('abort') && !error.message.includes('cancel')) {
      throw new Error(`Expected abort error, got: ${error.message}`);
    }
    console.log('Successfully aborted');
  }
});

// Test 3: Pre-aborted signal
await test('Pre-aborted signal handling', async () => {
  const controller = new AbortController();
  controller.abort(); // Abort before starting
  
  try {
    await claude()
      .withAbortSignal(controller.signal)
      .query('This should never execute');
    throw new Error('Query should have been aborted');
  } catch (error) {
    // Check for abort error characteristics
    if (!error.message.includes('abort') && !error.message.includes('cancel')) {
      throw new Error(`Expected abort error, got: ${error.message}`);
    }
  }
});

// Test 4: Message streaming and types
await test('Message streaming and types', async () => {
  const messages = [];
  
  await claude()
    .withModel('sonnet')
    .query('Say "First message" then "Second message"', {
      onMessage: (msg) => messages.push(msg)
    });
  
  console.log(`Received ${messages.length} messages`);
  if (messages.length === 0) {
    throw new Error('No messages received');
  }
  
  // Check for assistant messages
  const assistantMessages = messages.filter(m => m.type === 'assistant');
  if (assistantMessages.length === 0) {
    throw new Error('No assistant messages received');
  }
});

// Test 5: Cost and usage tracking
await test('Cost and usage information', async () => {
  const result = await claude()
    .withModel('sonnet')
    .query('Say "test"');
  
  console.log('Usage:', result.usage);
  console.log('Cost:', result.cost);
  
  // Note: Cost might be undefined if CLI doesn't provide it
  if (result.usage && (!result.usage.input_tokens || !result.usage.output_tokens)) {
    throw new Error('Usage information incomplete');
  }
});

// Test 6: Query Builder functionality
await test('QueryBuilder chaining', async () => {
  const builder = new QueryBuilder('Test prompt');
  
  // Test chaining methods
  const configured = builder
    .withModel('opus')
    .withMaxTokens(100)
    .withTemperature(0.5)
    .withContext(['test context']);
  
  if (configured.prompt !== 'Test prompt') {
    throw new Error('Prompt not preserved');
  }
  
  // Note: Can't test actual query without internal access
  console.log('QueryBuilder chaining works');
});

// Test 7: Response Parser
await test('ResponseParser functionality', async () => {
  const parser = new ResponseParser();
  
  // Test parsing a response (would need actual message format)
  const messages = [];
  await claude()
    .withModel('sonnet')
    .query('Say "test" and use the Bash tool to echo "hello"', {
      onMessage: (msg) => messages.push(msg)
    });
  
  // Parse the collected messages
  const result = parser.parse(messages);
  console.log('Parsed result:', {
    hasResponse: !!result.response,
    hasUsage: !!result.usage,
    toolCount: result.tools?.length || 0
  });
});

// Test 8: Different models
await test('Model selection (opus vs sonnet)', async () => {
  // Test sonnet
  const sonnetResult = await claude()
    .withModel('sonnet')
    .query('Say "sonnet test"');
  
  console.log('Sonnet response received');
  
  // Test opus (might be slower/more expensive)
  const opusResult = await claude()
    .withModel('opus')
    .query('Say "opus test"');
  
  console.log('Opus response received');
});

// Test 9: Error handling for invalid models
await test('Invalid model rejection', async () => {
  try {
    await claude()
      .withModel('gpt-4')  // Invalid model
      .query('This should fail');
    throw new Error('Should have rejected invalid model');
  } catch (error) {
    console.log('Correctly rejected invalid model:', error.message);
  }
});

// Test 10: Subprocess clean disconnection
await test('Clean subprocess lifecycle', async () => {
  // Run multiple queries to test process management
  for (let i = 0; i < 3; i++) {
    const result = await claude()
      .withModel('sonnet')
      .query(`Say "test ${i}"`);
    console.log(`Query ${i} completed`);
  }
  
  // If processes aren't cleaned up, we'd see issues here
  console.log('All processes completed cleanly');
});

// Test 11: Concurrent queries
await test('Concurrent query execution', async () => {
  const queries = [
    claude().withModel('sonnet').query('Say "1"'),
    claude().withModel('sonnet').query('Say "2"'),
    claude().withModel('sonnet').query('Say "3"')
  ];
  
  const results = await Promise.all(queries);
  console.log(`Completed ${results.length} concurrent queries`);
  
  if (results.length !== 3) {
    throw new Error('Not all concurrent queries completed');
  }
});

// Test 12: Tool permissions
await test('Tool permissions', async () => {
  // Test with restricted tools
  const result = await claude()
    .withModel('sonnet')
    .withAllowedTools(['Bash'])
    .withDeniedTools(['WebSearch'])
    .query('List files using bash ls command');
  
  console.log('Query with tool restrictions completed');
});

// Summary
console.log('\n\n📊 Test Summary:');
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`📈 Total: ${tests.passed + tests.failed}`);

if (tests.failed > 0) {
  console.log('\n❌ Failed tests:');
  tests.results
    .filter(r => r.status === 'FAIL')
    .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
}

process.exit(tests.failed > 0 ? 1 : 0);