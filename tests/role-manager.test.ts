import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleManager } from '../src/roles/manager.js';
import type { RoleDefinition, RolesConfig, ClaudeCodeOptions } from '../src/types.js';
import { promises as fs } from 'node:fs';

// Mock fs module
vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn(),
  }
}));

describe('RoleManager', () => {
  let manager: RoleManager;
  let mockReadFile: any;
  let mockAccess: any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new RoleManager();
    mockReadFile = vi.mocked(fs.readFile);
    mockAccess = vi.mocked(fs.access);
  });

  describe('Role Definition', () => {
    it('should add and retrieve a role', () => {
      const role: RoleDefinition = {
        name: 'dataAnalyst',
        model: 'opus',
        permissions: {
          mode: 'acceptEdits',
          mcpServers: {
            'database-mcp': 'whitelist'
          }
        }
      };
      
      manager.addRole(role);
      const retrieved = manager.getRole('dataAnalyst');
      
      expect(retrieved).toEqual(role);
    });

    it('should return undefined for non-existent role', () => {
      expect(manager.getRole('nonExistent')).toBeUndefined();
    });

    it('should override existing role', () => {
      const role1: RoleDefinition = {
        name: 'developer',
        model: 'sonnet',
        permissions: {}
      };
      
      const role2: RoleDefinition = {
        name: 'developer',
        model: 'opus',
        permissions: {}
      };
      
      manager.addRole(role1);
      manager.addRole(role2);
      
      expect(manager.getRole('developer')?.model).toBe('opus');
    });

    it('should list all role names', () => {
      manager.addRole({ name: 'role1', model: 'sonnet', permissions: {} });
      manager.addRole({ name: 'role2', model: 'opus', permissions: {} });
      manager.addRole({ name: 'role3', model: 'haiku', permissions: {} });
      
      const names = manager.listRoles();
      expect(names).toEqual(['role1', 'role2', 'role3']);
    });
  });

  describe('Loading from File', () => {
    it('should load roles from JSON file', async () => {
      const config: RolesConfig = {
        version: '1.0',
        roles: {
          dataAnalyst: {
            model: 'opus',
            permissions: {
              mcpServers: {
                'database-mcp': 'whitelist'
              }
            }
          },
          contentCreator: {
            model: 'sonnet',
            permissions: {
              tools: {
                allowed: ['Write', 'Edit']
              }
            }
          }
        }
      };
      
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(config));
      
      await manager.loadFromFile('/path/to/roles.json');
      
      expect(manager.getRole('dataAnalyst')).toBeDefined();
      expect(manager.getRole('contentCreator')).toBeDefined();
      expect(manager.getRole('dataAnalyst')?.name).toBe('dataAnalyst');
    });

    it('should handle file not found', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      
      await expect(manager.loadFromFile('/non/existent.json'))
        .rejects.toThrow('Roles file not found');
    });

    it('should validate roles on load', async () => {
      const invalidConfig = {
        version: '1.0',
        roles: {
          invalidRole: {
            // Missing required 'model' field
            permissions: {}
          }
        }
      };
      
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidConfig));
      
      await expect(manager.loadFromFile('/path/to/invalid.json'))
        .rejects.toThrow('Invalid role definition');
    });
  });

  describe('Role Application', () => {
    it('should apply role to options', () => {
      const role: RoleDefinition = {
        name: 'dataAnalyst',
        model: 'opus',
        permissions: {
          mode: 'acceptEdits',
          tools: {
            allowed: ['Read', 'Grep'],
            denied: ['Write', 'Edit']
          }
        },
        context: {
          maxTokens: 4000,
          temperature: 0.2
        }
      };
      
      manager.addRole(role);
      
      const options: ClaudeCodeOptions = {};
      const applied = manager.applyRole('dataAnalyst', options);
      
      expect(applied).toEqual({
        model: 'opus',
        permissionMode: 'acceptEdits',
        allowedTools: ['Read', 'Grep'],
        deniedTools: ['Write', 'Edit'],
        maxTokens: 4000,
        temperature: 0.2
      });
    });

    it('should apply MCP server permissions', () => {
      const role: RoleDefinition = {
        name: 'secureRole',
        model: 'sonnet',
        permissions: {
          mcpServers: {
            'file-system-mcp': 'whitelist',
            'external-api-mcp': 'blacklist'
          }
        }
      };
      
      manager.addRole(role);
      const applied = manager.applyRole('secureRole', {});
      
      expect(applied.mcpServerPermissions).toEqual({
        'file-system-mcp': 'whitelist',
        'external-api-mcp': 'blacklist'
      });
    });

    it('should apply prompting template', () => {
      const role: RoleDefinition = {
        name: 'assistant',
        model: 'sonnet',
        permissions: {},
        promptingTemplate: 'You are a helpful assistant specializing in ${domain}',
        systemPrompt: 'Always be concise and accurate.'
      };
      
      manager.addRole(role);
      const applied = manager.applyRole('assistant', {});
      
      expect(applied.systemPrompt).toBe('Always be concise and accurate.');
    });

    it('should throw error for non-existent role', () => {
      expect(() => manager.applyRole('nonExistent', {}))
        .toThrow("Role 'nonExistent' not found");
    });
  });

  describe('Role Inheritance', () => {
    it('should support single inheritance', () => {
      const parentRole: RoleDefinition = {
        name: 'baseAnalyst',
        model: 'sonnet',
        permissions: {
          mode: 'default',
          tools: {
            allowed: ['Read', 'Grep']
          }
        },
        context: {
          maxTokens: 2000
        }
      };
      
      const childRole: RoleDefinition = {
        name: 'seniorAnalyst',
        model: 'opus', // Override
        permissions: {
          tools: {
            allowed: ['Write'], // Should merge with parent
            denied: ['Bash']
          }
        },
        extends: 'baseAnalyst'
      };
      
      manager.addRole(parentRole);
      manager.addRole(childRole);
      
      const resolved = manager.resolveInheritance(childRole);
      
      expect(resolved.model).toBe('opus'); // Child overrides
      expect(resolved.permissions.mode).toBe('default'); // Inherited
      expect(resolved.permissions.tools?.allowed).toEqual(['Read', 'Grep', 'Write']); // Merged
      expect(resolved.permissions.tools?.denied).toEqual(['Bash']); // From child
      expect(resolved.context?.maxTokens).toBe(2000); // Inherited
    });

    it('should handle deep inheritance chains', () => {
      manager.addRole({
        name: 'grandparent',
        model: 'haiku',
        permissions: { mode: 'default' },
        context: { temperature: 0.5 }
      });
      
      manager.addRole({
        name: 'parent',
        model: 'sonnet',
        extends: 'grandparent',
        context: { maxTokens: 3000 }
      });
      
      manager.addRole({
        name: 'child',
        model: 'opus',
        extends: 'parent',
        permissions: { mode: 'acceptEdits' }
      });
      
      const resolved = manager.resolveInheritance(manager.getRole('child')!);
      
      expect(resolved.model).toBe('opus');
      expect(resolved.permissions.mode).toBe('acceptEdits');
      expect(resolved.context).toEqual({
        temperature: 0.5, // From grandparent
        maxTokens: 3000   // From parent
      });
    });

    it('should detect circular inheritance', () => {
      manager.addRole({
        name: 'roleA',
        model: 'sonnet',
        permissions: {},
        extends: 'roleB'
      });
      
      manager.addRole({
        name: 'roleB',
        model: 'sonnet',
        permissions: {},
        extends: 'roleA'
      });
      
      expect(() => manager.resolveInheritance(manager.getRole('roleA')!))
        .toThrow('Circular inheritance detected');
    });

    it('should throw error for non-existent parent', () => {
      const role: RoleDefinition = {
        name: 'orphan',
        model: 'sonnet',
        permissions: {},
        extends: 'nonExistentParent'
      };
      
      manager.addRole(role);
      
      expect(() => manager.resolveInheritance(role))
        .toThrow("Parent role 'nonExistentParent' not found");
    });
  });

  describe('Role Validation', () => {
    it('should validate required fields', () => {
      const valid: RoleDefinition = {
        name: 'valid',
        model: 'sonnet',
        permissions: {}
      };
      
      const result = manager.validateRole(valid);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect missing model', () => {
      const invalid: any = {
        name: 'invalid',
        permissions: {}
      };
      
      const result = manager.validateRole(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Role must specify a model');
    });

    it('should validate model values', () => {
      const invalid: RoleDefinition = {
        name: 'invalid',
        model: 'gpt-4' as any, // Invalid model
        permissions: {}
      };
      
      const result = manager.validateRole(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid model 'gpt-4'");
    });

    it('should validate permission mode', () => {
      const invalid: any = {
        name: 'invalid',
        model: 'sonnet',
        permissions: {
          mode: 'superuser' // Invalid mode
        }
      };
      
      const result = manager.validateRole(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid permission mode');
    });

    it('should validate context values', () => {
      const role: RoleDefinition = {
        name: 'contextRole',
        model: 'sonnet',
        permissions: {},
        context: {
          temperature: 1.5, // Too high
          maxTokens: -100 // Negative
        }
      };
      
      const result = manager.validateRole(role);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Temperature must be between 0 and 1');
      expect(result.errors).toContain('Max tokens must be positive');
    });

    it('should provide warnings for suboptimal configurations', () => {
      const role: RoleDefinition = {
        name: 'suboptimal',
        model: 'opus',
        permissions: {
          mode: 'bypassPermissions'
        },
        context: {
          temperature: 0.99 // Very high
        }
      };
      
      const result = manager.validateRole(role);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('bypassPermissions mode may pose security risks');
      expect(result.warnings).toContain('High temperature (0.99) may produce inconsistent results');
    });
  });

  describe('Prompting Template', () => {
    it('should interpolate template variables', () => {
      const role: RoleDefinition = {
        name: 'specialist',
        model: 'sonnet',
        permissions: {},
        promptingTemplate: 'You are an expert in ${domain} focusing on ${task}'
      };
      
      manager.addRole(role);
      
      const prompt = manager.getPromptingTemplate('specialist', {
        domain: 'machine learning',
        task: 'model optimization'
      });
      
      expect(prompt).toBe('You are an expert in machine learning focusing on model optimization');
    });

    it('should handle missing template variables', () => {
      const role: RoleDefinition = {
        name: 'specialist',
        model: 'sonnet',
        permissions: {},
        promptingTemplate: 'Expert in ${domain}'
      };
      
      manager.addRole(role);
      
      expect(() => manager.getPromptingTemplate('specialist', {}))
        .toThrow('Missing template variable: domain');
    });

    it('should combine system prompt and template', () => {
      const role: RoleDefinition = {
        name: 'combo',
        model: 'sonnet',
        permissions: {},
        systemPrompt: 'Be concise.',
        promptingTemplate: 'You are a ${role} assistant.'
      };
      
      manager.addRole(role);
      
      const fullPrompt = manager.getFullPrompt('combo', { role: 'technical' }, 'Help me debug');
      
      expect(fullPrompt).toBe('Be concise.\n\nYou are a technical assistant.\n\nHelp me debug');
    });
  });

  describe('Configuration Export', () => {
    it('should export roles configuration', () => {
      manager.addRole({
        name: 'role1',
        model: 'sonnet',
        permissions: {}
      });
      
      manager.addRole({
        name: 'role2',
        model: 'opus',
        permissions: {},
        extends: 'role1'
      });
      
      const config = manager.exportConfig();
      
      expect(config).toEqual({
        version: '1.0',
        roles: {
          role1: {
            model: 'sonnet',
            permissions: {}
          },
          role2: {
            model: 'opus',
            permissions: {},
            extends: 'role1'
          }
        }
      });
    });

    it('should set default role in export', () => {
      manager.addRole({
        name: 'default',
        model: 'sonnet',
        permissions: {}
      });
      
      manager.setDefaultRole('default');
      const config = manager.exportConfig();
      
      expect(config.defaultRole).toBe('default');
    });
  });

  describe('Fluent API Integration', () => {
    it('should support method chaining', () => {
      const result = manager
        .addRole({
          name: 'analyst',
          model: 'opus',
          permissions: {}
        })
        .addRole({
          name: 'developer',
          model: 'sonnet',
          permissions: {}
        })
        .setDefaultRole('analyst');
      
      expect(result).toBe(manager);
      expect(manager.getDefaultRole()).toBe('analyst');
    });
  });
});