#!/usr/bin/env node

import { claude, createTokenStream } from '../../../dist/index.js';
import readline from 'readline';

/**
 * Interactive Streaming Session Example
 * 
 * Demonstrates building an interactive CLI with visual typewriter streaming.
 * Uses the working character-by-character display pattern for realistic
 * streaming effects in a conversational interface.
 */

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You: '
});

// Session configuration
let currentModel = 'sonnet';
let streamingSpeed = 30; // ms between characters
let debugMode = false;

// Conversation history
const conversationHistory = [];

// Helper function for typewriter effect
async function typewriterDisplay(text, speed = streamingSpeed) {
  for (const char of text) {
    process.stdout.write(char);
    await new Promise(resolve => setTimeout(resolve, speed));
  }
}

// Helper function to get streaming response
async function getStreamingResponse(prompt) {
  try {
    // Create a raw query generator for token streaming
    const messageGenerator = claude()
      .withModel(currentModel)
      .allowTools('Read', 'Write', 'Edit', 'Grep', 'LS')
      .acceptEdits()
      .withTimeout(30000)
      .queryRaw(prompt);
    
    // Create token stream
    const tokenStream = createTokenStream(messageGenerator);
    
    // Collect all tokens first (since Claude Code delivers in chunks)
    const allTokens = [];
    for await (const chunk of tokenStream.tokens()) {
      allTokens.push(chunk.token);
    }
    
    // Return the complete response for typewriter display
    return allTokens.join('');
    
  } catch (error) {
    throw new Error(`Streaming error: ${error.message}`);
  }
}

console.log('🎬 Claude Code Interactive Streaming Session');
console.log('Watch responses appear with typewriter effect!');
console.log('Type "help" for commands, "exit" to quit\n');

rl.prompt();

rl.on('line', async (input) => {
  const trimmed = input.trim();
  
  // Handle special commands
  if (trimmed === 'exit' || trimmed === 'quit') {
    console.log('\n👋 Goodbye!');
    rl.close();
    process.exit(0);
  }
  
  if (trimmed === 'help') {
    console.log(`
🎬 Available commands:
  help       - Show this help message
  clear      - Clear conversation history
  model      - Switch model (opus/sonnet)
  speed      - Set streaming speed (fast/normal/slow)
  debug      - Toggle debug mode
  tools      - Show allowed tools
  history    - Show conversation history
  exit       - Exit the session
    `);
    rl.prompt();
    return;
  }
  
  if (trimmed === 'clear') {
    conversationHistory.length = 0;
    console.log('🧹 Conversation history cleared.');
    rl.prompt();
    return;
  }
  
  if (trimmed.startsWith('model ')) {
    const model = trimmed.substring(6);
    if (model === 'opus' || model === 'sonnet') {
      currentModel = model;
      console.log(`🤖 Switched to model: ${model}`);
    } else {
      console.log('❌ Invalid model. Use "opus" or "sonnet"');
    }
    rl.prompt();
    return;
  }
  
  if (trimmed.startsWith('speed ')) {
    const speed = trimmed.substring(6);
    switch (speed) {
      case 'fast':
        streamingSpeed = 10;
        console.log('⚡ Streaming speed: Fast (10ms per character)');
        break;
      case 'normal':
        streamingSpeed = 30;
        console.log('⏸️  Streaming speed: Normal (30ms per character)');
        break;
      case 'slow':
        streamingSpeed = 80;
        console.log('🐌 Streaming speed: Slow (80ms per character)');
        break;
      default:
        console.log('❌ Invalid speed. Use "fast", "normal", or "slow"');
    }
    rl.prompt();
    return;
  }
  
  if (trimmed === 'debug') {
    debugMode = !debugMode;
    console.log(`🔍 Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
    rl.prompt();
    return;
  }
  
  if (trimmed === 'tools') {
    console.log('🛠️  Allowed tools: Read, Write, Edit, Grep, LS');
    rl.prompt();
    return;
  }
  
  if (trimmed === 'history') {
    console.log('\n📚 Conversation History:');
    if (conversationHistory.length === 0) {
      console.log('  (empty)');
    } else {
      conversationHistory.slice(-5).forEach((msg, i) => {
        const truncated = msg.content.length > 100 
          ? msg.content.substring(0, 100) + '...' 
          : msg.content;
        console.log(`  ${i + 1}. ${msg.role}: ${truncated}`);
      });
    }
    console.log('');
    rl.prompt();
    return;
  }
  
  if (!trimmed) {
    rl.prompt();
    return;
  }
  
  // Add user message to history
  conversationHistory.push({ role: 'user', content: trimmed });
  
  // Build context from recent history
  const context = conversationHistory
    .slice(-6) // Keep last 6 messages for context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');
  
  console.log('\n🤖 Claude: ');
  
  try {
    const startTime = Date.now();
    
    // Get the complete response using token streaming
    const responseText = await getStreamingResponse(
      `${context}\n\nuser: ${trimmed}`
    );
    
    if (debugMode) {
      console.log(`\n[DEBUG] Response collected in ${Date.now() - startTime}ms`);
      console.log(`[DEBUG] Response length: ${responseText.length} characters`);
      console.log(`[DEBUG] Estimated display time: ${responseText.length * streamingSpeed}ms\n`);
    }
    
    // Display with typewriter effect
    const displayStart = Date.now();
    await typewriterDisplay(responseText, streamingSpeed);
    
    if (debugMode) {
      console.log(`\n[DEBUG] Displayed in ${Date.now() - displayStart}ms`);
    }
    
    console.log('\n');
    
    // Save assistant response to history
    if (responseText.trim()) {
      conversationHistory.push({ role: 'assistant', content: responseText.trim() });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  rl.prompt();
});

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Welcome message with typewriter effect
async function showWelcome() {
  const welcome = `Welcome to the Interactive Streaming Session!

I'll respond with a realistic typewriter effect - watch each character appear!

Try asking me something...`;
  
  console.log('🤖 Claude: ');
  await typewriterDisplay(welcome, 20);
  console.log('\n');
  rl.prompt();
}

// Initialize with welcome
showWelcome();