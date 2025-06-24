# Claude Code SDK TypeScript - Features Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for three major features to enhance the Claude Code SDK TypeScript library:

1. **MCP Server-Level Permission Management**
2. **Configuration File Support (mcpconfig.json)**
3. **Roles/Personas System**

The implementation follows Test-Driven Development (TDD) methodology, ensuring robust testing coverage and type safety throughout.

## Current Architecture Analysis

### Key Components
- **Entry Point**: `src/index.ts` - Exports `query()` function and fluent API
- **Fluent API**: `src/fluent.ts` - `QueryBuilder` class for chainable configuration
- **Types**: `src/types.ts` - Core TypeScript interfaces and types
- **Transport**: `src/_internal/transport/subprocess-cli.ts` - CLI communication layer
- **Parser**: `src/parser.ts` - Response parsing utilities
- **Logger**: `src/logger.js` - Pluggable logging framework

### Current Permission System
- Permission modes: `default`, `acceptEdits`, `bypassPermissions`
- Tool-level control via `allowedTools` and `deniedTools` arrays
- Passed to CLI via command-line arguments

## Feature 1: MCP Server-Level Permission Management

### Overview
Enable permission control at the MCP server level, managing all tools from a specific MCP server as a group.

### Design Details

#### 1.1 Type Definitions
```typescript
// src/types.ts additions
export type MCPServerPermission = 'whitelist' | 'blacklist' | 'ask';

export interface MCPServerPermissionConfig {
  [serverName: string]: MCPServerPermission;
}

export interface ClaudeCodeOptions {
  // ... existing options
  mcpServerPermissions?: MCPServerPermissionConfig;
}
```

#### 1.2 Permission Manager Module
```typescript
// src/permissions.ts (new file)
export class PermissionManager {
  private mcpServerPermissions: Map<string, MCPServerPermission>;
  
  setMCPServerPermission(serverName: string, permission: MCPServerPermission): void;
  getMCPServerPermission(serverName: string): MCPServerPermission | undefined;
  clearMCPServerPermissions(): void;
  exportConfig(): MCPServerPermissionConfig;
}
```

#### 1.3 Fluent API Integration
```typescript
// src/fluent.ts additions
export class QueryBuilder {
  private permissionManager: PermissionManager;
  
  withMCPServerPermission(serverName: string, permission: MCPServerPermission): this {
    this.permissionManager.setMCPServerPermission(serverName, permission);
    return this;
  }
  
  withMCPServerPermissions(permissions: MCPServerPermissionConfig): this {
    Object.entries(permissions).forEach(([server, perm]) => {
      this.permissionManager.setMCPServerPermission(server, perm);
    });
    return this;
  }
}
```

#### 1.4 CLI Integration
- Modify `subprocess-cli.ts` to pass MCP server permissions via `--mcp-server-permissions` flag
- Format: JSON object mapping server names to permission levels

### Implementation Steps
1. Create type definitions in `types.ts`
2. Implement `PermissionManager` class with tests
3. Add fluent API methods to `QueryBuilder`
4. Update CLI transport to handle new permission format
5. Write integration tests

### Test Cases
- Set individual MCP server permissions
- Override existing permissions
- Clear all MCP server permissions
- Verify CLI argument generation
- Integration with existing tool-level permissions

## Feature 2: Configuration File Support (mcpconfig.json)

### Overview
Enable external configuration of permissions via JSON file with schema validation.

### Design Details

#### 2.1 Configuration Schema
```typescript
// src/config/schema.ts (new file)
export interface MCPConfigSchema {
  version: '1.0';
  mcpServers?: {
    [serverName: string]: {
      defaultPermission: 'allow' | 'deny' | 'ask';
      tools?: {
        [toolName: string]: 'allow' | 'deny' | 'ask';
      };
    };
  };
  globalSettings?: {
    defaultToolPermission?: 'allow' | 'deny' | 'ask';
    permissionMode?: PermissionMode;
  };
}
```

#### 2.2 Configuration Loader
```typescript
// src/config/loader.ts (new file)
export class ConfigLoader {
  async loadFromFile(filePath: string): Promise<MCPConfigSchema>;
  validateConfig(config: unknown): MCPConfigSchema;
  mergeWithOptions(config: MCPConfigSchema, options: ClaudeCodeOptions): ClaudeCodeOptions;
}
```

#### 2.3 Fluent API Integration
```typescript
// src/fluent.ts additions
export class QueryBuilder {
  async withConfigFile(filePath: string): Promise<this> {
    const config = await this.configLoader.loadFromFile(filePath);
    this.applyConfig(config);
    return this;
  }
  
  withConfig(config: MCPConfigSchema): this {
    this.applyConfig(config);
    return this;
  }
}
```

#### 2.4 Schema Validation
- Use JSON Schema for validation
- Provide clear error messages for invalid configurations
- Support partial configurations (not all fields required)

### Implementation Steps
1. Define configuration schema types
2. Implement `ConfigLoader` with JSON Schema validation
3. Add config file support to fluent API
4. Create configuration merge logic
5. Write comprehensive validation tests

### Test Cases
- Load valid configuration file
- Validate against schema
- Handle invalid configurations gracefully
- Merge file config with programmatic config
- Test precedence rules

## Feature 3: Roles/Personas System

### Overview
Create a comprehensive role-based system with permissions, tools, models, and prompting templates.

### Design Details

