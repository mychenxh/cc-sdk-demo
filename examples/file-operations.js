/**
 * File Operations Example
 * Demonstrates creating, reading, and editing files with Claude Code SDK
 */

import { query } from '@instantlyeasy/claude-code-sdk-ts';

async function createFile() {
  console.log('Creating a new file...\n');
  
  const options = {
    permissionMode: 'bypassPermissions',
    allowedTools: ['Write']
  };
  
  for await (const message of query(
    'Create a file called "example.txt" with the content "This file was created by Claude!"', 
    options
  )) {
    if (message.type === 'result') {
      console.log('✓ File created successfully');
    }
  }
}

async function readAndEditFile() {
  console.log('\nReading and editing the file...\n');
  
  const options = {
    permissionMode: 'bypassPermissions',
    allowedTools: ['Read', 'Edit']
  };
  
  for await (const message of query(
    'Read example.txt and append a new line saying "Edited at: [current date/time]"',
    options
  )) {
    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          console.log('Claude:', block.text);
        } else if (block.type === 'tool_use') {
          console.log(`→ Using tool: ${block.name}`);
        }
      }
    } else if (message.type === 'result') {
      console.log('\n✓ Task completed');
    }
  }
}

async function main() {
  try {
    await createFile();
    await readAndEditFile();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();