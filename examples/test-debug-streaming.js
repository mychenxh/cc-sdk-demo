#!/usr/bin/env node

/**
 * Debug Token Streaming
 * 
 * Simple test to understand the streaming issue
 */

import { query, createTokenStream } from '../dist/index.mjs';

async function debugStreaming() {
  console.log('🔍 Debug Token Streaming\n');

  // First, let's make sure basic queries work
  console.log('1. Testing basic query (no streaming):');
  try {
    const messages = [];
    for await (const message of query('Say exactly: "Hello World"')) {
      console.log(`  Message type: ${message.type}`);
      if (message.type === 'assistant') {
        console.log('  Assistant content:', JSON.stringify(message.content));
      }
      messages.push(message);
    }
    console.log(`✅ Basic query worked! Got ${messages.length} messages\n`);
  } catch (error) {
    console.error('❌ Basic query failed:', error.message);
    return;
  }

  // Now test streaming with debug enabled
  console.log('2. Testing token streaming with debug:');
  try {
    // Create a fresh query for streaming
    const streamQuery = query('Count slowly: one two three', {
      debug: true  // Enable debug output
    });
    
    const tokenStream = createTokenStream(streamQuery);
    console.log('Token stream created...');
    
    const tokens = [];
    console.log('Starting to iterate tokens...');
    
    for await (const chunk of tokenStream.tokens()) {
      console.log(`  Got token: "${chunk.token}"`);
      tokens.push(chunk.token);
    }
    
    console.log(`\n✅ Streaming worked! Got ${tokens.length} tokens`);
    console.log('Full text:', tokens.join(''));
  } catch (error) {
    console.error('\n❌ Streaming failed!');
    console.error('Error type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Exit code:', error.exitCode);
    console.error('Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

debugStreaming().catch(console.error);