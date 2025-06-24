# YAML Configuration Support Implementation Plan

## Overview
Add YAML support to the Claude Code SDK for all configuration files, allowing users to choose between JSON and YAML formats for better readability and maintainability.

## Goals
1. Support both `.yaml` and `.yml` file extensions
2. Maintain backward compatibility with JSON configs
3. Auto-detect file format based on extension
4. Provide YAML examples for all existing config files
5. Follow TDD methodology throughout implementation

## Implementation Steps

### Phase 1: Setup and Organization
1. **Reorganize Config Files**
   - Create `/examples/config/` directory
   - Move existing JSON configs to subdirectories:
     - `/examples/config/json/`
     - `/examples/config/yaml/`
   - Update all example script references

### Phase 2: Type Definitions and Interfaces
1. **Extend ConfigLoader Interface**
   ```typescript
   interface ConfigLoader {
     loadFromFile(filePath: string): Promise<MCPConfigSchema>;
     // Auto-detects JSON or YAML based on extension
   }
   ```

2. **Add YAML-specific types**
   ```typescript
   type ConfigFormat = 'json' | 'yaml';
   
   interface ConfigParseOptions {
     format?: ConfigFormat; // Optional override
     strict?: boolean;      // Strict YAML parsing
   }
   ```

### Phase 3: Test-Driven Development

#### Test Suite 1: YAML Parsing Tests
```typescript
// tests/yaml-config.test.ts
describe('YAML Configuration Support', () => {
  describe('File Format Detection', () => {
    it('should detect .yaml extension');
    it('should detect .yml extension');
    it('should default to JSON for unknown extensions');
  });
  
  describe('YAML Parsing', () => {
    it('should parse valid YAML config');
    it('should handle YAML anchors and references');
    it('should preserve number and boolean types');
    it('should handle multi-line strings');
    it('should handle comments in YAML');
  });
  
  describe('Error Handling', () => {
    it('should provide clear error for invalid YAML');
    it('should handle missing required fields');
    it('should validate against schema');
  });
  
  describe('Feature Parity', () => {
    it('should load mcpconfig.yaml identically to JSON');
    it('should load roles.yaml identically to JSON');
    it('should handle complex nested structures');
  });
});
```

#### Test Suite 2: Integration Tests
```typescript
// tests/yaml-integration.test.ts
describe('YAML Integration with Fluent API', () => {
  it('should load YAML config via withConfigFile()');
  it('should load YAML roles via withRolesFile()');
  it('should handle mixed JSON/YAML configs');
  it('should provide helpful errors for common mistakes');
});
```

### Phase 4: Implementation

1. **Add YAML Dependency**
   ```json
   {
     "dependencies": {
       "js-yaml": "^4.1.0"
     },
     "devDependencies": {
       "@types/js-yaml": "^4.0.9"
     }
   }
   ```

2. **Extend ConfigLoader Class**
   ```typescript
   // src/config/loader.ts
   import yaml from 'js-yaml';
   
   export class ConfigLoader {
     private detectFormat(filePath: string): ConfigFormat {
       const ext = path.extname(filePath).toLowerCase();
       if (ext === '.yaml' || ext === '.yml') return 'yaml';
       return 'json';
     }
     
     async loadFromFile(filePath: string, options?: ConfigParseOptions): Promise<MCPConfigSchema> {
       const format = options?.format || this.detectFormat(filePath);
       const content = await this.readFileContent(filePath);
       
       if (format === 'yaml') {
         return this.parseYAML(content, options);
       }
       return this.parseJSON(content);
     }
     
     private parseYAML(content: string, options?: ConfigParseOptions): MCPConfigSchema {
       try {
         const parsed = yaml.load(content, {
           strict: options?.strict ?? true,
           schema: yaml.JSON_SCHEMA
         });
         return this.validateConfig(parsed);
       } catch (error) {
         throw new ConfigValidationError(`Invalid YAML: ${error.message}`);
       }
     }
   }
   ```

3. **Update RoleManager for YAML**
   ```typescript
   // src/roles/manager.ts
   async loadFromFile(filePath: string): Promise<RolesSchema> {
     const format = this.detectFormat(filePath);
     // Similar implementation
   }
   ```

### Phase 5: YAML Config Examples

1. **mcpconfig.yaml**
   ```yaml
   version: "1.0"
   
   globalSettings:
     model: opus
     timeout: 30000
     permissionMode: ask
     temperature: 0.7
   
   mcpServers:
     file-system-mcp:
       permission: whitelist
       description: Local file system operations
       
     database-mcp:
       permission: ask
       allowedTools:
         - query
         - schema
       deniedTools:
         - admin
   
   tools:
     allowed:
       - Read
       - Write
       - Edit
     denied:
       - Bash
   ```

2. **roles.yaml**
   ```yaml
   version: "1.0"
   
   roles:
     developer:
       model: opus
       permissions:
         mode: acceptEdits
         tools:
           allowed:
             - Read
             - Write
             - Edit
             - Grep
       promptingTemplate: |
         You are a skilled ${language} developer.
         Focus on clean, maintainable code.
       context:
         temperature: 0.7
         
     seniorDeveloper:
       extends: developer
       permissions:
         tools:
           allowed:
             - Bash
       additionalContext:
         reviewCode: true
   ```

### Phase 6: Documentation Updates

1. **Update README.md**
   - Add YAML configuration section
   - Show side-by-side JSON/YAML examples
   
2. **Update API Documentation**
   - Document YAML support in ConfigLoader
   - Add YAML examples to fluent API docs

3. **Migration Guide**
   - How to convert JSON configs to YAML
   - Best practices for YAML configs
   - Common YAML pitfalls to avoid

## Technical Considerations

1. **Performance**
   - YAML parsing is slower than JSON
   - Consider caching parsed configs
   - Lazy load js-yaml only when needed

2. **Security**
   - Use safe YAML loading (no arbitrary code execution)
   - Validate all inputs against schema
   - Sanitize file paths

3. **Error Messages**
   - Provide line numbers for YAML errors
   - Suggest fixes for common mistakes
   - Clear format detection messages

4. **Backward Compatibility**
   - All existing JSON configs must continue working
   - No breaking changes to public API
   - Graceful fallbacks

## Success Criteria

1. All existing tests pass
2. 100% test coverage for YAML functionality
3. YAML configs produce identical results to JSON
4. Clear documentation and examples
5. No performance regression for JSON configs
6. Helpful error messages for YAML issues

## Timeline

1. **Day 1**: Organization and type definitions
2. **Day 2**: Write comprehensive tests
3. **Day 3**: Implement YAML parsing
4. **Day 4**: Create YAML examples and update scripts
5. **Day 5**: Documentation and final testing