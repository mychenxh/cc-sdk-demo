/**
 * Code Analysis Example
 * Demonstrates using Claude to analyze code and suggest improvements
 */

import { query } from '@instantlyeasy/claude-code-sdk-ts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzeCode() {
  const options = {
    permissionMode: 'acceptEdits',
    allowedTools: ['Read', 'Glob', 'Grep'],
    cwd: join(__dirname, '..')  // Point to the SDK root
  };
  
  console.log('Analyzing TypeScript code in the SDK...\n');
  
  for await (const message of query(
    'Find all TypeScript files in the src directory and identify any TODO comments or areas marked for improvement',
    options
  )) {
    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          console.log('🚀 Claude initialized\n');
        }
        break;
        
      case 'assistant':
        for (const block of message.content) {
          if (block.type === 'text') {
            console.log('Claude:', block.text);
          } else if (block.type === 'tool_use') {
            console.log(`\n🔧 Using ${block.name}...`);
          }
        }
        break;
        
      case 'result':
        console.log('\n📊 Analysis Summary:');
        console.log('─'.repeat(50));
        console.log(message.content);
        console.log('\n💰 Cost:', `$${message.cost?.total_cost || 0}`);
        break;
    }
  }
}

async function main() {
  try {
    await analyzeCode();
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('claude command not found')) {
      console.error('\n💡 Tip: Install Claude CLI with: npm install -g @anthropic-ai/claude-code');
    }
  }
}

main();