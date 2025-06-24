import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigLoader } from '../src/config/loader.js';
import { ConfigValidationError } from '../src/errors.js';
import type { MCPConfigSchema } from '../src/types.js';
import { promises as fs } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn()
  }
}));

// Mock js-yaml (will be implemented later)
vi.mock('js-yaml', () => ({
  load: vi.fn(),
  JSON_SCHEMA: 'JSON_SCHEMA'
}));

describe('YAML Configuration Support', () => {
  let configLoader: ConfigLoader;
  
  beforeEach(() => {
    configLoader = new ConfigLoader();
    vi.clearAllMocks();
    // Default mock for fs.access to succeed
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });
  
  describe('File Format Detection', () => {
    it('should detect .yaml extension', async () => {
      const filePath = '/path/to/config.yaml';
      vi.mocked(fs.readFile).mockResolvedValue('version: "1.0"');
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({ version: '1.0' });
      
      await configLoader.loadFromFile(filePath);
      
      // Should attempt to parse as YAML
      expect(vi.mocked(fs.readFile)).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(vi.mocked(yaml.load)).toHaveBeenCalled();
    });
    
    it('should detect .yml extension', async () => {
      const filePath = '/path/to/config.yml';
      vi.mocked(fs.readFile).mockResolvedValue('version: "1.0"');
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({ version: '1.0' });
      
      await configLoader.loadFromFile(filePath);
      
      expect(vi.mocked(fs.readFile)).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(vi.mocked(yaml.load)).toHaveBeenCalled();
    });
    
    it('should default to JSON for .json extension', async () => {
      const filePath = '/path/to/config.json';
      vi.mocked(fs.readFile).mockResolvedValue('{"version": "1.0"}');
      
      const result = await configLoader.loadFromFile(filePath);
      
      expect(result.version).toBe('1.0');
    });
    
    it('should default to JSON for unknown extensions', async () => {
      const filePath = '/path/to/config.txt';
      vi.mocked(fs.readFile).mockResolvedValue('{"version": "1.0"}');
      
      const result = await configLoader.loadFromFile(filePath);
      
      expect(result.version).toBe('1.0');
    });
    
    it('should respect format override option', async () => {
      const filePath = '/path/to/config.json';
      const yamlContent = 'version: "1.0"';
      vi.mocked(fs.readFile).mockResolvedValue(yamlContent);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({ version: '1.0' });
      
      // Force YAML parsing even though file has .json extension
      await configLoader.loadFromFile(filePath, { format: 'yaml' });
      
      // Verify YAML parser would be called
      expect(vi.mocked(fs.readFile)).toHaveBeenCalledWith(filePath, 'utf-8');
      expect(vi.mocked(yaml.load)).toHaveBeenCalled();
    });
  });
  
  describe('YAML Parsing', () => {
    const validYAMLConfig = `
version: "1.0"

globalSettings:
  model: opus
  timeout: 30000
  permissionMode: acceptEdits
  env:
    NODE_ENV: production
    DEBUG: "true"

mcpServers:
  file-system-mcp:
    defaultPermission: allow
    tools:
      Write: deny
      Delete: deny
      
  database-mcp:
    defaultPermission: ask
    
tools:
  allowed:
    - Read
    - Write
    - Edit
  denied:
    - Bash
    - WebSearch
`;

    it('should parse valid YAML config', async () => {
      const filePath = '/path/to/config.yaml';
      vi.mocked(fs.readFile).mockResolvedValue(validYAMLConfig);
      
      // Mock YAML parser response
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        globalSettings: {
          model: 'opus',
          timeout: 30000,
          permissionMode: 'acceptEdits',
          env: { NODE_ENV: 'production', DEBUG: 'true' }
        },
        mcpServers: {
          'file-system-mcp': {
            defaultPermission: 'allow',
            tools: { Write: 'deny', Delete: 'deny' }
          },
          'database-mcp': { defaultPermission: 'ask' }
        },
        tools: {
          allowed: ['Read', 'Write', 'Edit'],
          denied: ['Bash', 'WebSearch']
        }
      });
      
      const result = await configLoader.loadFromFile(filePath);
      
      expect(result.version).toBe('1.0');
      expect(result.globalSettings?.model).toBe('opus');
      expect(result.mcpServers?.['file-system-mcp']?.defaultPermission).toBe('allow');
      expect(result.tools?.allowed).toContain('Read');
    });
    
    it('should handle YAML anchors and references', async () => {
      const yamlWithAnchors = `
version: "1.0"

defaults: &defaults
  model: sonnet
  timeout: 30000

globalSettings:
  <<: *defaults
  permissionMode: ask
  
roles:
  developer:
    <<: *defaults
    model: opus  # Override
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(yamlWithAnchors);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        defaults: { model: 'sonnet', timeout: 30000 },
        globalSettings: { model: 'sonnet', timeout: 30000, permissionMode: 'ask' },
        roles: { developer: { model: 'opus', timeout: 30000 } }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml');
      
      expect(result.globalSettings?.model).toBe('sonnet');
      expect(result.globalSettings?.timeout).toBe(30000);
    });
    
    it('should preserve number and boolean types', async () => {
      const yamlWithTypes = `
version: "1.0"
globalSettings:
  timeout: 30000
  temperature: 0.7
  debug: true
  verbose: false
  maxTokens: "1000"  # String number
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(yamlWithTypes);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        globalSettings: {
          timeout: 30000,
          temperature: 0.7,
          debug: true,
          verbose: false,
          maxTokens: '1000'
        }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml');
      
      expect(typeof result.globalSettings?.timeout).toBe('number');
      expect(result.globalSettings?.timeout).toBe(30000);
    });
    
    it('should handle multi-line strings', async () => {
      const yamlWithMultiline = `
version: "1.0"
prompts:
  systemPrompt: |
    You are a helpful assistant.
    Follow these guidelines:
    - Be concise
    - Be accurate
  folded: >
    This is a long
    text that should
    be folded into
    a single line.
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(yamlWithMultiline);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        prompts: {
          systemPrompt: 'You are a helpful assistant.\\nFollow these guidelines:\\n- Be concise\\n- Be accurate\\n',
          folded: 'This is a long text that should be folded into a single line.\\n'
        }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml');
      
      expect(result).toBeDefined();
    });
    
    it('should handle comments in YAML', async () => {
      const yamlWithComments = `
# Main configuration file
version: "1.0"

globalSettings:
  model: opus  # Use the most capable model
  # timeout: 60000  # Commented out - use default
  permissionMode: ask
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(yamlWithComments);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        globalSettings: {
          model: 'opus',
          permissionMode: 'ask'
        }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml');
      
      expect(result.globalSettings?.model).toBe('opus');
      expect(result.globalSettings?.timeout).toBeUndefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should provide clear error for invalid YAML syntax', async () => {
      const invalidYAML = `
version: "1.0"
globalSettings:
  model: opus
    timeout: 30000  # Invalid indentation
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(invalidYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockImplementation(() => {
        throw new Error('bad indentation of a mapping entry at line 5, column 5');
      });
      
      await expect(configLoader.loadFromFile('/config.yaml'))
        .rejects.toThrow(ConfigValidationError);
      
      await expect(configLoader.loadFromFile('/config.yaml'))
        .rejects.toThrow(/Invalid YAML.*bad indentation/);
    });
    
    it('should handle missing required fields', async () => {
      const incompleteYAML = `
# Missing version field
globalSettings:
  model: opus
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(incompleteYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        globalSettings: { model: 'opus' }
      });
      
      await expect(configLoader.loadFromFile('/config.yaml'))
        .rejects.toThrow('Configuration must have a version field');
    });
    
    it('should validate against schema', async () => {
      const invalidConfig = `
version: "2.0"  # Unsupported version
globalSettings:
  model: invalid-model
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(invalidConfig);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '2.0',
        globalSettings: { model: 'invalid-model' }
      });
      
      await expect(configLoader.loadFromFile('/config.yaml'))
        .rejects.toThrow(/Unsupported configuration version/);
    });
    
    it('should handle file read errors', async () => {
      vi.mocked(fs.access).mockRejectedValue(Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }));
      
      await expect(configLoader.loadFromFile('/config.yaml'))
        .rejects.toThrow('Failed to read configuration file');
    });
    
    it('should use strict parsing by default', async () => {
      const duplicateKeys = `
version: "1.0"
globalSettings:
  model: opus
  model: sonnet  # Duplicate key
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(duplicateKeys);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockImplementation((content, options) => {
        expect(options?.strict).toBe(true);
        throw new Error('duplicated mapping key');
      });
      
      await expect(configLoader.loadFromFile('/config.yaml'))
        .rejects.toThrow('Invalid YAML: duplicated mapping key');
    });
    
    it('should allow non-strict parsing when specified', async () => {
      const duplicateKeys = `
version: "1.0"
globalSettings:
  model: opus
  model: sonnet  # Duplicate key - last wins
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(duplicateKeys);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        globalSettings: { model: 'sonnet' }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml', { strict: false });
      
      expect(result.globalSettings?.model).toBe('sonnet');
    });
  });
  
  describe('Feature Parity', () => {
    it('should load mcpconfig.yaml identically to JSON', async () => {
      const mcpconfigYAML = `
version: "1.0"

globalSettings:
  model: opus
  timeout: 30000
  permissionMode: ask
  defaultToolPermission: ask
  cwd: /tmp/workspace
  env:
    API_KEY: test-key
    DEBUG: "true"

mcpServers:
  file-system-mcp:
    defaultPermission: allow
    tools:
      Delete: deny
      Write: ask
      
  database-mcp:
    defaultPermission: deny
    tools:
      Query: allow
      
tools:
  allowed:
    - Read
    - Grep
    - LS
  denied:
    - Bash
    - WebSearch
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(mcpconfigYAML);
      
      const expectedConfig: MCPConfigSchema = {
        version: '1.0',
        globalSettings: {
          model: 'opus',
          timeout: 30000,
          permissionMode: 'ask',
          defaultToolPermission: 'ask',
          cwd: '/tmp/workspace',
          env: { API_KEY: 'test-key', DEBUG: 'true' }
        },
        mcpServers: {
          'file-system-mcp': {
            defaultPermission: 'allow',
            tools: { Delete: 'deny', Write: 'ask' }
          },
          'database-mcp': {
            defaultPermission: 'deny',
            tools: { Query: 'allow' }
          }
        },
        tools: {
          allowed: ['Read', 'Grep', 'LS'],
          denied: ['Bash', 'WebSearch']
        }
      };
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue(expectedConfig);
      
      const result = await configLoader.loadFromFile('/mcpconfig.yaml');
      
      expect(result).toEqual(expectedConfig);
    });
    
    it('should handle complex nested structures', async () => {
      const complexYAML = `
version: "1.0"

mcpServers:
  complex-mcp:
    defaultPermission: ask
    tools:
      Tool1:
        permission: allow
        config:
          nested:
            deeply:
              value: 42
      Tool2: deny
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(complexYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        mcpServers: {
          'complex-mcp': {
            defaultPermission: 'ask',
            tools: {
              Tool1: {
                permission: 'allow',
                config: { nested: { deeply: { value: 42 } } }
              },
              Tool2: 'deny'
            }
          }
        }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml');
      
      expect(result.mcpServers?.['complex-mcp']).toBeDefined();
    });
  });
  
  describe('YAML-specific features', () => {
    it('should handle null values correctly', async () => {
      const yamlWithNull = `
version: "1.0"
globalSettings:
  model: ~  # null
  timeout: null
  cwd: ''  # empty string, not null
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(yamlWithNull);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        globalSettings: {
          model: null,
          timeout: null,
          cwd: ''
        }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml');
      
      expect(result.globalSettings?.model).toBeNull();
      expect(result.globalSettings?.timeout).toBeNull();
      expect(result.globalSettings?.cwd).toBe('');
    });
    
    it('should handle arrays with different syntaxes', async () => {
      const yamlArrays = `
version: "1.0"
tools:
  allowed: [Read, Write, Edit]  # Flow style
  denied:  # Block style
    - Bash
    - WebSearch
    - WebFetch
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(yamlArrays);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        tools: {
          allowed: ['Read', 'Write', 'Edit'],
          denied: ['Bash', 'WebSearch', 'WebFetch']
        }
      });
      
      const result = await configLoader.loadFromFile('/config.yaml');
      
      expect(result.tools?.allowed).toHaveLength(3);
      expect(result.tools?.denied).toHaveLength(3);
    });
  });
});