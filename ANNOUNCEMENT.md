# 🚀 Major Update: Claude Code SDK v0.2.0 - Now with Fluent API!

Hey everyone! Thanks for the amazing response to this morning's post. I'm excited to share that I've just released **v0.2.0** with some game-changing features based on your feedback!

## ✨ What's New?

### Before (v0.1.x):
```javascript
let responseText = '';
for await (const message of query('Analyze this code')) {
  if (message.type === 'assistant') {
    for (const block of message.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }
  }
}
console.log(responseText);
```

### Now (v0.2.0):
```javascript
const responseText = await claude()
  .query('Analyze this code')
  .asText();
console.log(responseText);
```

**That's 11 lines reduced to 3!** 🎉

## 🎯 New Features

### 1. **Fluent/Chainable API**
```javascript
const result = await claude()
  .withModel('opus')
  .allowTools('Read', 'Write')
  .skipPermissions()
  .inDirectory('./src')
  .query('Refactor this codebase')
  .asResult();
```

### 2. **Smart Response Parsing**
```javascript
// Extract JSON data
const config = await claude()
  .query('Generate a tsconfig.json')
  .asJSON();

// Get tool execution details
const files = await claude()
  .allowTools('Read')
  .query('Read all test files')
  .findToolResults('Read');

// Get usage stats
const parser = claude().query('Write a README');
const content = await parser.asText();
const stats = await parser.getUsage();
console.log(`Cost: $${stats.totalCost}`);
```

### 3. **Built-in Logging**
```javascript
import { claude, ConsoleLogger, LogLevel } from '@instantlyeasy/claude-code-sdk-ts';

await claude()
  .withLogger(new ConsoleLogger(LogLevel.DEBUG))
  .query('Debug this error')
  .asText();
```

### 4. **Event Handlers**
```javascript
await claude()
  .onToolUse(tool => console.log(`🔧 Using ${tool.name}...`))
  .onAssistant(content => console.log('💭 Claude is thinking...'))
  .query('Build a web app')
  .stream(async (message) => {
    // Handle streaming responses
  });
```

## 🔄 100% Backward Compatible

Your existing code still works perfectly! The original `query()` function is unchanged. The new features are purely additive.

## 📦 Installation

```bash
npm install @instantlyeasy/claude-code-sdk-ts@latest
```

## 📚 Resources

- **GitHub**: [claude-code-sdk-ts](https://github.com/instantlyeasy/claude-code-sdk-ts)
- **Full Docs**: [Fluent API Documentation](https://github.com/instantlyeasy/claude-code-sdk-ts/blob/main/docs/FLUENT_API.md)
- **Examples**: Check out [fluent-api-demo.js](https://github.com/instantlyeasy/claude-code-sdk-ts/blob/main/examples/fluent-api-demo.js)

## 🙏 Thank You!

This update was inspired by the community's feedback. Special thanks to everyone who suggested improvements. The fluent API makes the SDK much more intuitive and reduces boilerplate significantly.

**What do you think of the new API?** I'd love to hear your feedback and suggestions for v0.3.0!

---

*PS: The SDK is still unofficial but aims to provide the best TypeScript experience for Claude Code. Built with ❤️ and Claude's help!*