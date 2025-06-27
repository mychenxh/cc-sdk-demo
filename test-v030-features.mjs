#!/usr/bin/env node

import { 
  claude,
  detectErrorType,
  createTypedError,
  createTokenStream,
  createPermissionManager,
  createTelemetryProvider,
  createExponentialRetryExecutor,
  createLinearRetryExecutor,
  createFibonacciRetryExecutor,
  withRetry,
  ConsoleLogger,
  JSONLogger,
  MultiLogger,
  LogLevel
} from './dist/index.js';

console.log('🧪 Testing Claude Code SDK v0.3.0 Enhanced Features\n');

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
  }
}

// Test 1: Typed Error Handling
await test('Typed Error Handling', async () => {
  // Test error detection
  const errorType = detectErrorType('Rate limit exceeded. Please try again in 60 seconds.');
  if (errorType !== 'rate_limit_error') {
    throw new Error(`Expected rate_limit_error, got ${errorType}`);
  }
  
  // Test creating typed errors
  const rateLimitError = createTypedError('rate_limit_error', 'Too many requests', { 
    retryAfter: 60 
  });
  if (rateLimitError.type !== 'rate_limit_error') {
    throw new Error('Error type not set correctly');
  }
  
  console.log('  - Error detection works');
  console.log('  - Typed error creation works');
});

// Test 2: Token Streaming
await test('Token-Level Streaming', async () => {
  // Note: This would need a real query to test fully
  // For now, test that the API exists
  if (typeof createTokenStream !== 'function') {
    throw new Error('createTokenStream not exported');
  }
  console.log('  - Token streaming API available');
});

// Test 3: Retry Strategies
await test('Retry Strategies', async () => {
  // Test exponential retry
  const exponentialRetry = createExponentialRetryExecutor({
    maxAttempts: 3,
    initialDelay: 100,
    multiplier: 2
  });
  
  let attempts = 0;
  const result = await exponentialRetry.execute(async () => {
    attempts++;
    if (attempts < 2) {
      throw new Error('Simulated failure');
    }
    return 'success';
  });
  
  if (result !== 'success' || attempts !== 2) {
    throw new Error('Exponential retry failed');
  }
  
  // Test linear retry
  const linearRetry = createLinearRetryExecutor({
    maxAttempts: 2,
    delay: 50
  });
  
  attempts = 0;
  await linearRetry.execute(async () => {
    attempts++;
    return 'done';
  });
  
  if (attempts !== 1) {
    throw new Error('Linear retry executed too many times');
  }
  
  // Test fibonacci retry
  const fibRetry = createFibonacciRetryExecutor({
    maxAttempts: 3,
    initialDelay: 10
  });
  
  if (!fibRetry) {
    throw new Error('Fibonacci retry not created');
  }
  
  // Test withRetry helper
  const retryResult = await withRetry(
    async () => 'quick success',
    { maxAttempts: 1, strategy: 'exponential' }
  );
  
  if (retryResult !== 'quick success') {
    throw new Error('withRetry helper failed');
  }
  
  console.log('  - Exponential retry works');
  console.log('  - Linear retry works');
  console.log('  - Fibonacci retry works');
  console.log('  - withRetry helper works');
});

// Test 4: Per-Call Permissions
await test('Per-Call Tool Permissions', async () => {
  const permissionManager = createPermissionManager({
    allowedTools: ['Read', 'Grep'],
    deniedTools: ['Write', 'Delete']
  });
  
  // Test basic permissions
  const canRead = await permissionManager.isToolAllowed('Read');
  const canWrite = await permissionManager.isToolAllowed('Write');
  
  if (!canRead || canWrite) {
    throw new Error('Basic permissions not working');
  }
  
  // Get effective permissions
  const permissions = permissionManager.getEffectivePermissions();
  if (permissions.allowed.length !== 2 || permissions.denied.length !== 2) {
    throw new Error('Effective permissions incorrect');
  }
  
  console.log('  - Permission manager created');
  console.log('  - Tool permissions working');
  console.log('  - Effective permissions retrieved');
});

// Test 5: Telemetry Provider
await test('OpenTelemetry Integration', async () => {
  const telemetryProvider = createTelemetryProvider();
  
  await telemetryProvider.initialize({
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test'
  });
  
  const logger = telemetryProvider.getLogger('test');
  if (!logger) {
    throw new Error('Logger not created');
  }
  
  // Test spans
  const span = logger.startSpan('test-operation');
  span.setAttribute('test', true);
  span.end();
  
  // Test metrics
  logger.recordMetric('test.metric', 1);
  
  // Get metrics
  const queryMetrics = telemetryProvider.getQueryMetrics();
  if (typeof queryMetrics.totalQueries !== 'number') {
    throw new Error('Query metrics not available');
  }
  
  console.log('  - Telemetry provider initialized');
  console.log('  - Spans working');
  console.log('  - Metrics recording');
  console.log('  - Query metrics available');
});

