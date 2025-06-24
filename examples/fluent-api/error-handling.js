import { claude, ConsoleLogger, LogLevel } from '@instantlyeasy/claude-code-sdk-ts';

/**
 * Error Handling Example using Fluent API
 * 
 * This example demonstrates various error handling patterns with the SDK,
 * including graceful degradation, retry logic, and debugging strategies.
 * 
 * Prerequisites:
 * - npm install @instantlyeasy/claude-code-sdk-ts
 * - Claude Code CLI installed and configured
 */

async function errorHandlingExamples() {
  // 1. Basic error handling with try-catch
  console.log('1. Basic Error Handling');
  console.log('-----------------------\n');
  
  try {
    const result = await claude()
      .withTimeout(5000) // Short timeout for demonstration
      .query('Write a very long detailed essay about quantum computing')
      .asText();
    
    console.log('Success:', result.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.exitCode) {
      console.error('   Exit code:', error.exitCode);
    }
  }

  // 2. Handling specific error types
  console.log('\n\n2. Handling Specific Error Types');
  console.log('--------------------------------\n');
  
  try {
    const result = await claude()
      .withModel('invalid-model-xyz') // Invalid model name
      .query('Test query')
      .asText();
  } catch (error) {
    // Check error type and handle accordingly
    if (error.name === 'CLINotFoundError') {
      console.error('❌ Claude CLI not found. Please install it first.');
    } else if (error.name === 'ProcessError') {
      console.error('❌ Process error:', error.message);
      console.error('   This might be due to invalid model name or configuration.');
    } else if (error.name === 'ValidationError') {
      console.error('❌ Validation error:', error.message);
    } else {
      console.error('❌ Unexpected error:', error.name, '-', error.message);
    }
  }

  // 3. Graceful degradation with fallback models
  console.log('\n\n3. Graceful Degradation');
  console.log('-----------------------\n');
  
  async function queryWithFallback(prompt, preferredModel = 'opus') {
    const models = [preferredModel, 'sonnet', 'opus'];
    let lastError;
    
    for (const model of models) {
      try {
        console.log(`Trying with ${model} model...`);
        
        return await claude()
          .withModel(model)
          .withTimeout(15000)
          .query(prompt)
          .asText();
          
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  ${model} failed: ${error.message}`);
        if (model !== models[models.length - 1]) {
          console.log('   Trying next model...');
        }
      }
    }
    
    throw lastError; // All models failed
  }
  
  try {
    const result = await queryWithFallback('What is 2+2?', 'opus');
    console.log('✅ Success with fallback:', result);
  } catch (error) {
    console.error('❌ All models failed:', error.message);
  }

  // 4. Retry logic with exponential backoff
  console.log('\n\n4. Retry with Exponential Backoff');
  console.log('---------------------------------\n');
  
  async function queryWithRetry(prompt, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}...`);
        
        return await claude()
          .withModel('sonnet')
          .query(prompt)
          .asText();
          
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  try {
    const result = await queryWithRetry('Say hello!');
    console.log('✅ Success after retry:', result);
  } catch (error) {
    console.error('❌ Failed after all retries:', error.message);
  }

  // 5. Handling streaming errors
  console.log('\n\n5. Streaming Error Handling');
  console.log('---------------------------\n');
  
  try {
    let messageCount = 0;
    let errorOccurred = false;
    
    await claude()
      .withModel('sonnet')
      .onMessage(msg => {
        messageCount++;
        if (msg.type === 'error' || (msg.type === 'system' && msg.subtype === 'error')) {
          errorOccurred = true;
          console.error('❌ Stream error detected:', msg);
        }
      })
      .query('Count from 1 to 3')
      .stream(async (message) => {
        if (message.type === 'assistant') {
          process.stdout.write('.');
        }
      });
    
    console.log(`\n✅ Streaming completed. Messages: ${messageCount}, Errors: ${errorOccurred ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('❌ Stream processing error:', error.message);
  }

  // 6. Tool permission errors
  console.log('\n\n6. Tool Permission Error Handling');
  console.log('---------------------------------\n');
  
  try {
    // Attempt to use denied tools
    const result = await claude()
      .allowTools('Read')
      .denyTools('Write', 'Edit', 'Bash')
      .onToolUse(tool => {
        console.log(`🔧 Tool requested: ${tool.name}`);
      })
      .query('Create a new file called test.txt with the content "Hello World"')
      .asText();
    
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Tool permission error:', error.message);
  }

  // 7. Timeout and cancellation
  console.log('\n\n7. Timeout and Cancellation');
  console.log('---------------------------\n');
  
  // Simulate a timeout scenario
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Custom timeout')), 2000);
  });
  
  try {
    const result = await Promise.race([
      claude()
        .withTimeout(10000)
        .query('Write a haiku')
        .asText(),
      timeoutPromise
    ]);
    
    console.log('✅ Query completed:', result);
  } catch (error) {
    if (error.message === 'Custom timeout') {
      console.error('❌ Query cancelled due to custom timeout');
    } else {
      console.error('❌ Query error:', error.message);
    }
  }

  // 8. Debug mode with custom logger
  console.log('\n\n8. Debug Mode with Custom Logger');
  console.log('--------------------------------\n');
  
  // Create a custom logger for debugging
  const debugLogger = new ConsoleLogger(LogLevel.DEBUG, '[DEBUG]');
  
  try {
    const result = await claude()
      .debug(true)
      .withLogger(debugLogger)
      .withModel('sonnet')
      .query('Say "Debug mode active"')
      .asText();
    
    console.log('✅ Debug query result:', result);
  } catch (error) {
    console.error('❌ Debug query failed:', error.message);
    console.error('Stack trace:', error.stack);
  }

  // 9. Error recovery strategies
  console.log('\n\n9. Error Recovery Strategies');
  console.log('----------------------------\n');
  
  class QueryManager {
    constructor() {
      this.failureCount = 0;
      this.lastFailureTime = null;
    }
    
    async executeWithRecovery(prompt) {
      try {
        const result = await claude()
          .withModel('sonnet')
          .query(prompt)
          .asText();
        
        // Reset failure count on success
        this.failureCount = 0;
        return result;
        
      } catch (error) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        // Different strategies based on failure count
        if (this.failureCount === 1) {
          console.log('⚠️  First failure, retrying immediately...');
          return this.executeWithRecovery(prompt);
        } else if (this.failureCount === 2) {
          console.log('⚠️  Second failure, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.executeWithRecovery(prompt);
        } else {
          console.error('❌ Multiple failures, giving up');
          throw error;
        }
      }
    }
  }
  
  const manager = new QueryManager();
  try {
    const result = await manager.executeWithRecovery('Say "Recovery successful"');
    console.log('✅ Recovery result:', result);
  } catch (error) {
    console.error('❌ Recovery failed:', error.message);
  }

  console.log('\n✨ Error handling examples completed!');
}

// Run all examples with top-level error boundary
errorHandlingExamples().catch(error => {
  console.error('\n💥 Unhandled error:', error);
  console.error('This should not happen in production - always handle errors!');
  process.exit(1);
});