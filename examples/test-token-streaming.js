#!/usr/bin/env node

/**
 * Token Streaming Test
 * 
 * Test the token streaming functionality
 */

import { query, createTokenStream } from '../dist/index.mjs';

async function testTokenStreaming() {
  console.log('🧪 Testing Token Streaming\n');

  try {
    console.log('Creating query for token streaming...');
    
    // First, let's collect messages without token streaming to see the format
    console.log('\n1. First, checking message format:');
    for await (const message of query('Count from 1 to 5 slowly')) {
      console.log('Message type:', message.type);
      if (message.type === 'assistant' && message.content) {
        console.log('Content:', JSON.stringify(message.content, null, 2));
      }
    }
    
    console.log('\n2. Now testing token streaming:');
    // Create a new query for token streaming
    const messageGenerator = query('Write a short poem about coding (3 lines)', {
      temperature: 0.7
    });
    
    try {
      const tokenStream = createTokenStream(messageGenerator);
      console.log('Token stream created, starting to stream tokens...\n');
      
      const tokens = [];
      for await (const chunk of tokenStream.tokens()) {
        tokens.push(chunk.token);
        process.stdout.write(chunk.token);
      }
      
      const metrics = tokenStream.getMetrics();
      console.log('\n\n✅ Token streaming completed!');
      console.log('📊 Metrics:', metrics);
      console.log('Total tokens:', tokens.length);
    } catch (streamError) {
      console.error('❌ Token streaming error:', streamError);
      console.error('Error details:', {
        name: streamError.name,
        message: streamError.message,
        stack: streamError.stack?.split('\n').slice(0, 5)
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTokenStreaming().catch(console.error);