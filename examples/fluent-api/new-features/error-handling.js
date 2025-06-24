#!/usr/bin/env node

/**
 * Advanced Error Handling Example
 * 
 * This example demonstrates the SDK's typed error handling system,
 * showing how to catch and handle specific error types gracefully.
 * 
 * Use cases:
 * - Implementing retry logic for rate limits
 * - Handling permission errors with user prompts
 * - Building robust error recovery systems
 */

import { 
  claude,
  detectErrorType,
  createTypedError,
  isRateLimitError,
  isToolPermissionError,
  isAuthenticationError,
  isNetworkError,
  isTimeoutError,
  isValidationError
} from '@instantlyeasy/claude-code-sdk-ts';

async function errorHandlingExample() {
  console.log('🛡️ Advanced Error Handling Example\n');

  // Example 1: Handling specific error types
  console.log('1. Handling Specific Error Types');
  console.log('--------------------------------\n');
  
  // Test different error scenarios
  const errorScenarios = [
    {
      name: 'Tool Permission Error',
      setup: () => claude().denyTools('Bash'),
      prompt: 'Run the command: ls -la'
    },
    {
      name: 'Model Validation Error',
      setup: () => claude().withModel('invalid-model'),
      prompt: 'Hello'
    }
  ];
  
  for (const scenario of errorScenarios) {
    console.log(`Testing ${scenario.name}:`);
    try {
      await scenario.setup()
        .query(scenario.prompt)
        .asText();
      console.log('✅ No error occurred');
    } catch (error) {
      const errorType = detectErrorType(error.message);
      console.log(`❌ Caught error type: ${errorType}`);
      console.log(`   Message: ${error.message}`);
      
      // Type-specific handling
      if (error.message.includes('denied') || error.message.includes('permission')) {
        console.log('   → This looks like a permission issue');
      } else if (error.message.includes('model')) {
        console.log('   → This looks like a model configuration issue');
      }
    }
    console.log();
  }

  // Example 2: Simulating error types
  console.log('\n2. Simulating Different Error Types');
  console.log('-----------------------------------\n');
  
  // Create typed errors for demonstration
  const simulatedErrors = [
    createTypedError('rate_limit_error', 'Too many requests', { retryAfter: 30 }),
    createTypedError('tool_permission_error', 'Bash tool denied', { tool: 'Bash' }),
    createTypedError('authentication_error', 'Authentication failed - run: claude login'),
    createTypedError('network_error', 'Connection timeout'),
    createTypedError('timeout_error', 'Query timeout', { timeout: 5000 }),
    createTypedError('validation_error', 'Invalid model name', { field: 'model' })
  ];
  
  for (const error of simulatedErrors) {
    console.log(`${error.constructor.name}:`);
    console.log(`  Message: ${error.message}`);
    console.log(`  Type detection: ${detectErrorType(error.message)}`);
    
    // Show error-specific properties
    if (isRateLimitError(error)) {
      console.log(`  Retry after: ${error.retryAfter}s`);
    } else if (isToolPermissionError(error)) {
      console.log(`  Tool: ${error.tool}`);
    } else if (isTimeoutError(error)) {
      console.log(`  Timeout: ${error.timeout}ms`);
    } else if (isValidationError(error)) {
      console.log(`  Field: ${error.field}`);
    }
    console.log();
  }

  // Example 3: Retry logic demonstration
  console.log('\n3. Retry Logic for Transient Errors');
  console.log('-----------------------------------\n');
  
  async function queryWithRetry(prompt, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}...`);
        
        // Simulate occasional failures
        if (attempt < 2 && Math.random() < 0.7) {
          throw createTypedError('network_error', 'Simulated network error');
        }
        
        return await claude()
          .withModel('sonnet')
          .withTimeout(10000)
          .query(prompt)
          .asText();
          
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          if (isRateLimitError(error)) {
            const waitTime = error.retryAfter || Math.pow(2, attempt);
            console.log(`⏳ Rate limited. Waiting ${waitTime}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          } else if (isNetworkError(error)) {
            const waitTime = Math.pow(2, attempt - 1);
            console.log(`⏳ Network error. Waiting ${waitTime}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          } else {
            // Non-retryable error
            throw error;
          }
        }
      }
    }
    
    throw lastError;
  }
  
  try {
    const result = await queryWithRetry('Say "Hello from retry logic!"');
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Failed after all retries:', error.message);
  }

  // Example 4: Graceful degradation
  console.log('\n\n4. Graceful Degradation');
  console.log('-----------------------\n');
  
  async function queryWithFallback(prompt) {
    const strategies = [
      { name: 'Primary', model: 'opus', timeout: 5000 },
      { name: 'Secondary', model: 'sonnet', timeout: 10000 },
      { name: 'Fallback', model: 'sonnet', timeout: 15000 }
    ];
    
    for (const strategy of strategies) {
      try {
        console.log(`Trying ${strategy.name} strategy (${strategy.model})...`);
        
        return await claude()
          .withModel(strategy.model)
          .withTimeout(strategy.timeout)
          .query(prompt)
          .asText();
          
      } catch (error) {
        console.warn(`⚠️  ${strategy.name} failed: ${error.message}`);
        
        if (strategy === strategies[strategies.length - 1]) {
          throw error; // Last strategy failed
        }
      }
    }
  }
  
  try {
    const result = await queryWithFallback('What is 2+2?');
    console.log('✅ Success with fallback:', result);
  } catch (error) {
    console.error('❌ All strategies failed:', error.message);
  }

  // Example 5: Error recovery patterns
  console.log('\n\n5. Error Recovery Patterns');
  console.log('--------------------------\n');
  
  class ErrorRecovery {
    static async withCircuitBreaker(fn, options = {}) {
      const { threshold = 3, resetTime = 30000 } = options;
      const state = { failures: 0, lastFailure: null, isOpen: false };
      
      return async (...args) => {
        // Check if circuit is open
        if (state.isOpen) {
          const timeSinceFailure = Date.now() - state.lastFailure;
          if (timeSinceFailure < resetTime) {
            throw new Error('Circuit breaker is OPEN');
          }
          // Try to close circuit
          state.isOpen = false;
          console.log('🔄 Circuit breaker: Attempting to close...');
        }
        
        try {
          const result = await fn(...args);
          // Success - reset failure count
          if (state.failures > 0) {
            console.log('✅ Circuit breaker: Reset after success');
            state.failures = 0;
          }
          return result;
        } catch (error) {
          state.failures++;
          state.lastFailure = Date.now();
          
          if (state.failures >= threshold) {
            state.isOpen = true;
            console.log(`🚫 Circuit breaker: OPEN after ${state.failures} failures`);
          }
          
          throw error;
        }
      };
    }
    
    static async withTimeout(fn, timeout) {
      return Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
      ]);
    }
    
    static async withFallbackValue(fn, fallbackValue) {
      try {
        return await fn();
      } catch (error) {
        console.log(`⚠️  Using fallback value due to: ${error.message}`);
        return fallbackValue;
      }
    }
  }
  
  // Test circuit breaker
  const protectedQuery = ErrorRecovery.withCircuitBreaker(
    async (prompt) => {
      // Simulate some failures
      if (Math.random() < 0.4) {
        throw new Error('Simulated service error');
      }
      return `Response: ${prompt}`;
    },
    { threshold: 2, resetTime: 5000 }
  );
  
  console.log('Testing circuit breaker:');
  for (let i = 0; i < 5; i++) {
    try {
      const result = await protectedQuery('Test query');
      console.log(`  Attempt ${i + 1}: ${result}`);
    } catch (error) {
      console.log(`  Attempt ${i + 1}: ❌ ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Example 6: Error context and logging
  console.log('\n\n6. Error Context and Logging');
  console.log('----------------------------\n');
  
  class ErrorLogger {
    static log(error, context = {}) {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        type: detectErrorType(error.message),
        message: error.message,
        context,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      };
      
      console.log('📋 Error Log Entry:');
      console.log(JSON.stringify(errorInfo, null, 2));
      
      // Return user-friendly message
      const userMessages = {
        authentication_error: 'Authentication required. Please run: claude login',
        rate_limit_error: 'Too many requests. Please try again later.',
        network_error: 'Connection issue. Please check your internet.',
        tool_permission_error: 'This operation requires additional permissions.',
        timeout_error: 'The operation took too long. Please try again.',
        validation_error: 'Invalid input. Please check your parameters.',
        api_error: 'Something went wrong. Please try again.'
      };
      
      return userMessages[errorInfo.type] || userMessages.api_error;
    }
  }
  
  // Test error logging
  const testError = createTypedError('authentication_error', 'Authentication failed');
  const userMessage = ErrorLogger.log(testError, {
    userId: 'user123',
    action: 'query',
    model: 'opus'
  });
  console.log('\n👤 User-friendly message:', userMessage);

  console.log('\n✨ Error handling examples completed!');
}

// Error handling wrapper with final fallback
errorHandlingExample().catch(error => {
  console.error('\n💥 Unhandled error in example:', error);
  console.error('This is the final error boundary.');
  process.exit(1);
});