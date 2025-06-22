# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an unofficial TypeScript SDK for Claude Code (`@anthropic-ai/claude-code-sdk`). It provides a type-safe wrapper around the Claude Code CLI, allowing developers to programmatically interact with Claude's capabilities.

## Essential Commands

```bash
# Install dependencies
npm install

# Build the SDK (outputs to dist/)
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

The SDK follows a clean architecture with minimal external dependencies:

- **Entry Point**: `src/index.ts` exports a single `query()` function
- **Internal Client**: `src/_internal/client.ts` handles the subprocess communication
- **Transport Layer**: `src/_internal/transport/subprocess-cli.ts` manages CLI execution
- **Type Definitions**: `src/types.ts` provides comprehensive TypeScript types
- **Error Handling**: `src/errors.ts` defines custom error classes

The SDK uses an async generator pattern to stream messages from Claude Code, providing real-time responses while maintaining type safety.

## Testing Approach

Tests use Vitest and should follow these patterns:
- Unit tests go in `tests/` with `.test.ts` extension
- Mock subprocess behavior when testing the client
- Focus on API contract and error handling
- Run a single test: `npx vitest tests/query.test.ts`

## Build Configuration

The project uses tsup for bundling:
- Outputs both CommonJS and ESM formats
- Targets Node.js 18+
- Generates TypeScript declarations
- Source maps included for debugging

## Key Implementation Details

1. The SDK communicates with Claude Code CLI via subprocess using `execa`
2. Messages are streamed line-by-line and parsed as JSON
3. The CLI is located using the `which` package, falling back to `claude` in PATH
4. All options are passed as CLI arguments, following the Claude Code CLI interface
5. Supports both streaming assistant messages and handling tool results

## Development Guidelines

When making changes:
1. Maintain backward compatibility with the public API
2. Update TypeScript types in `src/types.ts` when adding new features
3. Follow the existing async generator pattern for new functionality
4. Ensure all exports are properly re-exported in `src/index.ts`
5. Add corresponding tests for new features