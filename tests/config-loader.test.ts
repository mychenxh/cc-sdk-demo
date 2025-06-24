import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigLoader } from '../src/config/loader.js';
import type { MCPConfigSchema, ClaudeCodeOptions } from '../src/types.js';
import { promises as fs } from 'node:fs';

// Mock fs module
vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn(),
  }
}));

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let mockReadFile: any;
  let mockAccess: any;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = new ConfigLoader();
    mockReadFile = vi.mocked(fs.readFile);
    mockAccess = vi.mocked(fs.access);
  });

  describe('Loading Configuration Files', () => {
    it('should load valid configuration from file', async () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        mcpServers: {
          'file-system-mcp': {
            defaultPermission: 'ask',
            tools: {
              'Read': 'allow',
              'Write': 'deny'
            }
          }
        }
      };
      
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(config));
      
      const loaded = await loader.loadFromFile('/path/to/config.json');
      expect(loaded).toEqual(config);
    });

    it('should throw error for non-existent file', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      
      await expect(loader.loadFromFile('/non/existent.json'))
        .rejects.toThrow('Configuration file not found');
    });

    it('should throw error for invalid JSON', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('invalid json');
      
      await expect(loader.loadFromFile('/path/to/invalid.json'))
        .rejects.toThrow('Invalid JSON in configuration file');
    });

    it('should support different file encodings', async () => {
      const config: MCPConfigSchema = { version: '1.0' };
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(Buffer.from(JSON.stringify(config), 'utf16le'));
      
      const loaded = await loader.loadFromFile('/path/to/config.json', { encoding: 'utf16le' });
      expect(loaded).toEqual(config);
    });
  });

  describe('Schema Validation', () => {
    it('should validate configuration against schema', () => {
      const validConfig: MCPConfigSchema = {
        version: '1.0',
        mcpServers: {
          'test-mcp': {
            defaultPermission: 'allow'
          }
        }
      };
      
      expect(() => loader.validateConfig(validConfig)).not.toThrow();
    });

    it('should throw error for missing version', () => {
      const invalidConfig = {
        mcpServers: {}
      };
      
      expect(() => loader.validateConfig(invalidConfig))
        .toThrow('Configuration must include version');
    });

    it('should throw error for invalid version', () => {
      const invalidConfig = {
        version: '2.0',
        mcpServers: {}
      };
      
      expect(() => loader.validateConfig(invalidConfig))
        .toThrow('Unsupported configuration version');
    });

    it('should validate permission values', () => {
      const invalidConfig: any = {
        version: '1.0',
        mcpServers: {
          'test-mcp': {
            defaultPermission: 'invalid'
          }
        }
      };
      
      expect(() => loader.validateConfig(invalidConfig))
        .toThrow('Invalid permission value');
    });

    it('should validate tool permissions', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        mcpServers: {
          'test-mcp': {
            defaultPermission: 'ask',
            tools: {
              'Read': 'allow',
              'Write': 'deny',
              'Edit': 'ask'
            }
          }
        }
      };
      
      expect(() => loader.validateConfig(config)).not.toThrow();
    });

    it('should validate global settings', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        globalSettings: {
          defaultToolPermission: 'ask',
          permissionMode: 'acceptEdits',
          model: 'sonnet',
          timeout: 30000,
          cwd: '/working/dir'
        }
      };
      
      expect(() => loader.validateConfig(config)).not.toThrow();
    });

    it('should allow partial configurations', () => {
      const minimalConfig: MCPConfigSchema = {
        version: '1.0'
      };
      
      expect(() => loader.validateConfig(minimalConfig)).not.toThrow();
    });
  });

  describe('Merging Configurations', () => {
    it('should merge config with options', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        globalSettings: {
          model: 'sonnet',
          timeout: 30000
        }
      };
      
      const options: ClaudeCodeOptions = {
        model: 'opus',
        debug: true
      };
      
      const merged = loader.mergeWithOptions(config, options);
      
      expect(merged).toEqual({
        model: 'sonnet', // Config takes precedence
        timeout: 30000,
        debug: true
      });
    });

    it('should apply MCP server permissions', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        mcpServers: {
          'file-system-mcp': {
            defaultPermission: 'allow'
          },
          'database-mcp': {
            defaultPermission: 'deny'
          }
        }
      };
      
      const merged = loader.mergeWithOptions(config, {});
      
      expect(merged.mcpServerPermissions).toEqual({
        'file-system-mcp': 'whitelist',
        'database-mcp': 'blacklist'
      });
    });

    it('should merge tool permissions', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        tools: {
          allowed: ['Read', 'Write'],
          denied: ['Bash']
        }
      };
      
      const options: ClaudeCodeOptions = {
        allowedTools: ['Edit'],
        deniedTools: ['WebSearch']
      };
      
      const merged = loader.mergeWithOptions(config, options);
      
      expect(merged.allowedTools).toEqual(['Read', 'Write', 'Edit']);
      expect(merged.deniedTools).toEqual(['Bash', 'WebSearch']);
    });

    it('should handle precedence correctly', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        globalSettings: {
          permissionMode: 'acceptEdits'
        }
      };
      
      const options: ClaudeCodeOptions = {
        permissionMode: 'bypassPermissions'
      };
      
      const merged = loader.mergeWithOptions(config, options, { configPrecedence: true });
      expect(merged.permissionMode).toBe('acceptEdits');
      
      const mergedOptionsPrecedence = loader.mergeWithOptions(config, options, { configPrecedence: false });
      expect(mergedOptionsPrecedence.permissionMode).toBe('bypassPermissions');
    });
  });

  describe('Environment Variable Support', () => {
    it('should expand environment variables in config', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        globalSettings: {
          cwd: '${HOME}/projects',
          env: {
            API_KEY: '${MY_API_KEY}'
          }
        }
      };
      
      process.env.HOME = '/users/test';
      process.env.MY_API_KEY = 'secret123';
      
      const expanded = loader.expandEnvironmentVariables(config);
      
      expect(expanded.globalSettings?.cwd).toBe('/users/test/projects');
      expect(expanded.globalSettings?.env?.API_KEY).toBe('secret123');
    });

    it('should handle missing environment variables', () => {
      const config: MCPConfigSchema = {
        version: '1.0',
        globalSettings: {
          cwd: '${MISSING_VAR}/path'
        }
      };
      
      delete process.env.MISSING_VAR;
      
      expect(() => loader.expandEnvironmentVariables(config))
        .toThrow('Environment variable MISSING_VAR not found');
    });
  });

  describe('Configuration Inheritance', () => {
    it('should support extending other config files', async () => {
      const baseConfig: MCPConfigSchema = {
        version: '1.0',
        globalSettings: {
          model: 'sonnet',
          timeout: 30000
        }
      };
      
      const extendedConfig = {
        version: '1.0',
        extends: './base-config.json',
        globalSettings: {
          model: 'opus'
        }
      };
      
      // Mock both file reads
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(extendedConfig))
        .mockResolvedValueOnce(JSON.stringify(baseConfig));
      
      const loaded = await loader.loadFromFile('/path/to/extended.json');
      
      expect(loaded.globalSettings).toEqual({
        model: 'opus', // Override from extended
        timeout: 30000 // Inherited from base
      });
    });

    it('should support multiple levels of inheritance', async () => {
      // Test deep inheritance chain
      const grandparentConfig: MCPConfigSchema = {
        version: '1.0',
        globalSettings: { model: 'haiku' }
      };
      
      const parentConfig = {
        version: '1.0',
        extends: './grandparent.json',
        globalSettings: { timeout: 20000 }
      };
      
      const childConfig = {
        version: '1.0',
        extends: './parent.json',
        globalSettings: { debug: true }
      };
      
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(childConfig))
        .mockResolvedValueOnce(JSON.stringify(parentConfig))
        .mockResolvedValueOnce(JSON.stringify(grandparentConfig));
      
      const loaded = await loader.loadFromFile('/path/to/child.json');
      
      expect(loaded.globalSettings).toEqual({
        model: 'haiku',
        timeout: 20000,
        debug: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error messages', async () => {
      const invalidConfig = {
        version: '1.0',
        mcpServers: {
          'test-mcp': {
            defaultPermission: 'maybe' // Invalid value
          }
        }
      };
      
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidConfig));
      
      await expect(loader.loadFromFile('/path/to/config.json'))
        .rejects.toThrow(/Invalid permission value.*maybe.*at mcpServers\.test-mcp\.defaultPermission/);
    });

    it('should handle circular inheritance', async () => {
      const configA = {
        version: '1.0',
        extends: './config-b.json'
      };
      
      const configB = {
        version: '1.0',
        extends: './config-a.json'
      };
      
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(configA))
        .mockResolvedValueOnce(JSON.stringify(configB));
      
      await expect(loader.loadFromFile('/path/to/config-a.json'))
        .rejects.toThrow('Circular inheritance detected');
    });
  });
});