import { claude } from '../../dist/index.mjs';
import readline from 'readline';

/**
 * Interactive Session Example using Fluent API
 * Demonstrates building an interactive CLI with Claude Code SDK
 */

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You: '
});

// Session configuration
const sessionBuilder = claude()
  .withModel('sonnet')
  .allowTools('Read', 'Write', 'Edit', 'Grep', 'LS')
  .acceptEdits()
  .withTimeout(30000);

// Conversation history
const conversationHistory = [];

// Interactive message handler
sessionBuilder.onMessage(msg => {
  if (msg.type === 'assistant') {
    // Track assistant responses
    conversationHistory.push({ role: 'assistant', content: msg.content });
  }
});

// Tool usage logger
sessionBuilder.onToolUse(tool => {
  console.log(`\n[Tool: ${tool.name}]`);
});

console.log('Claude Code Interactive Session (Fluent API)');
console.log('Type "help" for commands, "exit" to quit\n');

rl.prompt();

rl.on('line', async (input) => {
  const trimmed = input.trim();
  
  // Handle special commands
  if (trimmed === 'exit' || trimmed === 'quit') {
    console.log('Goodbye!');
    rl.close();
    process.exit(0);
  }
  
  if (trimmed === 'help') {
    console.log(`
Available commands:
  help     - Show this help message
  clear    - Clear conversation history
  model    - Switch model (opus/sonnet)
  debug    - Toggle debug mode
  tools    - Show allowed tools
  exit     - Exit the session
    `);
    rl.prompt();
    return;
  }
  
  if (trimmed === 'clear') {
    conversationHistory.length = 0;
    console.log('Conversation history cleared.');
    rl.prompt();
    return;
  }
  
  if (trimmed.startsWith('model ')) {
    const model = trimmed.substring(6);
    sessionBuilder.withModel(model);
    console.log(`Switched to model: ${model}`);
    rl.prompt();
    return;
  }
  
  if (trimmed === 'debug') {
    const currentDebug = sessionBuilder.options?.debug || false;
    sessionBuilder.debug(!currentDebug);
    console.log(`Debug mode: ${!currentDebug ? 'ON' : 'OFF'}`);
    rl.prompt();
    return;
  }
  
  if (trimmed === 'tools') {
    console.log('Allowed tools: Read, Write, Edit, Grep, LS');
    rl.prompt();
    return;
  }
  
  if (!trimmed) {
    rl.prompt();
    return;
  }
  
  // Add user message to history
  conversationHistory.push({ role: 'user', content: trimmed });
  
  // Build context from history
  const context = conversationHistory
    .slice(-10) // Keep last 10 messages for context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');
  
  console.log('\nClaude: ');
  
  try {
    // Stream the response
    let responseText = '';
    await sessionBuilder
      .query(`${context}\n\nuser: ${trimmed}`)
      .stream(async (message) => {
        if (message.type === 'assistant') {
          for (const block of message.content) {
            if (block.type === 'text') {
              process.stdout.write(block.text);
              responseText += block.text;
            }
          }
        }
      });
    
    console.log('\n');
    
    // Save assistant response
    if (responseText) {
      conversationHistory.push({ role: 'assistant', content: responseText });
    }
  } catch (error) {
    console.error('\nError:', error.message);
  }
  
  rl.prompt();
});

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\nGoodbye!');
  rl.close();
  process.exit(0);
});

// Advanced session with roles (optional)
async function startWithRole() {
  const role = process.argv[2];
  if (role) {
    try {
      // Load roles configuration
      await sessionBuilder.withRolesFile('../config/json/roles.json');
      sessionBuilder.withRole(role);
      console.log(`Started session with role: ${role}\n`);
    } catch (error) {
      console.log(`Could not load role '${role}': ${error.message}`);
      console.log('Starting with default configuration.\n');
    }
  }
}

// Initialize session
startWithRole();