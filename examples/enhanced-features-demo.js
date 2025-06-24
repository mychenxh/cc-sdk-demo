#!/usr/bin/env node

/**
 * Enhanced Features Demo
 * 
 * This example demonstrates the new enhanced features added to Claude Code SDK:
 * 1. Typed error handling
 * 2. Token-level streaming
 * 3. Per-call tool permissions
 * 4. OpenTelemetry integration
 * 5. Exponential backoff
 */

import { 
  query,
  createTokenStream,
  createPermissionManager,
  createTelemetryProvider,
  createRetryExecutor,
  isRateLimitError,
  isToolPermissionError
} from '../dist/index.mjs';

async function runDemo() {
  console.log('🚀 Claude Code SDK Enhanced Features Demo\n');

  // 1. Typed Error Handling Demo
  console.log('1️⃣ Typed Error Handling');
  console.log('------------------------');
  try {
    // Simulate an error scenario
    const messages = [];
    for await (const message of query('Simulate a rate limit error')) {
      messages.push(message);
      if (message.type === 'error') {
        throw new Error('Rate limit exceeded: too many requests');
      }
    }
  } catch (error) {
    if (isRateLimitError(error)) {
      console.log(`❌ Rate limited! Retry after ${error.retryAfter} seconds`);
    } else if (isToolPermissionError(error)) {
      console.log(`❌ Tool permission denied: ${error.tool}`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  console.log();

  // 2. Token Streaming Demo
  console.log('2️⃣ Token-Level Streaming');
  console.log('------------------------');
  const messageGenerator = query('Write a haiku about programming');
  const tokenStream = createTokenStream(messageGenerator);
  
  console.log('Streaming tokens in real-time:');
  let tokenCount = 0;
  for await (const chunk of tokenStream.tokens()) {
    process.stdout.write(chunk.token);
    tokenCount++;
    
    // Demonstrate pause/resume
    if (tokenCount === 10) {
      console.log('\n⏸️  Pausing stream...');
      tokenStream.getController().pause();
      setTimeout(() => {
        console.log('▶️  Resuming stream...');
        tokenStream.getController().resume();
      }, 1000);
    }
  }
  
  console.log(`\n\n📊 Stream metrics:`, tokenStream.getMetrics());
  console.log();

  // 3. Per-Call Permissions Demo
  console.log('3️⃣ Per-Call Tool Permissions');
  console.log('-----------------------------');
  const permissionManager = createPermissionManager({
    allowedTools: ['Read', 'Write'],
    deniedTools: ['Bash']
  });

  // Check permissions with different contexts
  const contexts = [
    { userId: 'admin', role: 'admin' },
    { userId: 'user123', role: 'user' }
  ];

  for (const context of contexts) {
    console.log(`\nChecking permissions for ${context.role}:`);
    const isReadAllowed = await permissionManager.isToolAllowed('Read', context);
    const isBashAllowed = await permissionManager.isToolAllowed('Bash', context);
    console.log(`- Read: ${isReadAllowed ? '✅ Allowed' : '❌ Denied'}`);
    console.log(`- Bash: ${isBashAllowed ? '✅ Allowed' : '❌ Denied'}`);
  }

  // Dynamic permission based on time
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
  console.log(`\n⏰ Write permission (business hours only): ${isWriteAllowed ? '✅ Allowed' : '❌ Denied'}`);
  console.log();

  // 4. OpenTelemetry Integration Demo
  console.log('4️⃣ OpenTelemetry Integration');
  console.log('-----------------------------');
  const telemetryProvider = createTelemetryProvider();
  await telemetryProvider.initialize({
    serviceName: 'claude-sdk-demo',
    serviceVersion: '1.0.0',
    environment: 'demo'
  });

  const logger = telemetryProvider.getLogger('demo');
  const span = logger.startSpan('demo-query', {
    attributes: {
      'demo.feature': 'telemetry',
      'demo.user': 'test-user'
    }
  });

  try {
    span.addEvent('query-start');
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    span.setAttribute('demo.result', 'success');
    span.setStatus('ok');
  } catch (error) {
    span.recordException(error);
  } finally {
    span.end();
  }

  logger.recordMetric('demo_queries_total', 1, { feature: 'telemetry' });
  console.log('📈 Telemetry span created and metrics recorded');
  console.log(`📊 Query metrics:`, telemetryProvider.getQueryMetrics());
  await telemetryProvider.shutdown();
  console.log();

  // 5. Exponential Backoff Demo
  console.log('5️⃣ Exponential Backoff & Retry');
  console.log('--------------------------------');
  const retryExecutor = createRetryExecutor({
    maxAttempts: 3,
    initialDelay: 1000,
    multiplier: 2,
    jitter: true
  });

  let attemptCount = 0;
  try {
    const result = await retryExecutor.execute(async () => {
      attemptCount++;
      console.log(`🔄 Attempt ${attemptCount}...`);
      
      if (attemptCount < 3) {
        throw new Error('Temporary network error');
      }
      
      return 'Success!';
    }, {
      onRetry: (attempt, error, nextDelay) => {
        console.log(`⚠️  Retry ${attempt} after error: ${error.message}`);
        console.log(`⏱️  Waiting ${nextDelay}ms before next attempt...`);
      }
    });
    
    console.log(`✅ Result: ${result}`);
  } catch (error) {
    console.log(`❌ Failed after retries: ${error.message}`);
  }

  const stats = retryExecutor.getStats();
  console.log(`\n📊 Retry statistics:`, stats);
  
  console.log('\n✨ Demo completed!');
}

// Run the demo
runDemo().catch(console.error);