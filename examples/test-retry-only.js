#!/usr/bin/env node

/**
 * Test Retry Executor Only
 * 
 * Focus on testing just the retry functionality
 */

import { createRetryExecutor } from '../dist/index.mjs';

async function testRetryOnly() {
  console.log('🧪 Testing Retry Executor\n');

  const retryExecutor = createRetryExecutor({
    maxAttempts: 3,
    initialDelay: 500,
    multiplier: 2
  });
  
  console.log('Test 1: Successful retry after 2 failures');
  console.log('------------------------------------------');
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
    console.error('❌ Failed:', error.message);
  }
  
  console.log('\n');
  
  // Reset stats for next test
  retryExecutor.resetStats();
  
  console.log('Test 2: Failure after all attempts');
  console.log('-----------------------------------');
  try {
    let attemptCount = 0;
    const result = await retryExecutor.execute(async () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}...`);
      throw new Error('Service unavailable');
    }, {
      maxAttempts: 2,
      onRetry: (attempt, error, delay) => {
        console.log(`⏳ Retry ${attempt} after error: "${error.message}" (waiting ${delay}ms)`);
      }
    });
    
    console.log(`Result: ${result}`);
  } catch (error) {
    console.error('❌ Failed as expected:', error.message);
    console.log('📊 Stats:', retryExecutor.getStats());
  }
  
  console.log('\n');
  
  console.log('Test 3: Immediate success');
  console.log('-------------------------');
  retryExecutor.resetStats();
  
  try {
    const result = await retryExecutor.execute(async () => {
      console.log('Attempt 1...');
      return 'Immediate success!';
    });
    
    console.log(`✅ Result: ${result}`);
    console.log('📊 Stats:', retryExecutor.getStats());
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
  
  console.log('\n✨ All retry tests completed!');
}

testRetryOnly().catch(console.error);