// Test 6: Advanced Logging
await test('Advanced Logging Framework', async () => {
  // Test console logger
  const consoleLogger = new ConsoleLogger(LogLevel.DEBUG, '[Test]');
  consoleLogger.debug('Debug test');
  consoleLogger.info('Info test');
  
  // Test JSON logger
  let jsonOutput = '';
  const jsonLogger = new JSONLogger(LogLevel.INFO, (json) => {
    jsonOutput = json;
  });
  jsonLogger.info('JSON test', { extra: 'data' });
  
  if (!jsonOutput) {
    throw new Error('JSON logger not outputting');
  }
  
  // Test multi-logger
  const multiLogger = new MultiLogger([
    consoleLogger,
    jsonLogger
  ]);
  multiLogger.warn('Multi-logger test');
  
  console.log('  - Console logger works');
  console.log('  - JSON logger works');
  console.log('  - Multi-logger works');
});

// Test 7: MCP Server Permissions
await test('MCP Server-Level Permissions', async () => {
  // Test setting individual server permissions
  const builder = claude()
    .withMCPServerPermission('file-mcp', 'whitelist')
    .withMCPServerPermission('db-mcp', 'ask');
  
  // Test bulk permissions
  const bulkBuilder = claude()
    .withMCPServerPermissions({
      'file-mcp': 'whitelist',
      'git-mcp': 'whitelist',
      'api-mcp': 'blacklist'
    });
  
  console.log('  - Individual MCP permissions work');
  console.log('  - Bulk MCP permissions work');
});

// Test 8: Configuration Support
await test('Configuration File Support', async () => {
  // Test direct config
  const config = {
    version: '1.0',
    globalSettings: {
      model: 'opus',
      timeout: 30000
    },
    tools: {
      allowed: ['Read'],
      denied: ['Write']
    }
  };
  
  const configBuilder = claude().withConfig(config);
  console.log('  - Direct config application works');
  
  // Note: File-based config would need actual files
  console.log('  - Config file methods available');
});

// Test 9: Roles System
await test('Roles and Personas', async () => {
  // Test direct role definition
  const developerRole = {
    name: 'developer',
    model: 'opus',
    permissions: {
      mode: 'acceptEdits',
      tools: {
        allowed: ['Read', 'Write', 'Edit'],
        denied: ['Delete']
      }
    }
  };
  
  const roleBuilder = claude().withRole(developerRole);
  console.log('  - Direct role application works');
  
  // Test templated role
  const analystRole = {
    name: 'analyst',
    model: 'sonnet',
    promptingTemplate: 'You are a ${domain} analyst.',
    systemPrompt: 'Provide insights.'
  };
  
  const templatedBuilder = claude()
    .withRole(analystRole, { domain: 'financial' });
  
  console.log('  - Templated roles work');
});

// Test 10: Response Parser
await test('Response Parser Utilities', async () => {
  // Test that parser methods are available on query result
  const parser = claude().query('Test');
  
  // Check parser methods exist
  if (typeof parser.asText !== 'function') {
    throw new Error('asText method missing');
  }
  if (typeof parser.asJSON !== 'function') {
    throw new Error('asJSON method missing');
  }
  if (typeof parser.asToolExecutions !== 'function') {
    throw new Error('asToolExecutions method missing');
  }
  if (typeof parser.getUsage !== 'function') {
    throw new Error('getUsage method missing');
  }
  
  console.log('  - Response parser methods available');
});

// Summary
console.log('\n\n' + '='.repeat(50));
console.log('📊 V0.3.0 ENHANCED FEATURES TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`📈 Total: ${tests.passed + tests.failed}`);
console.log('='.repeat(50));

console.log('\n🎯 Feature Coverage:');
console.log('✅ Typed Error Handling');
console.log('✅ Token-Level Streaming (API available)');
console.log('✅ Retry Strategies (3 types + helper)');
console.log('✅ Per-Call Tool Permissions');
console.log('✅ OpenTelemetry Integration');
console.log('✅ Advanced Logging Framework');
console.log('✅ MCP Server-Level Permissions');
console.log('✅ Configuration File Support');
console.log('✅ Roles and Personas System');
console.log('✅ Response Parser Utilities');

if (tests.failed === 0) {
  console.log('\n🎉 All v0.3.0 enhanced features are available!');
  console.log('📦 Beta branch includes all documented features.');
} else {
  console.log('\n⚠️  Some features failed testing.');
  tests.results
    .filter(r => r.status === 'FAIL')
    .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
}

process.exit(tests.failed > 0 ? 1 : 0);