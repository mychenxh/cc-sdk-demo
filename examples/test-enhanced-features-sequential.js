#!/usr/bin/env node

/**
 * Test Enhanced Features - Sequential Version
 * 
 * This script tests the enhanced features one by one
 */

import { 
  query,
  createTokenStream,
  createPermissionManager,
  createTelemetryProvider,
  createRetryExecutor,
  detectErrorType
} from '../dist/index.mjs';

async function testEnhancedFeatures() {
  console.log('🧪 Testing Claude Code SDK Enhanced Features\n');

  // Test 1: Token Streaming
  console.log('1️⃣ Testing Token-Level Streaming');
  console.log('----------------------------------');
  try {
    const tokenStream = createTokenStream(
      query('Count: 1 2 3')
    );
    
    console.log('Streaming tokens:');
    const tokens = [];
    
    for await (const chunk of tokenStream.tokens()) {
      tokens.push(chunk.token);
      process.stdout.write(chunk.token);
      
      // Test pause/resume after 5 tokens
      if (tokens.length === 5) {
        console.log('\n⏸️  Testing pause...');
        const controller = tokenStream.getController();
        controller.pause();
        
        // Resume after 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('▶️  Resuming...');
        controller.resume();
      }
    }
    
    const metrics = tokenStream.getMetrics();
    console.log('\n\n✅ Token streaming worked!');
    console.log('📊 Metrics:', {
      tokensEmitted: metrics.tokensEmitted,
      duration: metrics.duration,
      state: metrics.state,
      tokensPerSecond: metrics.averageTokensPerSecond
    });
  } catch (error) {
    console.error('❌ Token streaming failed:', error.message);
  }
  
  // Wait a bit before next test
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log();

  // Test 2: Permission Manager (no API calls needed)
  console.log('2️⃣ Testing Permission Manager');
  console.log('------------------------------');
  try {
    const permissionManager = createPermissionManager({
      allowedTools: ['Read', 'Write'],
      deniedTools: ['Bash']
    });

    const tools = ['Read', 'Write', 'Bash', 'WebSearch'];
    for (const tool of tools) {
      const allowed = await permissionManager.isToolAllowed(tool, { userId: 'test' });
      console.log(`${tool}: ${allowed ? '✅ Allowed' : '❌ Denied'}`);
    }

    // Test dynamic permission
    console.log('\nTesting dynamic permission:');
    const timeBasedOverride = {
      dynamicPermissions: {
        Write: async (ctx) => {
          const hour = new Date().getHours();
          return (hour >= 9 && hour < 17) ? 'allow' : 'deny';
        }
      }
    };

    const isWriteAllowed = await permissionManager.isToolAllowed(
      'Write',
      { userId: 'user123' },
      timeBasedOverride
    );
    console.log(`Write (business hours): ${isWriteAllowed ? '✅ Allowed' : '❌ Denied'}`);
    console.log('✅ Permission manager works!');
  } catch (error) {
    console.error('❌ Permission manager failed:', error.message);
  }
  console.log();

  // Test 3: Error Detection
  console.log('3️⃣ Testing Error Detection');
  console.log('---------------------------');
  try {
    const testMessages = [
      'Rate limit exceeded',
      'Tool permission denied: Bash',
      'Authentication failed',
      'Request timeout',
      'Invalid request'
    ];

    for (const msg of testMessages) {
      const errorType = detectErrorType(msg);
      console.log(`"${msg}" → ${errorType}`);
    }
    console.log('✅ Error detection works!');
  } catch (error) {
    console.error('❌ Error detection failed:', error.message);
  }
  console.log();

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
    console.log('✅ Telemetry provider initialized!');
    console.log('(Note: This is a simplified stub implementation)');
  } catch (error) {
    console.error('❌ Telemetry provider failed:', error.message);
  }
  console.log();

  // Test 5: Retry Executor
  console.log('5️⃣ Testing Retry Executor');
  console.log('--------------------------');
  const retryExecutor = createRetryExecutor({
    maxAttempts: 3,
    initialDelay: 500,
    multiplier: 2
  });
  
  try {
    let attemptCount = 0;
    const result = await retryExecutor.execute(async () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}...`);
      
      if (attemptCount < 3) {
        throw new Error('Request timeout - please try again');
      }
      
      return 'Success on third attempt!';
    }, {
      onRetry: (attempt, error, delay) => {
        console.log(`⏳ Retry ${attempt} after error: "${error.message}" (waiting ${delay}ms)`);
      }
    });
    
    console.log(`✅ Result: ${result}`);
    console.log('📊 Stats:', retryExecutor.getStats());
  } catch (error) {
    console.error('❌ Retry executor failed after all attempts:', error.message);
    const stats = retryExecutor.getStats();
    console.error('📊 Final stats:', stats);
  }

  console.log('\n✨ All tests completed!');
}

// Run the test
testEnhancedFeatures().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});