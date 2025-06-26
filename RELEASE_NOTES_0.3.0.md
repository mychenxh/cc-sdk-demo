# Release Notes - v0.3.0

## 🎉 Major Release: Production-Ready Features

This release introduces significant enhancements that make the SDK production-ready while maintaining 100% backward compatibility.

## ✨ New Features

### 1. **Safe Environment Variable Loading**
- Automatically loads configuration from environment variables
- Supports: `DEBUG`, `VERBOSE`, `LOG_LEVEL`, `NODE_ENV`
- **Safety First**: API keys are NOT auto-loaded to prevent accidental billing
- Options precedence: Explicit > Environment > Defaults

### 2. **Enhanced Error Handling**
- New error categories for better classification
- Resolution hints to help users fix issues quickly
- Comprehensive error mapping from CLI output
- Type guards for error detection
- Categories include: `auth`, `network`, `timeout`, `validation`, `cli`, `configuration`

### 3. **Comprehensive Logging System**
- Multiple logger implementations: `ConsoleLogger`, `JSONLogger`, `MultiLogger`, `NullLogger`
- Configurable log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Pluggable architecture for custom loggers
- Integration with fluent API

### 4. **AbortSignal Support**
- Cancel long-running operations with standard AbortSignal
- Full integration with fluent API
- Proper cleanup on cancellation

### 5. **Session Management**
- Maintain conversation context across queries
- Session ID support for multi-turn conversations
- Seamless integration with fluent API

### 6. **MCP Server Permissions** (Advanced)
- Control permissions at the MCP server level
- Whitelist/blacklist/ask modes for tool groups
- Fine-grained tool control within servers

### 7. **Configuration File Support** (Advanced)
- Load settings from JSON/YAML files
- Environment variable expansion
- Global settings and tool permissions

### 8. **Roles/Personas System** (Advanced)
- Define reusable role configurations
- Template variables for dynamic prompts
- Role inheritance support
- Context settings per role

## 📚 Documentation Updates

- **README Rewrite**: Now focused entirely on the fluent API
- **Classic API**: Moved to `docs/CLASSIC_API.md`
- **New Features Guide**: Comprehensive documentation in `docs/NEW_FEATURES.md`
- **Enhanced Examples**: All examples updated with new features

## 🛠️ Developer Experience

- **Repository Reorganization**: Development files moved to `.dev/` directory
- **Cleaner npm Package**: Only user-facing files included
- **Improved TypeScript Types**: Enhanced type exports and definitions
- **Better Error Messages**: Clear, actionable error information

## 🔒 Security

- API keys must be explicitly provided - no automatic loading
- Safe defaults for all configuration options
- Permission system prevents unauthorized tool usage

## 💯 Compatibility

- **100% Backward Compatible**: All existing code continues to work
- Classic `query()` function unchanged
- New features are additive only

## 📦 Installation

```bash
npm install @instantlyeasy/claude-code-sdk-ts@0.3.0
```

## 🚀 Quick Example

```javascript
import { claude } from '@instantlyeasy/claude-code-sdk-ts';

// Environment variables are automatically loaded
const response = await claude()
  .withModel('sonnet')
  .allowTools('Read', 'Write')
  .skipPermissions()
  .withLogger(new ConsoleLogger(LogLevel.DEBUG))
  .withSignal(controller.signal)  // Cancellable
  .query('Create a TypeScript project')
  .asText();
```

## 🙏 Acknowledgments

Thanks to the Reddit user who provided feedback on the beta release, helping us ensure this release meets real-world needs.

## 📝 Full Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the complete list of changes.