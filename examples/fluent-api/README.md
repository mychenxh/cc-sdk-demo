# Fluent API Examples

This directory contains examples demonstrating the Claude Code SDK's fluent API syntax. The fluent API provides a chainable, intuitive interface for building queries with type safety and better developer experience.

## Examples Overview

### 1. Hello World (`hello-world.js`)
The simplest example showing basic usage:
```javascript
const result = await claude()
  .withModel('sonnet')
  .query('Say hello!')
  .asText();
```

### 2. Code Analysis (`code-analysis.js`)
Analyze code files and project structure:
```javascript
await claude()
  .withModel('opus')
  .allowTools('Read', 'Grep', 'Glob')
  .inDirectory(projectPath)
  .query('Analyze the project architecture')
  .asText();
```

### 3. Error Handling (`error-handling.js`)
Comprehensive error handling patterns:
```javascript
try {
  await claude()
    .withTimeout(5000)
    .query('Complex task')
    .asText();
} catch (error) {
  // Handle specific error types
}
```

### 4. File Operations (`file-operations.js`)
File manipulation with safety controls:
```javascript
await claude()
  .allowTools('Read', 'Write', 'Edit')
  .acceptEdits()
  .withMCPServerPermission('file-system-mcp', 'whitelist')
  .query('Organize project files')
  .asText();
```

### 5. Interactive Session (`interactive-session.js`)
Build interactive CLI applications:
```javascript
const session = claude()
  .withModel('sonnet')
  .allowTools('Read', 'Write')
  .onToolUse(tool => console.log(`Tool: ${tool.name}`));
```

### 6. Project Scaffolding (`project-scaffolding.js`)
Create complete project structures:
```javascript
await claude()
  .withModel('opus')
  .allowTools('Write', 'LS', 'Bash')
  .acceptEdits()
  .query('Create a React TypeScript project')
  .asText();
```

### 7. Web Research (`web-research.js`)
Research and learning tasks:
```javascript
await claude()
  .withModel('opus')
  .query('Compare JavaScript frameworks')
  .asText();
```

## Key Fluent API Features

### Method Chaining
All configuration methods return the builder instance for chaining:
```javascript
claude()
  .withModel('opus')
  .allowTools('Read', 'Write')
  .withTimeout(30000)
  .debug(true)
  .query('...')
```

### Response Formats
Choose how to consume the response:
```javascript
// As plain text
const text = await query.asText();

// Stream with callback
await query.stream(async (message) => {
  if (message.type === 'assistant') {
    for (const block of message.content) {
      if (block.type === 'text') {
        process.stdout.write(block.text);
      }
    }
  }
});

// As complete result
const result = await query.asResult();

// As raw messages (using queryRaw)
for await (const message of claude().queryRaw('prompt')) {
  console.log(message.type);
}
```

### Event Handlers
React to events during execution:
```javascript
claude()
  .onMessage(msg => console.log('Message:', msg.type))
  .onToolUse(tool => console.log('Tool:', tool.name))
  .onAssistant(content => console.log('Assistant:', content))
```

### Permission Management
Fine-grained control over tool usage:
```javascript
claude()
  .allowTools('Read', 'Grep')
  .denyTools('Bash', 'Write')
  .withPermissions('acceptEdits')
  .skipPermissions() // For trusted operations
```

### MCP Server Permissions
Control permissions at the server level:
```javascript
claude()
  .withMCPServerPermission('file-system-mcp', 'whitelist')
  .withMCPServerPermissions({
    'database-mcp': 'whitelist',
    'external-api-mcp': 'blacklist'
  })
```

### Configuration Files
Load settings from external files:
```javascript
await claude()
  .withConfigFile('../config/json/mcpconfig.json')
  .withRolesFile('../config/json/roles.json')
  .withRole('dataAnalyst')
```

### Roles and Personas
Apply predefined roles:
```javascript
await claude()
  .withRole('developer', { 
    language: 'TypeScript',
    framework: 'React' 
  })
  .query('Create a component')
```

## Running the Examples

```bash
# Basic example
node fluent-api/hello-world.js

# With parameters
node fluent-api/project-scaffolding.js react-app my-project

# Interactive session
node fluent-api/interactive-session.js

# With a specific role
node fluent-api/interactive-session.js developer
```

## Best Practices

1. **Start Simple**: Begin with basic queries and add configuration as needed
2. **Use Type Safety**: The fluent API is fully typed - leverage your IDE's autocomplete
3. **Handle Errors**: Always wrap queries in try-catch for production code
4. **Stream When Appropriate**: Use `stream()` callback for long responses
5. **Control Permissions**: Be explicit about tool permissions for safety
6. **Leverage Roles**: Use roles for consistent behavior across queries

## Advanced Patterns

### Custom Logger
```javascript
claude()
  .withLogger({
    info: (msg, ctx) => console.log('[INFO]', msg),
    error: (msg, ctx) => console.error('[ERROR]', msg),
    warn: (msg, ctx) => console.warn('[WARN]', msg),
    debug: (msg, ctx) => console.debug('[DEBUG]', msg)
  })
```

### Environment Variables
```javascript
claude()
  .withEnv({
    PROJECT_ROOT: '/path/to/project',
    NODE_ENV: 'development'
  })
```

### Multiple MCP Servers
```javascript
claude()
  .withMCP(
    'file-system-mcp',
    'git-mcp',
    'database-mcp'
  )
```

### Combining Features
```javascript
const result = await claude()
  .withConfigFile('../config/json/config.json')
  .withRole('senior-developer')
  .withMCPServerPermission('git-mcp', 'whitelist')
  .allowTools('Read', 'Write', 'Edit', 'Bash')
  .acceptEdits()
  .withTimeout(120000)
  .debug(true)
  .onToolUse(tool => console.log(`Tool: ${tool.name}`))
  .query('Implement the new feature')
  .asText();
```