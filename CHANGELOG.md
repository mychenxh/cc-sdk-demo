# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-06-26

### Added
- **Safe Environment Variables**: Automatic loading of DEBUG, VERBOSE, LOG_LEVEL, and NODE_ENV from environment
- **Enhanced Error Handling**: Error categorization with user-friendly resolution hints
- **AbortSignal Support** (Beta): Cancel long-running queries with standard AbortSignal
- **Session Management** (Beta): Maintain conversation context across queries
- **Production Features**: Integration of retry logic, per-call permissions, and telemetry
- Comprehensive documentation for new features
- Environment variables safety guide with API key warnings

### Changed
- Error classes now include optional `category` and `resolution` properties
- Improved error messages with actionable hints
- Enhanced TypeScript type exports

### Security
- API keys are NOT automatically loaded from environment variables to prevent accidental billing
- Clear documentation about subscription billing implications

### Fixed
- Various TypeScript type improvements
- Export consistency for enhanced features

## [0.3.0-beta.2] - 2025-06-26

### Added
- AbortSignal support for query cancellation
- Repository cleanup and documentation improvements

### Fixed
- Test suite improvements
- Type export corrections

## [0.3.0-beta.1] - 2025-06-25

### Added
- Initial beta release with enhanced features
- Environment variable support
- Enhanced error handling framework

## [0.2.1] - 2025-01-21

### Added
- **YAML Configuration**: Support for YAML config files with auto-detection
- **MCP Server Permissions**: Configure permissions at the server level
- **Role-Based Access**: Define roles with specific permissions and templates
- **Configuration Loading**: Load external configs with `withConfigFile()` and `withRolesFile()`

### Improved
- YAML support for better config readability with comments
- Environment variable expansion in configurations
- Role inheritance for DRY configuration
- Full test coverage for new configuration features

## [0.2.0] - 2025-01-15

### Added
- **Fluent API**: New chainable API with `claude()` for improved developer experience
- **Response Parsers**: Built-in methods for extracting text, JSON, and tool results
- **Logging Framework**: Pluggable logging system with multiple implementations
- **Event Handlers**: `onMessage()`, `onAssistant()`, and `onToolUse()` callbacks
- **Usage Statistics**: Get token counts and cost information with `.getUsage()`

### Improved
- 100% backward compatible - existing code continues to work
- Comprehensive TypeScript support throughout
- Extensive test coverage for all new features
- New examples demonstrating fluent API patterns

## [0.1.4] - 2025-01-10

### Fixed
- Include examples in npm package

## [0.1.2] - 2025-01-08

### Fixed
- Fixed CLI command search to properly find `claude` command
- Removed unsupported authentication flags (CLI handles auth internally)
- Improved error messages for authentication failures
- Updated documentation to clarify authentication flow

## [0.1.1] - 2025-01-05

### Added
- Added `--print` flag for non-interactive mode

### Fixed
- Fixed CLI path resolution
- Initial TypeScript error fixes

## [0.1.0] - 2025-01-01

### Added
- Initial release
- TypeScript port of official Python SDK
- Full support for Claude Code CLI features
- Async generator API for streaming responses
- Comprehensive TypeScript types
- Example scripts for common use cases