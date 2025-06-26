# Error Handling

The Claude Code SDK provides comprehensive error handling with categorized errors and helpful resolution hints.

## Error Categories

All SDK errors extend from `ClaudeSDKError` and are categorized for easier handling:

| Category | Description | Common Causes |
|----------|-------------|---------------|
| `auth` | Authentication/authorization issues | Invalid API key, expired credentials |
| `network` | Network connectivity problems | No internet, DNS issues |
| `timeout` | Operation timeouts | Long operations, slow network |
| `validation` | Input validation errors | Invalid parameters, wrong types |
| `subprocess` | CLI subprocess errors | CLI not found, crashes |
| `parsing` | Response parsing errors | Invalid JSON, unexpected format |
| `permission` | Permission-related errors | Denied access to resources |
| `configuration` | Configuration/setup errors | Invalid SDK configuration |
| `unknown` | Unexpected errors | Unhandled edge cases |

## Enhanced Error Structure

All enhanced errors include:

```typescript
interface EnhancedError {
  name: string;           // Error class name
  message: string;        // Error description
  category: ErrorCategory; // Category for handling
  resolution?: string;    // User-friendly resolution hint
  statusCode?: number;    // HTTP status code if applicable
  cause?: Error;          // Original error if wrapped
  context?: object;       // Additional context
}
```

## Error Classes

### Base Errors

```javascript
import { 
  ClaudeSDKError,
  CLIConnectionError,
  CLINotFoundError,
  ProcessError,
  AbortError
} from '@instantlyeasy/claude-code-sdk-ts';
```

### Enhanced Errors

```javascript
import {
  EnhancedAuthenticationError,
  EnhancedNetworkError,
  EnhancedTimeoutError,
  EnhancedValidationError,
  EnhancedSubprocessError,
  EnhancedParsingError,
  EnhancedPermissionError,
  EnhancedConfigurationError
} from '@instantlyeasy/claude-code-sdk-ts/errors/enhanced';
```

## Error Handling Examples

### Basic Error Handling

```javascript
try {
  const result = await query('Your prompt');
} catch (error) {
  if (error instanceof ClaudeSDKError) {
    console.error(`SDK Error: ${error.message}`);
    
    // Check for specific error types
    if (error instanceof CLINotFoundError) {
      console.error('Please install Claude CLI first');
    }
  }
}
```

### Category-Based Handling

```javascript
import { isEnhancedError } from '@instantlyeasy/claude-code-sdk-ts';

try {
  const result = await query('Your prompt');
} catch (error) {
  if (isEnhancedError(error)) {
    switch (error.category) {
      case 'auth':
        console.error('Authentication failed:', error.resolution);
        // Prompt user to check credentials
        break;
        
      case 'network':
        console.error('Network error:', error.message);
        // Maybe retry with backoff
        break;
        
      case 'timeout':
        console.error('Operation timed out');
        // Suggest increasing timeout or simplifying prompt
        break;
        
      default:
        console.error(`${error.category} error:`, error.message);
    }
  }
}
```

### Using Resolution Hints

```javascript
import { hasResolution } from '@instantlyeasy/claude-code-sdk-ts';

try {
  const result = await query('Your prompt');
} catch (error) {
  if (hasResolution(error)) {
    console.error('Error:', error.message);
    console.error('Resolution:', error.resolution);
    // Display resolution to user
  }
}
```

### Error Context

```javascript
try {
  const result = await query('Your prompt', {
    model: 'invalid-model'
  });
} catch (error) {
  if (error.category === 'validation' && error.context) {
    console.error('Validation error:', error.message);
    console.error('Field:', error.context.field);
    console.error('Invalid value:', error.context.value);
    console.error('Valid values:', error.context.validValues);
  }
}
```

## Common Error Resolutions

### Authentication Errors

```javascript
// Error: Authentication failed
// Resolution: Please check your API key or run "claude login" to authenticate

// If using API key:
const result = await query('Your prompt', { 
  apiKey: 'sk-ant-...' 
});

// Or use CLI authentication:
// $ claude login
```

### Network Errors

```javascript
// Error: Network connection failed
// Resolution: Please check your internet connection and try again

// Implement retry logic:
async function queryWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await query(prompt);
    } catch (error) {
      if (error.category === 'network' && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### Timeout Errors

```javascript
// Error: Operation timed out
// Resolution: The operation took too long. Try again with a shorter prompt or increase the timeout

const result = await query('Your prompt', {
  timeout: 60000  // Increase timeout to 60 seconds
});
```

### Subprocess Errors

```javascript
// Error: Command not found (exit code 127)
// Resolution: Claude CLI not found. Please ensure Claude CLI is installed and in your PATH

// Install Claude CLI:
// $ npm install -g @anthropic/claude-cli
```

## Error Serialization

Errors can be serialized for logging or transmission:

```javascript
try {
  const result = await query('Your prompt');
} catch (error) {
  if (isEnhancedError(error)) {
    // Serialize to JSON
    const errorData = error.toJSON();
    
    // Log to external service
    logger.error('SDK Error', errorData);
    
    // Send to error tracking
    errorTracker.capture(errorData);
  }
}
```

## Best Practices

1. **Always handle errors**: Never ignore caught errors
2. **Use error categories**: Handle different error types appropriately
3. **Show resolutions**: Display resolution hints to users
4. **Log context**: Include error context in logs for debugging
5. **Implement retries**: For transient errors (network, timeout)
6. **Fail gracefully**: Provide fallbacks for critical operations

## Creating Custom Errors

If you need to create custom errors in your application:

```javascript
import { EnhancedBaseError } from '@instantlyeasy/claude-code-sdk-ts/errors/enhanced';

class MyCustomError extends EnhancedBaseError {
  constructor(message, context) {
    super(message, {
      category: 'custom',
      resolution: 'Check your custom configuration',
      context
    });
    this.name = 'MyCustomError';
  }
}
```