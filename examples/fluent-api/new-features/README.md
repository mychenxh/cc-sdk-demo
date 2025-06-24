# Advanced Features Examples

This directory contains examples demonstrating the advanced features of the Claude Code SDK.

## Examples

### 1. Token Streaming (`token-streaming.js`)

Demonstrates real-time token streaming capabilities:
- Basic token streaming
- Pause/resume control
- Progress indicators
- Stream metrics

**Run:**
```bash
node token-streaming.js
```

### 2. Error Handling (`error-handling.js`)

Shows advanced error handling patterns:
- Typed error detection
- Retry logic for rate limits
- Graceful degradation
- Error logging strategies
- Custom error handlers

**Run:**
```bash
node error-handling.js
```

### 3. Retry Strategies (`retry-strategies.js`)

Explores various retry patterns:
- Exponential backoff
- Linear retry
- Fibonacci sequence retry
- Circuit breaker pattern
- Retry with telemetry

**Run:**
```bash
node retry-strategies.js
```

## Prerequisites

Make sure you have the SDK installed:

```bash
npm install @instantlyeasy/claude-code-sdk-ts
```

And Claude Code CLI configured:

```bash
claude --help
```

## Best Practices

These examples demonstrate production-ready patterns:

1. **Error Handling**: Always wrap your queries in try-catch blocks and handle specific error types appropriately.

2. **Retry Logic**: Use exponential backoff for transient failures and respect rate limits.

3. **Streaming**: Use token streaming for better UX in interactive applications.

4. **Telemetry**: Track metrics to understand your application's behavior and performance.

## Additional Resources

- [Main SDK Documentation](../../../README.md)
- [Fluent API Guide](../README.md)
- [API Reference](../../../docs/API.md)