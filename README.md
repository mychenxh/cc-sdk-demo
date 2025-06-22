# Claude Code SDK for TypeScript

[![npm version](https://badge.fury.io/js/@instantlyeasy%2Fclaude-code-sdk-ts.svg)](https://www.npmjs.com/package/@instantlyeasy/claude-code-sdk-ts)
[![npm downloads](https://img.shields.io/npm/dm/@instantlyeasy/claude-code-sdk-ts.svg)](https://www.npmjs.com/package/@instantlyeasy/claude-code-sdk-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js Version](https://img.shields.io/node/v/@instantlyeasy/claude-code-sdk-ts.svg)](https://nodejs.org/)

Unofficial TypeScript port of the official Python Claude Code SDK for [Claude Code](https://github.com/anthropics/claude-code), the CLI tool for interacting with Claude.

> **Note**: This is a community-maintained TypeScript port. For the official Python SDK, see [claude-code-sdk](https://github.com/anthropics/claude-code-sdk).

## Installation

```bash
npm install @instantlyeasy/claude-code-sdk-ts
# or
yarn add @instantlyeasy/claude-code-sdk-ts
# or
pnpm add @instantlyeasy/claude-code-sdk-ts
```

**Prerequisites:**
- Node.js 18 or later
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)

## Quick Start

```typescript
import { query } from '@instantlyeasy/claude-code-sdk-ts';

// Simple query
for await (const message of query('Create a hello.txt file')) {
  console.log(message);
}

// With options
import { query, ClaudeCodeOptions } from '@instantlyeasy/claude-code-sdk-ts';

const options: ClaudeCodeOptions = {
  allowedTools: ['Read', 'Write'],
  permissionMode: 'acceptEdits',
  cwd: '/Users/me/projects'
};

for await (const message of query('Analyze this codebase', options)) {
  if (message.type === 'assistant') {
    // Handle assistant messages with tool use
    for (const block of message.content) {
      if (block.type === 'text') {
        console.log(block.text);
      } else if (block.type === 'tool_use') {
        console.log(`Using tool: ${block.name}`);
      }
    }
  } else if (message.type === 'result') {
    // Handle final result
    console.log('Result:', message.content);
    console.log('Cost:', message.cost?.total_cost);
  }
}
```

## Authentication

This SDK delegates all authentication to the Claude CLI. There are two ways to authenticate:

### 1. Claude Pro/Max Account (Recommended)
```bash
# One-time setup - login with your Claude account
claude login
```

### 2. API Key (If supported by your Claude CLI version)
The Claude CLI may support API key authentication in some configurations. Check your Claude CLI documentation.

**Important**: The SDK does not handle authentication directly. If you see authentication errors, you need to authenticate using the Claude CLI first.

## API Reference

### `query(prompt: string, options?: ClaudeCodeOptions): AsyncGenerator<Message>`

Query Claude Code with a prompt and options.

#### Parameters

- `prompt` (string): The prompt to send to Claude Code
- `options` (ClaudeCodeOptions, optional): Configuration options

#### Returns

An async generator that yields `Message` objects.

### Types

#### `ClaudeCodeOptions`

```typescript
interface ClaudeCodeOptions {
  model?: string;              // Claude model to use (e.g., 'opus', 'sonnet')
  tools?: ToolName[];          // Tools to enable
  allowedTools?: ToolName[];   // Explicitly allowed tools
  deniedTools?: ToolName[];    // Explicitly denied tools
  mcpServers?: MCPServer[];    // MCP servers to connect
  permissionMode?: PermissionMode; // 'default' | 'acceptEdits' | 'bypassPermissions'
  context?: string[];          // Context file paths
  cwd?: string;               // Working directory
  env?: Record<string, string>; // Environment variables
  timeout?: number;           // Timeout in milliseconds
  debug?: boolean;            // Enable debug logging
  
  // Note: Authentication is handled by Claude CLI
  // Use `claude login` for Claude Pro/Max accounts
  // API keys are not supported via CLI transport
  apiKey?: string;             // Deprecated - not used by CLI
  baseUrl?: string;            // Deprecated - not used by CLI
  maxTokens?: number;          // Deprecated - not used by CLI
  temperature?: number;        // Deprecated - not used by CLI
}
```

#### `Message`

```typescript
type Message = UserMessage | AssistantMessage | SystemMessage | ResultMessage;

interface UserMessage {
  type: 'user';
  content: string;
}

interface AssistantMessage {
  type: 'assistant';
  content: ContentBlock[];
}

interface SystemMessage {
  type: 'system';
  content: string;
}

interface ResultMessage {
  type: 'result';
  content: string;
  usage?: UsageInfo;
  cost?: CostInfo;
}
```

#### `ContentBlock`

```typescript
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<TextBlock | unknown>;
  is_error?: boolean;
}
```

## Examples

### File Operations

```typescript
import { query } from '@instantlyeasy/claude-code-sdk-ts';

const options = {
  allowedTools: ['Read', 'Write', 'Edit'],
  permissionMode: 'acceptEdits' as const
};

for await (const message of query('Read config.json and update version to 2.0', options)) {
  // Process messages
}
```

### Code Analysis

```typescript
import { query } from '@instantlyeasy/claude-code-sdk-ts';

const options = {
  allowedTools: ['Read', 'Grep', 'Glob'],
  context: ['src/**/*.ts'],
  cwd: process.cwd()
};

for await (const message of query('Find all TODO comments in the codebase', options)) {
  // Process messages
}
```

### Web Search Integration

```typescript
import { query } from '@instantlyeasy/claude-code-sdk-ts';

const options = {
  allowedTools: ['WebSearch', 'WebFetch'],
  maxTokens: 4000
};

for await (const message of query('Research the latest React best practices', options)) {
  // Process messages
}
```

## Error Handling

```typescript
import { query, ClaudeSDKError, CLINotFoundError } from '@instantlyeasy/claude-code-sdk-ts';

try {
  for await (const message of query('Hello')) {
    console.log(message);
  }
} catch (error) {
  if (error instanceof CLINotFoundError) {
    console.error('Please install Claude Code CLI first:');
    console.error('npm install -g @anthropic-ai/claude-code');
  } else if (error instanceof ClaudeSDKError) {
    console.error('SDK error:', error.message);
  } else if (error.message?.includes('Invalid API key')) {
    console.error('Authentication required. Please run: claude login');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Changelog

### v0.1.2 (Latest)
- Fixed CLI command search to properly find `claude` command
- Removed unsupported authentication flags (CLI handles auth internally)
- Improved error messages for authentication failures
- Updated documentation to clarify authentication flow

### v0.1.1
- Added `--print` flag for non-interactive mode
- Fixed CLI path resolution
- Initial TypeScript error fixes

### v0.1.0
- Initial release
- TypeScript port of official Python SDK
- Full support for Claude Code CLI features

## License

MIT