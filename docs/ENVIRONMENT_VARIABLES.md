# Environment Variables

The Claude Code SDK supports loading certain configuration options from environment variables for convenience. However, for security and billing safety, API keys are NOT automatically loaded.

## ⚠️ Important: API Key Safety

**API keys are NOT automatically loaded from environment variables.** This is an intentional safety measure to prevent accidental overage charges.

### Why This Matters

- If you've logged in via `claude login`, you're using a Pro/Max subscription
- Using an API key (from `ANTHROPIC_API_KEY`) bypasses your subscription and incurs pay-per-use charges
- This could lead to unexpected billing if you have the environment variable set

### How to Use API Keys

If you need to use an API key, you must explicitly provide it:

```javascript
// ✅ Safe: Explicit API key
const result = await query('Your prompt', { 
  apiKey: 'sk-ant-...' 
});

// ❌ Never implemented: Automatic loading
// The SDK will NEVER automatically load ANTHROPIC_API_KEY
```

## Supported Environment Variables

The following environment variables are automatically loaded and can be overridden by explicit options:

### `DEBUG`
Enable debug mode for additional logging.

- **Values**: `true`, `1`, `yes`, `on` (for true) | `false`, `0`, `no`, `off` (for false)
- **Default**: `false`
- **Example**: `DEBUG=true npm start`

### `VERBOSE`
Enable verbose output for more detailed information.

- **Values**: `true`, `1`, `yes`, `on` (for true) | `false`, `0`, `no`, `off` (for false)
- **Default**: `false`
- **Example**: `VERBOSE=1 npm start`

### `LOG_LEVEL`
Set the logging level (0-4).

- **Values**: `0` (silent) to `4` (debug)
- **Default**: Not set
- **Example**: `LOG_LEVEL=3 npm start`

### `NODE_ENV`
The Node.js environment (loaded but not directly used by SDK).

- **Values**: `development`, `production`, `test`, etc.
- **Default**: Not set
- **Example**: `NODE_ENV=development npm start`

## Precedence

Explicit options always take precedence over environment variables:

```javascript
// Environment: DEBUG=true
const result = await query('Your prompt', { 
  debug: false  // This wins - debug will be false
});
```

## Example Usage

```bash
# Enable debug mode via environment
DEBUG=true node your-script.js

# Multiple environment variables
DEBUG=true VERBOSE=1 LOG_LEVEL=3 node your-script.js

# Environment variables with explicit overrides
DEBUG=true node your-script.js
# In your code: query('prompt', { debug: false }) // debug will be false
```

## Future Considerations

If you absolutely need to load API keys from environment variables (not recommended), you could implement it in your own code:

```javascript
// Your code - NOT built into the SDK
const apiKey = process.env.ANTHROPIC_API_KEY;
if (apiKey) {
  console.warn('⚠️  Using API key from environment - this may incur charges!');
  const result = await query('Your prompt', { apiKey });
}
```