/**
 * Interactive Session Example
 * Demonstrates handling all message types and building an interactive experience
 */

import { query } from '@instantlyeasy/claude-code-sdk-ts';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function runQuery(userPrompt, options = {}) {
  const defaultOptions = {
    permissionMode: 'acceptEdits',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  console.log('\n' + '─'.repeat(60));
  let hasOutput = false;
  
  for await (const message of query(userPrompt, mergedOptions)) {
    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          console.log(`🚀 Session ${message.data.session_id.slice(0, 8)}...`);
          console.log(`📋 Available tools: ${message.data.tools.slice(0, 5).join(', ')}...`);
          console.log('─'.repeat(60) + '\n');
        }
        break;
        
      case 'assistant':
        hasOutput = true;
        for (const block of message.content) {
          if (block.type === 'text') {
            console.log('🤖 Claude:', block.text);
          } else if (block.type === 'tool_use') {
            console.log(`\n🔧 ${block.name}:`, JSON.stringify(block.input, null, 2));
          }
        }
        break;
        
      case 'user':
        // Tool results - you could show these if desired
        for (const block of message.content) {
          if (block.type === 'tool_result' && block.content) {
            console.log(`✅ Result: ${block.content.slice(0, 100)}${block.content.length > 100 ? '...' : ''}`);
          }
        }
        break;
        
      case 'result':
        if (!hasOutput) {
          console.log('🤖 Claude:', message.content);
        }
        console.log('\n' + '─'.repeat(60));
        console.log(`✨ Completed in ${message.usage?.output_tokens || 0} tokens`);
        console.log(`💰 Cost: $${message.cost?.total_cost || 0}`);
        break;
    }
  }
}

async function main() {
  console.log('🎯 Claude Code SDK - Interactive Session');
  console.log('Type "exit" to quit, "help" for commands\n');
  
  const helpText = `
Available commands:
  exit          - Quit the session
  help          - Show this help
  model:<name>  - Change model (e.g., model:opus)
  mode:<mode>   - Change permission mode (default/acceptEdits/bypassPermissions)
  
Example prompts:
  - Create a Python script that calculates fibonacci numbers
  - What files are in the current directory?
  - Read package.json and explain what this project does
  - Create a simple web server in Node.js
`;
  
  let currentOptions = {};
  
  while (true) {
    const input = await prompt('\n💭 Your prompt: ');
    
    if (input.toLowerCase() === 'exit') {
      console.log('\n👋 Goodbye!');
      break;
    }
    
    if (input.toLowerCase() === 'help') {
      console.log(helpText);
      continue;
    }
    
    if (input.startsWith('model:')) {
      currentOptions.model = input.slice(6);
      console.log(`✓ Model set to: ${currentOptions.model}`);
      continue;
    }
    
    if (input.startsWith('mode:')) {
      currentOptions.permissionMode = input.slice(5);
      console.log(`✓ Permission mode set to: ${currentOptions.permissionMode}`);
      continue;
    }
    
    try {
      await runQuery(input, currentOptions);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      
      if (error.message.includes('authentication')) {
        console.log('\n💡 Tip: Make sure you\'re logged in with: claude login');
      }
    }
  }
  
  rl.close();
}

main().catch(console.error);