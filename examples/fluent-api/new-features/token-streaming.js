#!/usr/bin/env node

/**
 * Token Streaming Example
 * 
 * This example demonstrates how to use the SDK's token streaming feature
 * to receive Claude's responses in real-time, token by token.
 * 
 * Use cases:
 * - Building responsive chat interfaces
 * - Displaying progress for long-running generations
 * - Implementing typewriter effects in UIs
 */

import { claude, createTokenStream } from '@instantlyeasy/claude-code-sdk-ts';

async function tokenStreamingExample() {
  console.log('📝 Token Streaming Example\n');

  // Example 1: Basic token streaming
  console.log('1. Basic Token Streaming');
  console.log('------------------------');
  
  try {
    // Create a raw query generator for token streaming
    const messageGenerator = claude()
      .withModel('sonnet')  // Using faster model for demo
      .queryRaw('Write a short story about a robot learning to paint, in exactly 3 sentences.');
    
    // Create a token stream from the message generator
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Streaming response:\n');
    
    // Collect tokens for display
    const tokens = [];
    for await (const chunk of tokenStream.tokens()) {
      // Display each token as it arrives
      process.stdout.write(chunk.token);
      tokens.push(chunk.token);
    }
    
    // Get streaming metrics
    const metrics = tokenStream.getMetrics();
    console.log('\n\n📊 Streaming Metrics:');
    console.log(`- Tokens received: ${metrics.tokensEmitted}`);
    console.log(`- Duration: ${metrics.duration}ms`);
    console.log(`- State: ${metrics.state}`);
    
  } catch (error) {
    console.error('❌ Streaming error:', error.message);
  }

  // Example 2: Controlled streaming with pause/resume
  console.log('\n\n2. Controlled Streaming (Pause/Resume)');
  console.log('--------------------------------------');
  
  try {
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('Count from 1 to 10 slowly, with each number on a new line.');
    
    const tokenStream = createTokenStream(messageGenerator);
    const controller = tokenStream.getController();
    
    console.log('Streaming with pause control:\n');
    
    let tokenCount = 0;
    for await (const chunk of tokenStream.tokens()) {
      process.stdout.write(chunk.token);
      tokenCount++;
      
      // Pause after receiving 5 tokens
      if (tokenCount === 5 && controller.getState() === 'streaming') {
        console.log('\n\n⏸️  Pausing stream for 2 seconds...');
        controller.pause();
        
        // Resume after 2 seconds
        setTimeout(() => {
          console.log('▶️  Resuming stream...\n');
          controller.resume();
        }, 2000);
      }
    }
    
    console.log('\n\n✅ Streaming completed');
    
  } catch (error) {
    console.error('❌ Controlled streaming error:', error.message);
  }

  // Example 3: Building a progress indicator
  console.log('\n\n3. Progress Indicator Example');
  console.log('-----------------------------');
  
  try {
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('List 5 interesting facts about space exploration.');
    
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Generating response with progress:\n');
    
    // Collect tokens while showing progress
    const allTokens = [];
    const progressWidth = 30;
    let receivedTokens = 0;
    
    for await (const chunk of tokenStream.tokens()) {
      allTokens.push(chunk.token);
      receivedTokens++;
      
      // Update progress bar every 5 tokens
      if (receivedTokens % 5 === 0) {
        const progress = Math.min(receivedTokens / 100, 1); // Assume ~100 tokens
        const filled = Math.floor(progress * progressWidth);
        const empty = progressWidth - filled;
        process.stdout.write(`\r[${'█'.repeat(filled)}${' '.repeat(empty)}] ${Math.floor(progress * 100)}%`);
      }
    }
    
    // Clear progress bar and show completion
    process.stdout.write('\r' + ' '.repeat(progressWidth + 10) + '\r');
    console.log('✅ Response generated successfully!\n');
    
    // Show the complete response
    console.log('Complete response:');
    console.log(allTokens.join(''));
    
  } catch (error) {
    console.error('❌ Progress indicator error:', error.message);
  }

  // Example 4: Token streaming with event handlers
  console.log('\n\n4. Token Streaming with Event Handlers');
  console.log('--------------------------------------');
  
  try {
    // Track different types of content
    let textTokens = 0;
    let toolCalls = 0;
    
    const messageGenerator = claude()
      .withModel('sonnet')
      .onMessage(msg => {
        if (msg.type === 'assistant') {
          for (const block of msg.content) {
            if (block.type === 'tool_use') {
              toolCalls++;
            }
          }
        }
      })
      .queryRaw('What is the weather like today? (Just make something up)');
    
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Streaming with event tracking:\n');
    
    for await (const chunk of tokenStream.tokens()) {
      process.stdout.write(chunk.token);
      textTokens++;
    }
    
    console.log('\n\n📊 Event Statistics:');
    console.log(`- Text tokens: ${textTokens}`);
    console.log(`- Tool calls: ${toolCalls}`);
    
  } catch (error) {
    console.error('❌ Event handler error:', error.message);
  }

  // Example 5: Error handling in token streams
  console.log('\n\n5. Token Stream Error Handling');
  console.log('------------------------------');
  
  try {
    const messageGenerator = claude()
      .withModel('sonnet')
      .withTimeout(3000)  // Short timeout for demo
      .queryRaw('Write a very long essay about the history of computing');
    
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Attempting to stream with timeout:\n');
    
    try {
      for await (const chunk of tokenStream.tokens()) {
        process.stdout.write(chunk.token);
      }
      console.log('\n✅ Completed successfully');
    } catch (streamError) {
      console.error('\n❌ Stream error:', streamError.message);
      const metrics = tokenStream.getMetrics();
      console.log('📊 Partial metrics:', {
        tokensReceived: metrics.tokensEmitted,
        duration: metrics.duration,
        state: metrics.state
      });
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }

  console.log('\n✨ Token streaming examples completed!');
}

// Error handling wrapper
tokenStreamingExample().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});