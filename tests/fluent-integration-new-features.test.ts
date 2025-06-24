import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claude } from '../src/fluent.js';
import * as baseModule from '../src/index.js';
import { promises as fs } from 'node:fs';

// Mock the base query function and fs
vi.mock('../src/index.js', async () => {
  const actual = await vi.importActual('../src/index.js');
  return {
    ...actual,
    query: vi.fn()
  };
});

vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn(),
  }
}));

describe('Fluent API - New Features Integration', () => {
  let mockQuery: any;
  let mockReadFile: any;
  let mockAccess: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = vi.mocked(baseModule.query);
    mockReadFile = vi.mocked(fs.readFile);
    mockAccess = vi.mocked(fs.access);
  });

  describe('MCP Server-Level Permissions', () => {
    it('should set single MCP server permission', () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      claude()
        .withMCPServerPermission('file-system-mcp', 'whitelist')
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        mcpServerPermissions: {
          'file-system-mcp': 'whitelist'
        }
      }));
    });

    it('should chain multiple MCP server permissions', () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      claude()
        .withMCPServerPermission('file-system-mcp', 'whitelist')
        .withMCPServerPermission('database-mcp', 'ask')
        .withMCPServerPermission('external-api-mcp', 'blacklist')
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        mcpServerPermissions: {
          'file-system-mcp': 'whitelist',
          'database-mcp': 'ask',
          'external-api-mcp': 'blacklist'
        }
      }));
    });

    it('should set bulk MCP server permissions', () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      claude()
        .withMCPServerPermissions({
          'file-system-mcp': 'whitelist',
          'database-mcp': 'blacklist',
          'api-mcp': 'ask'
        })
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        mcpServerPermissions: {
          'file-system-mcp': 'whitelist',
          'database-mcp': 'blacklist',
          'api-mcp': 'ask'
        }
      }));
    });

    it('should combine with existing permission settings', () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      claude()
        .allowTools('Read', 'Write')
        .withMCPServerPermission('external-mcp', 'blacklist')
        .skipPermissions()
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        allowedTools: ['Read', 'Write'],
        permissionMode: 'bypassPermissions',
        mcpServerPermissions: {
          'external-mcp': 'blacklist'
        }
      }));
    });
  });

  describe('Configuration File Support', () => {
    it('should load configuration from file', async () => {
      const config = {
        version: '1.0',
        globalSettings: {
          model: 'opus',
          timeout: 30000
        },
        mcpServers: {
          'file-system-mcp': {
            defaultPermission: 'allow'
          }
        }
      };

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(config));
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      const builder = await claude()
        .withConfigFile('/path/to/config.json');
        
      builder.query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        model: 'opus',
        timeout: 30000,
        mcpServerPermissions: {
          'file-system-mcp': 'whitelist'
        }
      }));
    });

    it('should apply inline configuration', () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      claude()
        .withConfig({
          version: '1.0',
          globalSettings: {
            model: 'sonnet',
            permissionMode: 'acceptEdits'
          },
          tools: {
            allowed: ['Read', 'Grep'],
            denied: ['Bash']
          }
        })
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        model: 'sonnet',
        permissionMode: 'acceptEdits',
        allowedTools: ['Read', 'Grep'],
        deniedTools: ['Bash']
      }));
    });

    it('should merge file config with programmatic settings', async () => {
      const config = {
        version: '1.0',
        globalSettings: {
          model: 'opus',
          timeout: 30000
        }
      };

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(config));
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      const builder = await claude()
        .withConfigFile('/path/to/config.json');
        
      builder
        .debug(true) // Programmatic setting
        .withMCPServerPermission('new-mcp', 'ask') // Additional permission
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        model: 'opus',
        timeout: 30000,
        debug: true,
        mcpServerPermissions: {
          'new-mcp': 'ask'
        }
      }));
    });
  });

  describe('Roles/Personas System', () => {
    it('should load and apply a role', async () => {
      const rolesConfig = {
        version: '1.0',
        roles: {
          dataAnalyst: {
            model: 'opus',
            permissions: {
              mode: 'acceptEdits',
              mcpServers: {
                'database-mcp': 'whitelist'
              },
              tools: {
                allowed: ['Read', 'Grep', 'Query']
              }
            },
            context: {
              maxTokens: 4000,
              temperature: 0.2
            }
          }
        }
      };

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(rolesConfig));
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      const builder = await claude()
        .withRolesFile('/path/to/roles.json');
        
      builder
        .withRole('dataAnalyst')
        .query('Analyze sales data');

      expect(mockQuery).toHaveBeenCalledWith('Analyze sales data', expect.objectContaining({
        model: 'opus',
        permissionMode: 'acceptEdits',
        mcpServerPermissions: {
          'database-mcp': 'whitelist'
        },
        allowedTools: ['Read', 'Grep', 'Query'],
        maxTokens: 4000,
        temperature: 0.2
      }));
    });

    it('should apply role with prompting template', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      const roleDefinition = {
        name: 'specialist',
        model: 'sonnet',
        permissions: {},
        promptingTemplate: 'You are a ${domain} specialist.',
        systemPrompt: 'Always provide detailed explanations.'
      };

      claude()
        .withRole(roleDefinition, { domain: 'security' })
        .query('Explain authentication');

      expect(mockQuery).toHaveBeenCalledWith(
        'Always provide detailed explanations.\n\nYou are a security specialist.\n\nExplain authentication',
        expect.objectContaining({
          model: 'sonnet',
          systemPrompt: 'Always provide detailed explanations.'
        })
      );
    });

    it('should support role inheritance', async () => {
      const rolesConfig = {
        version: '1.0',
        roles: {
          baseAnalyst: {
            model: 'sonnet',
            permissions: {
              mode: 'default',
              tools: {
                allowed: ['Read', 'Grep']
              }
            },
            context: {
              temperature: 0.3
            }
          },
          seniorAnalyst: {
            extends: 'baseAnalyst',
            model: 'opus', // Override
            permissions: {
              tools: {
                allowed: ['Write'], // Merge with parent
                denied: ['Bash']
              }
            },
            context: {
              maxTokens: 5000 // Add new property
            }
          }
        }
      };

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(rolesConfig));
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      const builder = await claude()
        .withRolesFile('/path/to/roles.json');
        
      builder
        .withRole('seniorAnalyst')
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        model: 'opus',
        permissionMode: 'default',
        allowedTools: ['Read', 'Grep', 'Write'],
        deniedTools: ['Bash'],
        temperature: 0.3,
        maxTokens: 5000
      }));
    });
  });

  describe('Combined Features', () => {
    it('should combine all three features', async () => {
      // Configuration file
      const config = {
        version: '1.0',
        globalSettings: {
          timeout: 60000,
          cwd: '/project'
        }
      };

      // Roles file
      const rolesConfig = {
        version: '1.0',
        roles: {
          developer: {
            model: 'opus',
            permissions: {
              mode: 'acceptEdits',
              tools: {
                allowed: ['Read', 'Write', 'Edit']
              }
            }
          }
        }
      };

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(config))
        .mockResolvedValueOnce(JSON.stringify(rolesConfig));
      
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      const builder = await claude()
        .withConfigFile('/path/to/config.json');
        
      await builder.withRolesFile('/path/to/roles.json');
      
      builder
        .withRole('developer')
        .withMCPServerPermission('git-mcp', 'whitelist')
        .debug(true)
        .query('Implement new feature');

      expect(mockQuery).toHaveBeenCalledWith('Implement new feature', expect.objectContaining({
        // From config file
        timeout: 60000,
        cwd: '/project',
        // From role
        model: 'opus',
        permissionMode: 'acceptEdits',
        allowedTools: ['Read', 'Write', 'Edit'],
        // From direct API
        mcpServerPermissions: {
          'git-mcp': 'whitelist'
        },
        debug: true
      }));
    });

    it('should respect precedence rules', async () => {
      const config = {
        version: '1.0',
        globalSettings: {
          model: 'haiku',
          timeout: 30000
        }
      };

      const rolesConfig = {
        version: '1.0',
        roles: {
          analyst: {
            model: 'sonnet', // Should override config
            permissions: {
              mode: 'default'
            }
          }
        }
      };

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(config))
        .mockResolvedValueOnce(JSON.stringify(rolesConfig));
      
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      const builder = await claude()
        .withConfigFile('/path/to/config.json');
        
      await builder.withRolesFile('/path/to/roles.json');
      
      builder
        .withRole('analyst')
        .withModel('opus') // Should override role
        .withTimeout(15000) // Should override config
        .query('test');

      expect(mockQuery).toHaveBeenCalledWith('test', expect.objectContaining({
        model: 'opus', // Programmatic > Role > Config
        timeout: 15000, // Programmatic > Config
        permissionMode: 'default' // From role
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid MCP server permission gracefully', () => {
      expect(() => {
        claude()
          // @ts-expect-error Testing invalid value
          .withMCPServerPermission('test-mcp', 'invalid')
          .query('test');
      }).toThrow('Invalid permission value');
    });

    it('should handle config file errors', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      await expect(
        claude().withConfigFile('/non/existent.json')
      ).rejects.toThrow('Configuration file not found');
    });

    it('should handle role not found', async () => {
      const rolesConfig = {
        version: '1.0',
        roles: {}
      };

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(rolesConfig));

      const builder = await claude()
        .withRolesFile('/path/to/roles.json');
        
      expect(() => {
        builder.withRole('nonExistent');
      }).toThrow("Role 'nonExistent' not found");
    });
  });
});