#### 3.1 Role Definition Schema
```typescript
// src/roles/types.ts (new file)
export interface RoleDefinition {
  name: string;
  description?: string;
  model: string;
  permissions: {
    mcpServers?: MCPServerPermissionConfig;
    tools?: {
      allowed?: ToolName[];
      denied?: ToolName[];
    };
    mode?: PermissionMode;
  };
  promptingTemplate?: string;
  systemPrompt?: string;
  context?: {
    maxTokens?: number;
    temperature?: number;
    additionalContext?: string[];
  };
  extends?: string; // Role inheritance
}

export interface RolesConfig {
  version: '1.0';
  roles: {
    [roleName: string]: RoleDefinition;
  };
}
```

#### 3.2 Role Manager
```typescript
// src/roles/manager.ts (new file)
export class RoleManager {
  private roles: Map<string, RoleDefinition>;
  
  async loadFromFile(filePath: string): Promise<void>;
  loadFromConfig(config: RolesConfig): void;
  getRole(name: string): RoleDefinition | undefined;
  applyRole(name: string, options: ClaudeCodeOptions): ClaudeCodeOptions;
  validateRole(role: RoleDefinition): void;
  resolveInheritance(role: RoleDefinition): RoleDefinition;
}
```

#### 3.3 Fluent API Integration
```typescript
// src/fluent.ts additions
export class QueryBuilder {
  private roleManager: RoleManager;
  
  async withRolesFile(filePath: string): Promise<this> {
    await this.roleManager.loadFromFile(filePath);
    return this;
  }
  
  withRole(roleName: string): this {
    const role = this.roleManager.getRole(roleName);
    if (!role) throw new Error(`Role '${roleName}' not found`);
    
    this.applyRole(role);
    return this;
  }
  
  private applyRole(role: RoleDefinition): void {
    // Apply model
    this.withModel(role.model);
    
    // Apply permissions
    if (role.permissions.mode) {
      this.withPermissions(role.permissions.mode);
    }
    
    // Apply tools
    if (role.permissions.tools?.allowed) {
      this.allowTools(...role.permissions.tools.allowed);
    }
    
    // Apply context
    if (role.context) {
      if (role.context.maxTokens) this.options.maxTokens = role.context.maxTokens;
      if (role.context.temperature) this.options.temperature = role.context.temperature;
    }
    
    // Store prompting template for use in query
    this.rolePromptingTemplate = role.promptingTemplate;
  }
}
```

#### 3.4 Role Inheritance
- Support single inheritance via `extends` field
- Merge parent and child role properties
- Child properties override parent properties
- Validate against circular dependencies

### Implementation Steps
1. Define role schema types
2. Implement `RoleManager` with validation
3. Add role inheritance resolution
4. Integrate with fluent API
5. Add prompting template support
6. Write comprehensive tests

### Test Cases
- Load roles from file
- Apply role to query
- Test role inheritance
- Validate role definitions
- Test prompting template application
- Integration with permissions system

## Integration Considerations

### 1. Configuration Precedence
Order of precedence (highest to lowest):
1. Programmatic API calls (most specific)
2. Role-based configuration
3. Configuration file (mcpconfig.json)
4. Default values

### 2. Backward Compatibility
- All new features are additive
- Existing API remains unchanged
- New features accessible via fluent API only
- Original `query()` function unaffected

### 3. CLI Communication
- Extend CLI protocol to support new configuration formats
- Maintain compatibility with existing CLI versions
- Graceful degradation if CLI doesn't support new features

## Test Strategy (TDD Approach)

### Phase 1: Type Definitions and Interfaces
1. Define all new TypeScript interfaces
2. Ensure type compatibility with existing types
3. Write type-level tests using TypeScript compiler

### Phase 2: Unit Tests
1. Write failing tests for each new class/module
2. Implement minimal code to pass tests
3. Refactor and optimize

### Phase 3: Integration Tests
1. Test feature interactions
2. Test CLI communication
3. Test configuration merging

### Phase 4: End-to-End Tests
1. Complete workflow tests
2. Real CLI integration tests
3. Performance benchmarks

## Implementation Timeline

### Week 1: Foundation
- Type definitions for all features
- Basic test scaffolding
- PermissionManager implementation

### Week 2: MCP Server Permissions
- Complete Feature 1 implementation
- Integration with fluent API
- CLI transport updates

### Week 3: Configuration File Support
- Schema definition and validation
- ConfigLoader implementation
- Integration tests

### Week 4: Roles System
- RoleManager implementation
- Inheritance system
- Prompting template support

### Week 5: Integration & Polish
- Cross-feature integration
- Documentation updates
- Performance optimization

## Documentation Updates

### API Documentation
- Update README with new features
- Add examples for each feature
- Migration guide for existing users

### Code Examples
1. MCP server permission example
2. Configuration file example
3. Roles system example
4. Combined features example

### TypeScript Definitions
- Ensure all new APIs have proper JSDoc
- Include usage examples in comments
- Type inference optimization

## Error Handling

### Validation Errors
- Clear error messages for invalid configurations
- Suggest corrections where possible
- Include error codes for programmatic handling

### Runtime Errors
- Graceful fallback for missing features
- Warning logs for deprecated usage
- Recovery strategies for partial failures

## Performance Considerations

### Configuration Caching
- Cache loaded configurations
- Lazy loading for role definitions
- Minimize file I/O operations

### Memory Usage
- Efficient storage of permission mappings
- Cleanup unused configurations
- Monitor memory in large deployments

## Security Considerations

### File Access
- Validate file paths for configuration loading
- Prevent directory traversal attacks
- Sanitize user inputs

### Permission Escalation
- Ensure roles cannot bypass security restrictions
- Audit trail for permission changes
- Validate all permission configurations

## Conclusion

This implementation plan provides a comprehensive roadmap for adding three major features to the Claude Code SDK TypeScript library. By following TDD methodology and maintaining backward compatibility, we ensure a robust and reliable implementation that enhances the SDK's capabilities while preserving its ease of use.