#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Test with a prompt that should trigger streaming
const prompt = 'Write a short story about a robot. Make it at least 500 words long to test streaming behavior.';

const args = ['--output-format', 'stream-json', '--verbose', '--print'];

// Find claude CLI
const cliPath = 'claude'; // Assumes claude is in PATH

console.log('Starting claude CLI with args:', args.join(' '));
console.log('Prompt:', prompt);
console.log('---');

const proc = spawn(cliPath, args, {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send prompt via stdin
proc.stdin.write(prompt);
proc.stdin.end();

// Read stdout line by line
const rl = createInterface({
  input: proc.stdout,
  crlfDelay: Infinity
});

let lineCount = 0;
let assistantMessageCount = 0;
let lastAssistantContent = null;

rl.on('line', (line) => {
  lineCount++;
  const trimmed = line.trim();
  if (!trimmed) return;
  
  try {
    const parsed = JSON.parse(trimmed);
    console.log(`Line ${lineCount}:`, JSON.stringify(parsed, null, 2));
    
    if (parsed.type === 'assistant') {
      assistantMessageCount++;
      const content = parsed.message?.content;
      if (content && Array.isArray(content) && content[0]?.type === 'text') {
        const text = content[0].text;
        console.log(`  -> Assistant message #${assistantMessageCount}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        
        if (lastAssistantContent && text.startsWith(lastAssistantContent)) {
          console.log(`  -> This appears to be incremental (builds on previous)`);
        }
        lastAssistantContent = text;
      }
    }
  } catch (e) {
    console.log(`Line ${lineCount} (non-JSON):`, trimmed);
  }
});

// Read stderr
const rlErr = createInterface({
  input: proc.stderr,
  crlfDelay: Infinity  
});

rlErr.on('line', (line) => {
  console.error('STDERR:', line);
});

proc.on('close', (code) => {
  console.log('---');
  console.log('Process exited with code:', code);
  console.log('Total lines:', lineCount);
  console.log('Assistant messages:', assistantMessageCount);
});