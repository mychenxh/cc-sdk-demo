import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager } from '../src/permissions/manager.js';
import type { MCPServerPermission, MCPServerPermissionConfig } from '../src/types.js';

describe('PermissionManager', () => {
  let manager: PermissionManager;

  beforeEach(() => {
    manager = new PermissionManager();
  });

  describe('Basic MCP Server Permissions', () => {
    it('should set MCP server permission', () => {
      manager.setMCPServerPermission('file-system-mcp', 'whitelist');
      
      const permission = manager.getMCPServerPermission('file-system-mcp');
      expect(permission).toBe('whitelist');
    });

    it('should handle multiple MCP server permissions', () => {
      manager.setMCPServerPermission('file-system-mcp', 'whitelist');
      manager.setMCPServerPermission('database-mcp', 'blacklist');
      manager.setMCPServerPermission('api-mcp', 'ask');
      
      expect(manager.getMCPServerPermission('file-system-mcp')).toBe('whitelist');
      expect(manager.getMCPServerPermission('database-mcp')).toBe('blacklist');
      expect(manager.getMCPServerPermission('api-mcp')).toBe('ask');
    });

    it('should override existing permissions', () => {
      manager.setMCPServerPermission('test-mcp', 'whitelist');
      manager.setMCPServerPermission('test-mcp', 'blacklist');
      
      expect(manager.getMCPServerPermission('test-mcp')).toBe('blacklist');
    });

    it('should return undefined for non-existent server', () => {
      expect(manager.getMCPServerPermission('non-existent')).toBeUndefined();
    });

    it('should clear all permissions', () => {
      manager.setMCPServerPermission('server1', 'whitelist');
      manager.setMCPServerPermission('server2', 'blacklist');
      
      manager.clearMCPServerPermissions();
      
      expect(manager.getMCPServerPermission('server1')).toBeUndefined();
      expect(manager.getMCPServerPermission('server2')).toBeUndefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should set multiple permissions at once', () => {
      const permissions: MCPServerPermissionConfig = {
        'file-system-mcp': 'whitelist',
        'database-mcp': 'ask',
        'external-api-mcp': 'blacklist'
      };
      
      manager.setMCPServerPermissions(permissions);
      
      expect(manager.getMCPServerPermission('file-system-mcp')).toBe('whitelist');
      expect(manager.getMCPServerPermission('database-mcp')).toBe('ask');
      expect(manager.getMCPServerPermission('external-api-mcp')).toBe('blacklist');
    });

    it('should merge with existing permissions', () => {
      manager.setMCPServerPermission('existing-mcp', 'whitelist');
      
      manager.setMCPServerPermissions({
        'new-mcp': 'blacklist',
        'existing-mcp': 'ask'
      });
      
      expect(manager.getMCPServerPermission('existing-mcp')).toBe('ask');
      expect(manager.getMCPServerPermission('new-mcp')).toBe('blacklist');
    });
  });

  describe('Configuration Export', () => {
    it('should export current configuration', () => {
      manager.setMCPServerPermission('server1', 'whitelist');
      manager.setMCPServerPermission('server2', 'blacklist');
      
      const config = manager.exportConfig();
      
      expect(config).toEqual({
        'server1': 'whitelist',
        'server2': 'blacklist'
      });
    });

    it('should export empty object when no permissions set', () => {
      const config = manager.exportConfig();
      expect(config).toEqual({});
    });
  });

  describe('Permission Validation', () => {
    it('should validate permission values', () => {
      const validPermissions: MCPServerPermission[] = ['whitelist', 'blacklist', 'ask'];
      
      validPermissions.forEach(permission => {
        expect(() => {
          manager.setMCPServerPermission('test', permission);
        }).not.toThrow();
      });
    });

    it('should throw error for invalid permission value', () => {
      expect(() => {
        // @ts-expect-error Testing invalid value
        manager.setMCPServerPermission('test', 'invalid');
      }).toThrow('Invalid permission value');
    });

    it('should validate server name', () => {
      expect(() => {
        manager.setMCPServerPermission('', 'whitelist');
      }).toThrow('Server name cannot be empty');
    });
  });

  describe('Tool Resolution', () => {
    it('should resolve tool permission based on MCP server permission', () => {
      manager.setMCPServerPermission('file-system-mcp', 'whitelist');
      
      // Assuming the tool belongs to file-system-mcp
      const permission = manager.resolveToolPermission('Read', 'file-system-mcp');
      expect(permission).toBe('allow');
    });

    it('should map whitelist to allow', () => {
      manager.setMCPServerPermission('test-mcp', 'whitelist');
      expect(manager.resolveToolPermission('TestTool', 'test-mcp')).toBe('allow');
    });

    it('should map blacklist to deny', () => {
      manager.setMCPServerPermission('test-mcp', 'blacklist');
      expect(manager.resolveToolPermission('TestTool', 'test-mcp')).toBe('deny');
    });

    it('should map ask to ask', () => {
      manager.setMCPServerPermission('test-mcp', 'ask');
      expect(manager.resolveToolPermission('TestTool', 'test-mcp')).toBe('ask');
    });

    it('should return undefined for unknown server', () => {
      expect(manager.resolveToolPermission('TestTool', 'unknown-mcp')).toBeUndefined();
    });
  });

  describe('Integration with Options', () => {
    it('should merge permissions into ClaudeCodeOptions', () => {
      manager.setMCPServerPermission('server1', 'whitelist');
      manager.setMCPServerPermission('server2', 'blacklist');
      
      const options = manager.applyToOptions({
        model: 'sonnet',
        timeout: 5000
      });
      
      expect(options).toEqual({
        model: 'sonnet',
        timeout: 5000,
        mcpServerPermissions: {
          'server1': 'whitelist',
          'server2': 'blacklist'
        }
      });
    });

    it('should not override existing mcpServerPermissions if merge is false', () => {
      manager.setMCPServerPermission('new-server', 'whitelist');
      
      const options = manager.applyToOptions({
        mcpServerPermissions: {
          'existing-server': 'blacklist'
        }
      }, false);
      
      expect(options.mcpServerPermissions).toEqual({
        'new-server': 'whitelist'
      });
    });

    it('should merge with existing mcpServerPermissions by default', () => {
      manager.setMCPServerPermission('new-server', 'whitelist');
      
      const options = manager.applyToOptions({
        mcpServerPermissions: {
          'existing-server': 'blacklist'
        }
      });
      
      expect(options.mcpServerPermissions).toEqual({
        'existing-server': 'blacklist',
        'new-server': 'whitelist'
      });
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      manager.setMCPServerPermission('server1', 'whitelist');
      manager.setMCPServerPermission('server2', 'ask');
      
      const json = manager.toJSON();
      expect(JSON.parse(json)).toEqual({
        'server1': 'whitelist',
        'server2': 'ask'
      });
    });

    it('should deserialize from JSON', () => {
      const json = JSON.stringify({
        'server1': 'whitelist',
        'server2': 'blacklist'
      });
      
      manager.fromJSON(json);
      
      expect(manager.getMCPServerPermission('server1')).toBe('whitelist');
      expect(manager.getMCPServerPermission('server2')).toBe('blacklist');
    });

    it('should handle invalid JSON gracefully', () => {
      expect(() => {
        manager.fromJSON('invalid json');
      }).toThrow('Invalid JSON');
    });
  });
});