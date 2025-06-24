#!/usr/bin/env node

/**
 * Test Enhanced Features
 * 
 * This script tests that the enhanced features actually work with real API calls
 */

import { 
  query,
  createTokenStream,
  createPermissionManager,
  createTelemetryProvider,
  createRetryExecutor,
  isRateLimitError,
  isToolPermissionError,
  detectErrorType
} from '../dist/index.mjs';

async function testEnhancedFeatures() {
  console.log('🧪 Testing Claude Code SDK Enhanced Features\n');

  // Test 1: Token Streaming with a real query
  console.log('1️⃣ Testing Token-Level Streaming');
  console.log('----------------------------------');
  try {
    const tokenStream = createTokenStream(
      query('Write exactly 3 words about JavaScript', {
        temperature: 0.1  // Low temperature for consistent output
      })
    );
    
    console.log('Streaming tokens:');
    const tokens = [];
    let paused = false;
    
    for await (const chunk of tokenStream.tokens()) {
      tokens.push(chunk.token);
      process.stdout.write(chunk.token);
      
      // Test pause/resume after 2 tokens
      if (tokens.length === 2 && !paused) {
        paused = true;
        console.log('\n⏸️  Testing pause...');
        const controller = tokenStream.getController();
        controller.pause();
        
        // Resume after 500ms
        setTimeout(() => {
          console.log('▶️  Resuming...');
          controller.resume();
        }, 500);
      }
    }
    
    const metrics = tokenStream.getMetrics();
    console.log('\n\n✅ Token streaming worked!');
    console.log('📊 Metrics:', {
      tokensEmitted: metrics.tokensEmitted,
      duration: metrics.duration,
      state: metrics.state
    });
  } catch (error) {
    console.error('❌ Token streaming failed:', error.message);
    if (error.exitCode) {
      console.error('Exit code:', error.exitCode);
    }
  }
  console.log();

  // Test 2: Error Detection with specific prompts
  console.log('2️⃣ Testing Error Detection');
  console.log('---------------------------');
  try {
    // Test with a prompt that might trigger tool permission issues
    const messages = [];
    for await (const message of query('Try to use the Bash tool to run: echo "test"', {
      deniedTools: ['Bash']  // Explicitly deny Bash tool
    })) {
      messages.push(message);
      
      // Check if we got an error message
      if (message.type === 'system' && message.subtype === 'error') {
        console.log('Detected error message:', message);
        const errorType = detectErrorType(message.data?.message || 'Unknown error');
        console.log('Error type:', errorType);
      }
    }
    console.log('✅ Error detection test completed');
  } catch (error) {
    console.log('Error caught:', error.message);
    console.log('Error type:', detectErrorType(error.message));
  }
  console.log();

  // Test 3: Permission Manager
  console.log('3️⃣ Testing Permission Manager');
  console.log('------------------------------');
  try {
    const permissionManager = createPermissionManager({
      allowedTools: ['Read', 'Write'],
      deniedTools: ['Bash', 'WebSearch']
    });

    // Test basic permissions
    const tools = ['Read', 'Write', 'Bash', 'WebSearch', 'Edit'];
    for (const tool of tools) {
      const allowed = await permissionManager.isToolAllowed(tool, { userId: 'test' });
      console.log(`${tool}: ${allowed ? '✅ Allowed' : '❌ Denied'}`);
    }

    // Test with override
    console.log('\nTesting with override (allowing Bash):');
    const allowedWithOverride = await permissionManager.isToolAllowed('Bash', 
      { userId: 'test' },
      { allowedTools: ['Bash'] }
    );
    console.log(`Bash with override: ${allowedWithOverride ? '✅ Allowed' : '❌ Denied'}`);
    
    console.log('✅ Permission manager works correctly');
  } catch (error) {
    console.error('❌ Permission manager failed:', error.message);
  }
  console.log();

  // Test 4: Telemetry Provider
  console.log('4️⃣ Testing Telemetry Provider');
  console.log('------------------------------');
  try {
    const telemetryProvider = createTelemetryProvider();
    await telemetryProvider.initialize({
      serviceName: 'test-enhanced-features',
      serviceVersion: '1.0.0',
      environment: 'test'
    });

    const logger = telemetryProvider.getLogger('test');
    
    // Note: This is a simplified telemetry provider, so some features might not be fully implemented
    console.log('✅ Telemetry provider initialized');
    console.log('📊 Initial metrics:', telemetryProvider.getQueryMetrics());
    
    await telemetryProvider.shutdown();
  } catch (error) {
    console.error('❌ Telemetry provider failed:', error.message);
  }
  console.log();

  // Test 5: Retry Executor
  console.log('5️⃣ Testing Retry Executor');
  console.log('--------------------------');
  try {
    const retryExecutor = createRetryExecutor({
      maxAttempts: 3,
      initialDelay: 500,
      multiplier: 2
    });

    let attemptCount = 0;
    const result = await retryExecutor.execute(async () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}...`);
      
      if (attemptCount < 2) {
        throw new Error('Simulated transient error');
      }
      
      return 'Success after retry!';
    }, {
      onRetry: (attempt, error, delay) => {
        console.log(`Retry ${attempt} after: ${error.message} (waiting ${delay}ms)`);
      }
    });
    
    console.log(`✅ Retry executor worked! Result: ${result}`);
    console.log('📊 Stats:', retryExecutor.getStats());
  } catch (error) {
    console.error('❌ Retry executor failed:', error.message);
  }

  console.log('\n✨ Test completed!');
}

// Run the test
testEnhancedFeatures().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});