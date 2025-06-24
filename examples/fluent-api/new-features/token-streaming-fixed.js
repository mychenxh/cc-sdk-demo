#!/usr/bin/env node

/**
 * Token Streaming Example (Fixed)
 * 
 * This example demonstrates how to use the SDK's token streaming feature
 * to receive Claude's responses in real-time, token by token.
 * 
 * Note: Claude Code only supports 'sonnet' and 'opus' models.
 */

import { claude, createTokenStream } from '@instantlyeasy/claude-code-sdk-ts';

async function tokenStreamingExample() {
  console.log('📝 Token Streaming Example\n');

  // Example 1: Basic token streaming with visible output
  console.log('1. Basic Token Streaming');
  console.log('------------------------');
  
  try {
    // Create a raw query generator for token streaming
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('Count slowly from 1 to 5, with one number per line.');
    
    // Create a token stream from the message generator
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Streaming response (watch each token appear):\n');
    
    // Track timing to show streaming
    const startTime = Date.now();
    let lastTokenTime = startTime;
    const tokens = [];
    
    for await (const chunk of tokenStream.tokens()) {
      const currentTime = Date.now();
      const timeSinceLastToken = currentTime - lastTokenTime;
      
      // Show each token with timing info
      process.stdout.write(chunk.token);
      
      // Force flush to ensure immediate display
      if (process.stdout.isTTY) {
        process.stdout.write(''); // Force flush
      }
      
      tokens.push({
        token: chunk.token,
        timing: timeSinceLastToken
      });
      
      lastTokenTime = currentTime;
    }
    
    // Get streaming metrics
    const metrics = tokenStream.getMetrics();
    const totalTime = Date.now() - startTime;
    
    console.log('\n\n📊 Streaming Metrics:');
    console.log(`- Tokens received: ${metrics.tokensEmitted}`);
    console.log(`- Total duration: ${totalTime}ms`);
    console.log(`- Average time between tokens: ${Math.round(totalTime / tokens.length)}ms`);
    console.log(`- State: ${metrics.state}`);
    
    // Show token timing details
    console.log('\n📈 Token Timing Sample (first 10 tokens):');
    tokens.slice(0, 10).forEach((t, i) => {
      console.log(`  Token ${i + 1}: "${t.token.replace(/\n/g, '\\n')}" - ${t.timing}ms`);
    });
    
  } catch (error) {
    console.error('❌ Streaming error:', error.message);
  }

  // Example 2: Visual streaming indicator
  console.log('\n\n2. Visual Streaming Progress');
  console.log('----------------------------');
  
  try {
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('List three benefits of exercise, one per line.');
    
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Streaming with visual indicator:\n');
    
    let charCount = 0;
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;
    
    for await (const chunk of tokenStream.tokens()) {
      // Clear spinner
      if (charCount > 0) {
        process.stdout.write('\b \b');
      }
      
      // Write token
      process.stdout.write(chunk.token);
      charCount += chunk.token.length;
      
      // Show spinner after token
      process.stdout.write(spinner[spinnerIndex]);
      spinnerIndex = (spinnerIndex + 1) % spinner.length;
    }
    
    // Clear final spinner
    process.stdout.write('\b \b');
    console.log('\n\n✅ Streaming completed');
    
  } catch (error) {
    console.error('❌ Visual streaming error:', error.message);
  }

  // Example 3: Character-by-character display
  console.log('\n\n3. Character-by-Character Display');
  console.log('---------------------------------');
  
  try {
    const messageGenerator = claude()
      .withModel('sonnet')
      .queryRaw('Write a single sentence about AI.');
    
    const tokenStream = createTokenStream(messageGenerator);
    
    console.log('Simulating typewriter effect:\n');
    
    const allTokens = [];
    
    // First collect all tokens
    for await (const chunk of tokenStream.tokens()) {
      allTokens.push(chunk.token);
    }
    
    // Then display character by character
    const fullText = allTokens.join('');
    for (const char of fullText) {
      process.stdout.write(char);
      await new Promise(resolve => setTimeout(resolve, 30)); // 30ms delay per character
    }
    
    console.log('\n\n✅ Typewriter effect completed');
    
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