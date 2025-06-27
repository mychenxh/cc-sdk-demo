#!/usr/bin/env node

/**
 * Token Streaming Example
 * 
 * This example demonstrates streaming patterns with the Claude Code SDK.
 * 
 * Note: The Claude Code CLI currently delivers responses in chunks rather
 * than true token-by-token streaming. Example 3 shows how to create a 
 * typewriter effect by processing the response after it's received.
 */

import { claude, createTokenStream } from '../../../dist/index.js';

async function tokenStreamingExample() {
  console.log('📝 Token Streaming Example\n');

  // Example 1: SDK Token Stream Analysis
  console.log('1. SDK Token Stream Analysis');
  console.log('----------------------------');
  
  try {
    // Create a raw query generator for token streaming
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('Write a haiku about coding.');
    
    // Create a token stream from the message generator
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Analyzing token stream delivery:\n');
    
    // Track timing to show streaming behavior
    const startTime = Date.now();
    let lastTokenTime = startTime;
    const tokens = [];
    
    for await (const chunk of tokenStream.tokens()) {
      const currentTime = Date.now();
      const timeSinceLastToken = currentTime - lastTokenTime;
      
      process.stdout.write(chunk.token);
      
      tokens.push({
        token: chunk.token,
        timing: timeSinceLastToken
      });
      
      lastTokenTime = currentTime;
    }
    
    // Get streaming metrics
    const metrics = tokenStream.getMetrics();
    const totalTime = Date.now() - startTime;
    
    console.log('\n\n📊 Stream Analysis:');
    console.log(`- Tokens received: ${metrics.tokensEmitted}`);
    console.log(`- Total duration: ${totalTime}ms`);
    console.log(`- Average time between tokens: ${Math.round(totalTime / tokens.length)}ms`);
    console.log(`- State: ${metrics.state}`);
    
    console.log('\n⚠️  Note: Tokens may appear in chunks rather than individually');
    console.log('   This is how Claude Code CLI delivers responses currently.');
    
  } catch (error) {
    console.error('❌ Streaming error:', error.message);
  }

  // Example 2: Collecting Response for Processing
  console.log('\n\n2. Response Collection Pattern');
  console.log('------------------------------');
  
  try {
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('List 3 programming languages, one per line.');
    
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Collecting full response:\n');
    
    const allTokens = [];
    
    // Collect all tokens first
    for await (const chunk of tokenStream.tokens()) {
      allTokens.push(chunk.token);
    }
    
    const fullResponse = allTokens.join('');
    console.log(fullResponse);
    
    console.log(`\n✅ Collected ${allTokens.length} tokens`);
    console.log('💡 Use this pattern to process complete responses');
    
  } catch (error) {
    console.error('❌ Collection error:', error.message);
  }

  // Example 3: Simulated Typewriter Effect (Working Visual Streaming)
  console.log('\n\n3. Typewriter Effect (Actual Visual Streaming)');
  console.log('-----------------------------------------------');
  
  try {
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('Write one sentence about the future of AI.');
    
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Creating typewriter effect (this actually streams visually):\n');
    
    const allTokens = [];
    
    // First collect all tokens (Claude Code delivers them in chunks)
    for await (const chunk of tokenStream.tokens()) {
      allTokens.push(chunk.token);
    }
    
    // Then create visual streaming effect character by character
    const fullText = allTokens.join('');
    for (const char of fullText) {
      process.stdout.write(char);
      await new Promise(resolve => setTimeout(resolve, 30)); // 30ms delay per character
    }
    
    console.log('\n\n✅ Typewriter effect completed');
    console.log('💡 This pattern works because we control the display timing');
    
  } catch (error) {
    console.error('❌ Character display error:', error.message);
  }

  console.log('\n✨ Token streaming examples completed!');
  console.log('\nNote: If tokens appear all at once, it may be due to:');
  console.log('- Output buffering in your terminal');
  console.log('- The model generating the entire response before streaming');
  console.log('- Network conditions affecting chunk delivery');
}

// Error handling wrapper
tokenStreamingExample().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});