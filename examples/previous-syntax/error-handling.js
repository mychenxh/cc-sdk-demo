/**
 * Error Handling Example
 * Demonstrates proper error handling with the Claude Code SDK
 */

import { query, ClaudeSDKError, CLINotFoundError, ProcessError } from '@instantlyeasy/claude-code-sdk-ts';

async function demonstrateErrorHandling() {
  console.log('🛡️  Error Handling Examples\n');
  console.log('─'.repeat(60) + '\n');
  
  // Example 1: Handle CLI not found
  console.log('1️⃣  Handling missing CLI:\n');
  try {
    // This will fail if CLI is not installed
    for await (const message of query('Hello')) {
      // Process messages
    }
  } catch (error) {
    if (error instanceof CLINotFoundError) {
      console.log('❌ Claude CLI not found!');
      console.log('💡 Install with: npm install -g @anthropic-ai/claude-code');
      console.log('📖 Visit: https://github.com/anthropics/claude-code\n');
    }
  }
  
  // Example 2: Handle authentication errors
  console.log('2️⃣  Handling authentication issues:\n');
  try {
    const options = { timeout: 5000 };
    for await (const message of query('Create a test file', options)) {
      // Process messages
    }
  } catch (error) {
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      console.log('❌ Authentication required!');
      console.log('💡 Run: claude login');
      console.log('📖 The Claude CLI handles all authentication\n');
    }
  }
  
  // Example 3: Handle timeout
  console.log('3️⃣  Handling timeouts:\n');
  try {
    const options = { 
      timeout: 1000,  // Very short timeout
      permissionMode: 'bypassPermissions'
    };
    
    for await (const message of query('Analyze all files in the system', options)) {
      // This might timeout
    }
  } catch (error) {
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      console.log('⏱️  Operation timed out!');
      console.log('💡 Try increasing the timeout in options\n');
    }
  }
  
  // Example 4: Handle specific tool errors
  console.log('4️⃣  Handling tool restrictions:\n');
  try {
    const options = {
      allowedTools: ['Read'],  // Only allow Read
      deniedTools: ['Write'],  // Explicitly deny Write
      permissionMode: 'bypassPermissions'
    };
    
    // This will fail because Write is not allowed
    for await (const message of query('Create a new file called test.txt', options)) {
      if (message.type === 'assistant') {
        for (const block of message.content) {
          if (block.type === 'text') {
            console.log('Claude:', block.text);
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Tool usage was restricted');
    console.log('💡 Check your allowedTools/deniedTools configuration\n');
  }
}

async function robustQueryWrapper(prompt, options = {}) {
  /**
   * A robust wrapper that handles common errors gracefully
   */
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt} of ${maxRetries}...`);
      
      const messages = [];
      for await (const message of query(prompt, options)) {
        messages.push(message);
        
        // Process message as needed
        if (message.type === 'result') {
          return {
            success: true,
            result: message.content,
            messages,
            cost: message.cost?.total_cost
          };
        }
      }
      
    } catch (error) {
      lastError = error;
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      // Don't retry certain errors
      if (error instanceof CLINotFoundError || 
          error.message?.includes('authentication')) {
        throw error;
      }
      
      // Wait before retrying
      if (attempt < maxRetries) {
        const waitTime = attempt * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  return {
    success: false,
    error: lastError,
    attempts: maxRetries
  };
}

// Example usage with the robust wrapper
async function main() {
  console.log('🚀 Robust Query Example\n');
  
  const result = await robustQueryWrapper(
    'What is 2 + 2?',
    { 
      timeout: 30000,
      permissionMode: 'bypassPermissions'
    }
  );
  
  if (result.success) {
    console.log('✅ Success:', result.result);
    console.log('💰 Cost:', `$${result.cost || 0}`);
  } else {
    console.log('❌ Failed after', result.attempts, 'attempts');
    console.log('Error:', result.error?.message);
  }
}

// Run examples
demonstrateErrorHandling().catch(console.error);

export { robustQueryWrapper };