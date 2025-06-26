# Classic API Reference

This document covers the original async generator API syntax. For the recommended fluent API, see the main [README](../README.md).

## Basic Usage

```javascript
import { query } from '@instantlyeasy/claude-code-sdk-ts';

// Simple query
for await (const message of query('Say "Hello World!"')) {
  if (message.type === 'assistant') {
    for (const block of message.content) {
      if (block.type === 'text') {
        console.log(block.text);
      }
    }
  }
}
```

## With Options

```javascript
import { query, ClaudeCodeOptions } from '@instantlyeasy/claude-code-sdk-ts';

const options: ClaudeCodeOptions = {
  model: 'sonnet',
  allowedTools: ['Read', 'Write'],
  permissionMode: 'acceptEdits',
  cwd: '/Users/me/projects'
};

for await (const message of query('Analyze this codebase', options)) {
  switch (message.type) {
    case 'assistant':
      // Handle assistant messages
      for (const block of message.content) {
        if (block.type === 'text') {
          console.log('Assistant:', block.text);
        } else if (block.type === 'tool_use') {
          console.log('Tool:', block.name, block.input);
        }
      }
      break;
    
    case 'result':
      // Handle final result
      console.log('Result:', message.content);
      if (message.usage) {
        console.log('Tokens used:', message.usage);
      }
      break;
  }
}
```

## Error Handling

```javascript
try {
  for await (const message of query('Hello')) {
    // Process messages
  }
} catch (error) {
  if (error instanceof CLINotFoundError) {
    console.error('Please install Claude Code CLI first');
  } else if (error instanceof ClaudeSDKError) {
    console.error('SDK error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Tool Permissions

```javascript
// Allow specific tools
const options = {
  allowedTools: ['Read', 'Grep', 'LS']
};

// Deny specific tools
const options = {
  deniedTools: ['Bash', 'Write']
};

// Read-only mode (no tools)
const options = {
  allowedTools: []
};
```

## Session Management

```javascript
// First query
let sessionId;
for await (const message of query('Hello', { model: 'sonnet' })) {
  if (message.type === 'system' && message.session_id) {
    sessionId = message.session_id;
  }
  // Process messages
}

// Continue conversation
for await (const message of query('What did I just say?', { 
  sessionId,
  model: 'sonnet' 
})) {
  // Claude remembers the previous context
}
```

## Message Types

### Assistant Message
```javascript
{
  type: 'assistant',
  content: [
    { type: 'text', text: 'Hello!' },
    { 
      type: 'tool_use', 
      id: 'tool-123',
      name: 'Read',
      input: { file_path: '/path/to/file' }
    }
  ]
}
```

### Tool Result
```javascript
{
  type: 'assistant',
  content: [
    {
      type: 'tool_result',
      tool_use_id: 'tool-123',
      content: 'File contents...',
      is_error: false
    }
  ]
}
```

### Result Message
```javascript
{
  type: 'result',
  content: 'Task completed successfully',
  usage: {
    input_tokens: 100,
    output_tokens: 50,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0
  },
  cost: {
    input_cost: 0.0003,
    output_cost: 0.0015,
    total_cost: 0.0018
  }
}
```

## Complete Example

```javascript
import { query } from '@instantlyeasy/claude-code-sdk-ts';

async function analyzeCode() {
  const options = {
    model: 'opus',
    allowedTools: ['Read', 'Grep', 'LS'],
    permissionMode: 'acceptEdits',
    cwd: process.cwd()
  };

  try {
    let fullResponse = '';
    let toolExecutions = [];

    for await (const message of query('Find all TODO comments', options)) {
      if (message.type === 'assistant') {
        for (const block of message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
          } else if (block.type === 'tool_use') {
            toolExecutions.push({
              tool: block.name,
              input: block.input
            });
          } else if (block.type === 'tool_result') {
            console.log(`Tool result:`, block.content);
          }
        }
      } else if (message.type === 'result') {
        console.log('Final result:', message.content);
        if (message.usage) {
          console.log('Token usage:', message.usage);
        }
      }
    }

    console.log('Full response:', fullResponse);
    console.log('Tools used:', toolExecutions);

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeCode();
```

## Migration to Fluent API

While the classic API continues to work, we recommend migrating to the fluent API for a better developer experience:

### Before (Classic):
```javascript
let text = '';
for await (const message of query('Generate a story')) {
  if (message.type === 'assistant') {
    for (const block of message.content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }
  }
}
console.log(text);
```

### After (Fluent):
```javascript
const text = await claude()
  .query('Generate a story')
  .asText();
console.log(text);
```

See the main [README](../README.md) for the full fluent API documentation.