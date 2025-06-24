#!/usr/bin/env node

/**
 * Test Token Streaming Error Handling
 * 
 * Test what happens when token streaming encounters an error
 */

import { 
  query,
  createTokenStream,
  detectErrorType,
  ProcessError
} from '../dist/index.mjs';

async function testStreamingError() {
  console.log('🧪 Testing Token Streaming Error Handling\n');

  console.log('Attempting to create token stream...');
  
  try {
    // Create a token stream
    const tokenStream = createTokenStream(
      query('Count from 1 to 5')
    );
    
    console.log('Starting token stream...\n');
    
    const tokens = [];
    for await (const chunk of tokenStream.tokens()) {
      tokens.push(chunk.token);
      process.stdout.write(chunk.token);
    }
    
    console.log(`\n\n✅ Successfully streamed ${tokens.length} tokens`);
    console.log('📊 Metrics:', tokenStream.getMetrics());
    
  } catch (error) {
    console.error('\n❌ Token streaming failed!');
    console.error('Error:', error.message);
    console.error('Error name:', error.name);
    console.error('Error type:', error.constructor.name);
    
    // Check if it's a ProcessError
    if (error instanceof ProcessError) {
      console.error('Exit code:', error.exitCode);
      console.error('Signal:', error.signal);
    }
    
    // Try to detect error type
    const errorType = detectErrorType(error.message);
    console.error('Detected error type:', errorType);
    
    // Check the stack trace
    console.error('\nStack trace (first 5 lines):');
    console.error(error.stack?.split('\n').slice(0, 5).join('\n'));
    
    // Additional debugging
    if (error.message.includes('CLI exited with code')) {
      console.error('\n💡 This suggests the Claude CLI process failed.');
      console.error('Possible causes:');
      console.error('- CLI not properly authenticated');
      console.error('- Network connectivity issues');
      console.error('- Invalid request format');
      console.error('- CLI version incompatibility');
    }
  }
  
  console.log('\n✨ Test completed!');
}

testStreamingError().catch(console.error);