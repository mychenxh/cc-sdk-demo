#!/usr/bin/env node

/**
 * Basic Query Test
 * 
 * Simple test to verify the SDK can make basic queries
 */

import { query } from '../dist/index.mjs';

async function testBasicQuery() {
  console.log('🧪 Testing Basic Query\n');

  try {
    console.log('Making a simple query...');
    const messages = [];
    
    for await (const message of query('Say "Hello SDK!" and nothing else', {
      debug: true  // Enable debug output
    })) {
      console.log('Received message:', message.type);
      messages.push(message);
      
      if (message.type === 'assistant') {
        console.log('Assistant says:', message.content);
      }
    }
    
    console.log(`\n✅ Query completed! Received ${messages.length} messages`);
  } catch (error) {
    console.error('❌ Query failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      exitCode: error.exitCode,
      signal: error.signal
    });
  }
}

testBasicQuery().catch(console.error);