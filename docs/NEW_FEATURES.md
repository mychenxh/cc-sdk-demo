# New Features Documentation

This document describes three powerful new features added to the Claude Code SDK TypeScript library:

1. **MCP Server-Level Permission Management**
2. **Configuration File Support**
3. **Roles/Personas System**

## Table of Contents
- [MCP Server-Level Permissions](#mcp-server-level-permissions)
- [Configuration File Support](#configuration-file-support)
- [Roles/Personas System](#rolespersonas-system)
- [Integration Examples](#integration-examples)
- [API Reference](#api-reference)

## MCP Server-Level Permissions

Control permissions at the MCP server level, managing all tools from a specific MCP server as a group.

### Basic Usage

```typescript
import { claude } from '@instantlyeasy/claude-code-sdk-ts';

// Set individual MCP server permissions
const response = await claude()
  .withMCPServerPermission('file-system-mcp', 'whitelist')
  .withMCPServerPermission('database-mcp', 'ask')
  .withMCPServerPermission('external-api-mcp', 'blacklist')
  .query('Analyze the codebase')
  .asText();
```

### Bulk Permissions

```typescript
// Set multiple permissions at once
const response = await claude()
  .withMCPServerPermissions({
    'file-system-mcp': 'whitelist',
    'git-mcp': 'whitelist',
    'database-mcp': 'blacklist',
    'external-api-mcp': 'ask'
  })
  .query('Show git status')
  .asText();
```

### Permission States

- `whitelist` - All tools from this MCP server are automatically allowed
- `blacklist` - All tools from this MCP server are automatically denied
- `ask` - Prompt user for each tool usage from this MCP server

## Configuration File Support

Load permissions and settings from external JSON configuration files.

### Configuration Schema

Create an `mcpconfig.json` file:

```json
{
  "version": "1.0",
  "globalSettings": {
    "model": "opus",
    "timeout": 60000,
    "permissionMode": "acceptEdits",
    "cwd": "${HOME}/projects",
    "env": {
      "NODE_ENV": "development"
    }
  },
  "mcpServers": {
    "file-system-mcp": {
      "defaultPermission": "allow",
      "tools": {
        "Read": "allow",
        "Write": "deny",
        "Edit": "ask"
      }
    },
    "database-mcp": {
      "defaultPermission": "deny",
      "tools": {
        "Query": "ask"
      }
    }
  },
  "tools": {
    "allowed": ["Read", "Grep", "LS"],
    "denied": ["Bash", "WebSearch"]
  }
}
```

### Loading Configuration

```typescript
// Load from file
const response = await claude()
  .withConfigFile('./mcpconfig.json')
  .query('Analyze project')
  .asText();

// Or use inline configuration
const response = await claude()
  .withConfig({
    version: '1.0',
    globalSettings: {
      model: 'sonnet',
      timeout: 30000
    }
  })
  .query('Hello')
  .asText();
```

### Environment Variables

Configuration files support environment variable expansion:

```json
{
  "globalSettings": {
    "cwd": "${HOME}/projects",
    "env": {
      "AUTH_TOKEN": "${MY_SECRET_TOKEN}"
    }
  }
}
```

## Roles/Personas System

Define comprehensive roles with permissions, models, and prompting templates.

### Role Definition

```typescript
const dataAnalystRole = {
  name: 'dataAnalyst',
  description: 'Expert data analyst',
  model: 'opus',
  permissions: {
    mode: 'acceptEdits',
    mcpServers: {
      'database-mcp': 'whitelist'
    },
    tools: {
      allowed: ['Read', 'Query', 'Analyze'],
      denied: ['Write', 'Delete']
    }
  },
  promptingTemplate: 'You are a ${domain} analyst specializing in ${specialty}.',
  systemPrompt: 'Provide data-driven insights.',
  context: {
    maxTokens: 4000,
    temperature: 0.2
  }
};

// Use with template variables
const response = await claude()
  .withRole(dataAnalystRole, {
    domain: 'financial',
    specialty: 'risk assessment'
  })
  .query('Analyze quarterly revenue')
  .asText();
```

### Loading Roles from File

Create a `roles.json` file:

```json
{
  "version": "1.0",
  "defaultRole": "developer",
  "roles": {
    "developer": {
      "model": "sonnet",
      "permissions": {
        "mode": "default",
        "tools": {
          "allowed": ["Read", "Write", "Edit"],
          "denied": ["Delete"]
        }
      }
    },
    "seniorDeveloper": {
      "extends": "developer",
      "model": "opus",
      "permissions": {
        "mode": "acceptEdits",
        "tools": {
          "allowed": ["TodoRead", "TodoWrite"]
        }
      }
    }
  }
}
```

Load and use roles:

```typescript
const response = await claude()
  .withRolesFile('./roles.json')
  .withRole('seniorDeveloper')
  .query('Review this code')
  .asText();
```

### Role Inheritance

Roles support single inheritance through the `extends` field:

```json
{
  "roles": {
    "baseAnalyst": {
      "model": "sonnet",
      "permissions": {
        "tools": {
          "allowed": ["Read", "Grep"]
        }
      }
    },
    "seniorAnalyst": {
      "extends": "baseAnalyst",
      "model": "opus",
      "permissions": {
        "tools": {
          "allowed": ["Write", "Query"]
        }
      }
    }
  }
}
```

Child roles inherit and can override parent properties. Tool permissions are merged.

## Integration Examples

### Combining All Features

```typescript
const response = await claude()
  // Load configuration
  .withConfigFile('./mcpconfig.json')
  // Load roles
  .withRolesFile('./roles.json')
  // Apply a role
  .withRole('securityAuditor')
  // Add specific MCP permission
  .withMCPServerPermission('logging-mcp', 'whitelist')
  // Additional settings
  .debug(true)
  .onToolUse(tool => console.log(`Using: ${tool.name}`))
  .query('Audit authentication system')
  .asText();
```

### Precedence Rules

When combining features, settings are applied in this order (highest precedence first):

1. Programmatic API calls (e.g., `.withModel()`)
2. Role-based settings
3. Configuration file settings
4. Default values

### Security Best Practices

```typescript
// Create a restricted role for untrusted operations
const restrictedRole = {
  name: 'restricted',
  model: 'haiku',
  permissions: {
    mode: 'default',
    mcpServers: {
      'file-system-mcp': 'blacklist',
      'database-mcp': 'blacklist',
      'external-api-mcp': 'blacklist'
    },
    tools: {
      allowed: ['Read'],
      denied: ['Write', 'Edit', 'Delete', 'Bash', 'WebFetch']
    }
  },
  context: {
    maxTokens: 1000
  }
};
```

## API Reference

### QueryBuilder Methods

#### MCP Server Permissions

```typescript
// Set single permission
.withMCPServerPermission(serverName: string, permission: MCPServerPermission): this

// Set multiple permissions
.withMCPServerPermissions(permissions: MCPServerPermissionConfig): this
```

#### Configuration

```typescript
// Load from file (async)
.withConfigFile(filePath: string): Promise<this>

// Apply configuration object
.withConfig(config: MCPConfigSchema): this
```

#### Roles

```typescript
// Load roles from file (async)
.withRolesFile(filePath: string): Promise<this>

// Apply role by name
.withRole(roleName: string): this

// Apply role definition with template variables
.withRole(role: RoleDefinition, templateVariables?: Record<string, string>): this
```

### Type Definitions

```typescript
// MCP Server Permission
type MCPServerPermission = 'whitelist' | 'blacklist' | 'ask';

// Tool Permission
type ToolPermission = 'allow' | 'deny' | 'ask';

// Configuration Schema
interface MCPConfigSchema {
  version: '1.0';
  globalSettings?: GlobalConfigSettings;
  mcpServers?: Record<string, MCPServerConfig>;
  tools?: {
    allowed?: ToolName[];
    denied?: ToolName[];
  };
}

// Role Definition
interface RoleDefinition {
  name: string;
  model: string;
  permissions: {
    mode?: PermissionMode;
    mcpServers?: MCPServerPermissionConfig;
    tools?: {
      allowed?: ToolName[];
      denied?: ToolName[];
    };
  };
  promptingTemplate?: string;
  systemPrompt?: string;
  context?: {
    maxTokens?: number;
    temperature?: number;
    additionalContext?: string[];
  };
  extends?: string;
}
```

## Error Handling

The new features include comprehensive error handling:

```typescript
try {
  await claude()
    .withConfigFile('./invalid.json')
    .query('test');
} catch (error) {
  // Handle configuration errors
  console.error('Config error:', error.message);
}

try {
  await claude()
    .withRole('nonExistentRole')
    .query('test');
} catch (error) {
  // Handle role errors
  console.error('Role error:', error.message);
}
```

## Migration Guide

These features are fully backward compatible. Existing code continues to work without changes:

```typescript
// Original API still works
const response = await query('Hello', { model: 'sonnet' });

// New features are additive
const response = await claude()
  .withModel('sonnet')  // Existing method
  .withRole('developer') // New feature
  .query('Hello')
  .asText();
```