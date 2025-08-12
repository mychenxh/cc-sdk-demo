# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript SDK for Claude Code CLI - an unofficial port of the official Python SDK. The library provides both a classic async generator API and a modern fluent API for interacting with Claude through the command-line interface.

## Development Commands

### Core Development
```bash
# Build the project
npm run build

# Development mode with watch
npm run dev

# Type checking
npm run typecheck

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Prepare for publish (runs build)
npm run prepare
```

### Testing
- Tests are written in TypeScript using Vitest
- Test files should follow the pattern `*.test.ts`
- No test files currently exist in the source code - tests would need to be created

## Architecture

### Core Components

1. **Internal Client** (`src/_internal/client.ts`): 
   - Handles communication with Claude Code CLI via subprocess
   - Manages message parsing and error handling
   - Uses `SubprocessCLITransport` for CLI communication

2. **Fluent API** (`src/fluent.ts`):
   - Provides chainable QueryBuilder interface
   - Handles configuration merging, permissions, roles, and templates
   - Main entry point: `claude()` function

3. **Classic API** (`src/index.ts`):
   - Maintains backward compatibility with original async generator
   - Exports both classic and fluent APIs
   - Handles all type re-exports

4. **Type System** (`src/types.ts`):
   - Comprehensive TypeScript definitions for all Claude Code concepts
   - Message types, tool definitions, permission modes
   - Configuration interfaces and streaming types

### Key Architectural Patterns

- **Dual API Design**: Both classic generator and modern fluent APIs
- **Transport Layer**: Abstracted CLI communication via subprocess
- **Permission Management**: Fine-grained tool access control
- **Configuration System**: YAML/JSON config loading with role support
- **Error Handling**: Categorized errors with resolution hints
- **Streaming Support**: Token-level and message-level streaming

### Module Structure

```
src/
├── _internal/           # Internal implementation
│   ├── client.ts        # Main client logic
│   ├── options-merger.ts
│   └── transport/       # CLI communication
├── config/             # Configuration loading
├── enhanced/           # Enhanced features (v0.3.x)
├── errors/             # Error handling
├── permissions/        # Permission management
├── retry/             # Retry strategies
├── roles/             # Role system
├── streaming/         # Streaming functionality
├── telemetry/         # Usage tracking
└── types/             # Type definitions
```

## Build System

- **Bundler**: tsup for building both CJS and ESM formats
- **TypeScript**: ES2022 target with strict mode enabled
- **Testing**: Vitest with Node.js environment
- **Linting**: ESLint with TypeScript parser
- **Formatting**: Prettier

## Key Dependencies

### Runtime Dependencies
- `execa`: Process execution for CLI communication
- `js-yaml`: YAML configuration file parsing
- `which`: Cross-platform command lookup

### Development Dependencies
- `typescript`: Language and compiler
- `vitest`: Testing framework
- `tsup`: Bundler
- `eslint` + `prettier`: Code quality

## Authentication

The SDK delegates all authentication to the Claude Code CLI:
- No API keys are handled by the SDK
- Users must run `claude login` separately
- Environment variables are loaded safely (no API_KEY auto-loading)

## Development Guidelines

1. **Type Safety**: Maintain strict TypeScript compliance
2. **Backward Compatibility**: Preserve classic API while enhancing fluent API
3. **Error Handling**: Use enhanced error types with categories and resolutions
4. **Testing**: Create comprehensive tests for new features
5. **Documentation**: Update README and examples when adding features
6. **Streaming**: Support both token-level and message-level streaming

## Current State

- **Version**: 0.3.3 with enhanced features
- **API Status**: Both classic and fluent APIs available
- **Test Coverage**: No tests currently exist - needs test suite
- **Documentation**: Comprehensive README with examples
- **Build Status**: Working build system with dual format output

## Important Notes

- The SDK communicates with Claude Code CLI via subprocess, not direct API calls
- Authentication is handled entirely by the CLI, not the SDK
- The project maintains backward compatibility with the original Python SDK patterns
- Enhanced features include token streaming, retry strategies, and advanced error handling