#!/usr/bin/env node

/**
 * Test Typed Errors
 * 
 * Verify that typed error handling works correctly
 */

import { 
  query,
  detectErrorType,
  createTypedError,
  isRateLimitError,
  isToolPermissionError,
  isAuthenticationError,
  isNetworkError,
  isTimeoutError,
  isValidationError,
  RateLimitError,
  ToolPermissionError,
  AuthenticationError,
  NetworkError,
  TimeoutError,
  ValidationError,
  APIError
} from '../dist/index.mjs';

async function testTypedErrors() {
  console.log('🧪 Testing Typed Error Handling\n');

  // Test 1: Error Detection
  console.log('1️⃣ Testing Error Type Detection');
  console.log('--------------------------------');
  
  const errorMessages = [
    { msg: 'Rate limit exceeded', expected: 'rate_limit_error' },
    { msg: 'You have exceeded your rate limit', expected: 'rate_limit_error' },
    { msg: 'Too many requests', expected: 'rate_limit_error' },
    { msg: 'Tool permission denied: Bash', expected: 'tool_permission_error' },
    { msg: 'Permission denied for tool WebSearch', expected: 'tool_permission_error' },
    { msg: 'Authentication failed', expected: 'authentication_error' },
    { msg: 'Invalid API key', expected: 'authentication_error' },
    { msg: 'Unauthorized', expected: 'authentication_error' },
    { msg: 'Network error', expected: 'network_error' },
    { msg: 'Connection refused', expected: 'network_error' },
    { msg: 'Request timeout', expected: 'timeout_error' },
    { msg: 'Operation timed out', expected: 'timeout_error' },
    { msg: 'Invalid request', expected: 'validation_error' },
    { msg: 'Validation failed', expected: 'validation_error' },
    { msg: 'Unknown error occurred', expected: 'api_error' }
  ];

  for (const { msg, expected } of errorMessages) {
    const detected = detectErrorType(msg);
    const match = detected === expected ? '✅' : '❌';
    console.log(`${match} "${msg}" → ${detected} (expected: ${expected})`);
  }
  console.log();

  // Test 2: Error Creation
  console.log('2️⃣ Testing Error Creation');
  console.log('-------------------------');
  
  const errors = [
    createTypedError('rate_limit_error', 'Rate limit test', { retryAfter: 60 }),
    createTypedError('tool_permission_error', 'Tool permission test', { tool: 'Bash' }),
    createTypedError('authentication_error', 'Auth test'),
    createTypedError('network_error', 'Network test'),
    createTypedError('timeout_error', 'Timeout test', { timeout: 5000 }),
    createTypedError('validation_error', 'Validation test', { field: 'prompt' }),
    createTypedError('api_error', 'Generic API test')
  ];

  for (const error of errors) {
    console.log(`Created ${error.constructor.name}: ${error.message}`);
    if (error instanceof RateLimitError) {
      console.log(`  - Retry after: ${error.retryAfter}s`);
    }
    if (error instanceof ToolPermissionError) {
      console.log(`  - Tool: ${error.tool}`);
    }
    if (error instanceof TimeoutError) {
      console.log(`  - Timeout: ${error.timeout}ms`);
    }
  }
  console.log();

  // Test 3: Type Guards
  console.log('3️⃣ Testing Type Guards');
  console.log('-----------------------');
  
  const testError = createTypedError('rate_limit_error', 'Test rate limit', { retryAfter: 30 });
  
  console.log('Testing error:', testError.message);
  console.log(`isRateLimitError: ${isRateLimitError(testError) ? '✅' : '❌'} ${isRateLimitError(testError)}`);
  console.log(`isToolPermissionError: ${!isToolPermissionError(testError) ? '✅' : '❌'} ${isToolPermissionError(testError)}`);
  console.log(`isAuthenticationError: ${!isAuthenticationError(testError) ? '✅' : '❌'} ${isAuthenticationError(testError)}`);
  console.log(`isNetworkError: ${!isNetworkError(testError) ? '✅' : '❌'} ${isNetworkError(testError)}`);
  console.log(`isTimeoutError: ${!isTimeoutError(testError) ? '✅' : '❌'} ${isTimeoutError(testError)}`);
  console.log(`isValidationError: ${!isValidationError(testError) ? '✅' : '❌'} ${isValidationError(testError)}`);
  console.log();

  // Test 4: Error Handling in Real Query
  console.log('4️⃣ Testing Error Handling in Query');
  console.log('-----------------------------------');
  
  try {
    // Try to use a denied tool to trigger an error
    console.log('Attempting to use denied tool...');
    for await (const message of query('Use the Bash tool to run: echo test', {
      deniedTools: ['Bash']
    })) {
      if (message.type === 'system' && message.subtype === 'error') {
        console.log('Received error message:', message);
      }
      if (message.type === 'assistant') {
        const text = message.content?.find(block => block.type === 'text')?.text;
        console.log('Assistant says:', text);
      }
    }
  } catch (error) {
    console.log('Caught error:', error.message);
    const errorType = detectErrorType(error.message);
    console.log('Detected type:', errorType);
    
    // Check with type guards
    if (isToolPermissionError(error)) {
      console.log('✅ Correctly identified as ToolPermissionError');
    } else {
      console.log('❌ Not identified as ToolPermissionError');
    }
  }
  console.log();

  // Test 5: Error Instances
  console.log('5️⃣ Testing Error Instance Checks');
  console.log('---------------------------------');
  
  const errorInstances = [
    new RateLimitError('Rate limit', 60),
    new ToolPermissionError('Tool denied', 'Bash'),
    new AuthenticationError('Invalid key'),
    new NetworkError('Connection failed'),
    new TimeoutError('Timed out', 5000),
    new ValidationError('Invalid input', 'prompt'),
    new APIError('Generic error', 500)
  ];

  for (const err of errorInstances) {
    console.log(`${err.constructor.name}:`);
    console.log(`  instanceof Error: ${err instanceof Error ? '✅' : '❌'}`);
    console.log(`  instanceof APIError: ${err instanceof APIError ? '✅' : '❌'}`);
    console.log(`  Has stack trace: ${err.stack ? '✅' : '❌'}`);
  }

  console.log('\n✨ Typed error tests completed!');
}

testTypedErrors().catch(console.error);