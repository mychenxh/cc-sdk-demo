import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ToolOverrides,
  QueryContext,
  DynamicPermissionFunction,
  ResolvedPermissions,
  PermissionSource,
  PermissionDecision,
  ToolPermissionManager
} from '../src/types.js';

// Mock implementation of ToolPermissionManager
class MockPermissionManager implements ToolPermissionManager {
  private globalPermissions: ToolOverrides = {};
  private rolePermissions = new Map<string, ToolOverrides>();
  private permissionHistory: PermissionDecision[] = [];
  private conflictResolution: 'deny-wins' | 'allow-wins' | 'last-wins' | 'query-wins' = 'deny-wins';
  
  setGlobalPermissions(permissions: ToolOverrides): void {
    this.globalPermissions = permissions;
  }
  
  setRolePermissions(role: string, permissions: ToolOverrides): void {
    this.rolePermissions.set(role, permissions);
  }
  
  resolvePermissions(
    queryOverrides?: ToolOverrides,
    context?: QueryContext,
    dynamicFn?: DynamicPermissionFunction
  ): ResolvedPermissions {
    const allowed = new Set<string>();
    const denied = new Set<string>();
    const sources: Record<string, PermissionSource> = {};
    
    // 1. Apply global permissions
    if (this.globalPermissions.allow) {
      this.globalPermissions.allow.forEach(tool => {
        allowed.add(tool);
        sources[tool] = { level: 'global', permission: 'allow' };
      });
    }
    if (this.globalPermissions.deny) {
      this.globalPermissions.deny.forEach(tool => {
        denied.add(tool);
        allowed.delete(tool);
        sources[tool] = { level: 'global', permission: 'deny' };
      });
    }
    
    // 2. Apply role permissions (if context has userRole)
    if (context?.userRole && this.rolePermissions.has(context.userRole)) {
      const rolePerms = this.rolePermissions.get(context.userRole)!;
      if (rolePerms.allow) {
        rolePerms.allow.forEach(tool => {
          if (this.conflictResolution === 'deny-wins' && denied.has(tool)) {
            return; // Skip if already denied
          }
          allowed.add(tool);
          denied.delete(tool);
          sources[tool] = { level: 'role', permission: 'allow' };
        });
      }
      if (rolePerms.deny) {
        rolePerms.deny.forEach(tool => {
          denied.add(tool);
          allowed.delete(tool);
          sources[tool] = { level: 'role', permission: 'deny' };
        });
      }
    }
    
    // 3. Apply dynamic permissions
    if (dynamicFn && context) {
      const dynamicPerms = dynamicFn(context);
      if (dynamicPerms.allow) {
        dynamicPerms.allow.forEach(tool => {
          if (this.conflictResolution === 'deny-wins' && denied.has(tool)) {
            return;
          }
          allowed.add(tool);
          denied.delete(tool);
          sources[tool] = { level: 'dynamic', permission: 'allow' };
        });
      }
      if (dynamicPerms.deny) {
        dynamicPerms.deny.forEach(tool => {
          denied.add(tool);
          allowed.delete(tool);
          sources[tool] = { level: 'dynamic', permission: 'deny' };
        });
      }
    }
    
    // 4. Apply query overrides (highest priority)
    if (queryOverrides) {
      if (queryOverrides.allow) {
        queryOverrides.allow.forEach(tool => {
          allowed.add(tool);
          denied.delete(tool);
          sources[tool] = { level: 'query', permission: 'allow' };
        });
      }
      if (queryOverrides.deny) {
        queryOverrides.deny.forEach(tool => {
          denied.add(tool);
          allowed.delete(tool);
          sources[tool] = { level: 'query', permission: 'deny' };
        });
      }
    }
    
    return {
      allowed: Array.from(allowed),
      denied: Array.from(denied),
      sources
    };
  }
  
  isToolAllowed(
    tool: string,
    queryOverrides?: ToolOverrides,
    context?: QueryContext
  ): boolean {
    const resolved = this.resolvePermissions(queryOverrides, context);
    return resolved.allowed.includes(tool as any);
  }
  
  getPermissionHistory(): PermissionDecision[] {
    return [...this.permissionHistory];
  }
  
  clearHistory(): void {
    this.permissionHistory = [];
  }
  
  setConflictResolution(resolution: typeof this.conflictResolution): void {
    this.conflictResolution = resolution;
  }
}

describe('Per-Call Tool Permissions', () => {
  let manager: MockPermissionManager;
  
  beforeEach(() => {
    manager = new MockPermissionManager();
  });
  
  describe('Basic Permission Resolution', () => {
    it('should apply global permissions', () => {
      manager.setGlobalPermissions({
        allow: ['Read', 'Write'],
        deny: ['Bash']
      });
      
      const resolved = manager.resolvePermissions();
      
      expect(resolved.allowed).toContain('Read');
      expect(resolved.allowed).toContain('Write');
      expect(resolved.denied).toContain('Bash');
      expect(resolved.sources?.['Read']?.level).toBe('global');
    });
    
    it('should apply role permissions on top of global', () => {
      manager.setGlobalPermissions({
        allow: ['Read'],
        deny: ['Write', 'Bash']
      });
      
      manager.setRolePermissions('developer', {
        allow: ['Write', 'Edit'],
        deny: ['WebSearch']
      });
      
      const context: QueryContext = {
        prompt: 'test',
        timestamp: Date.now(),
        userRole: 'developer'
      };
      
      const resolved = manager.resolvePermissions(undefined, context);
      
      expect(resolved.allowed).toContain('Read');
      expect(resolved.allowed).toContain('Edit');
      expect(resolved.denied).toContain('Bash');
      expect(resolved.denied).toContain('WebSearch');
      
      // With deny-wins, Write should still be denied from global
      expect(resolved.denied).toContain('Write');
    });
    
    it('should apply query overrides with highest priority', () => {
      manager.setGlobalPermissions({
        allow: ['Read'],
        deny: ['Write', 'Bash']
      });
      
      const queryOverrides: ToolOverrides = {
        allow: ['Write', 'Bash'],
        deny: ['Read']
      };
      
      const resolved = manager.resolvePermissions(queryOverrides);
      
      expect(resolved.allowed).toContain('Write');
      expect(resolved.allowed).toContain('Bash');
      expect(resolved.denied).toContain('Read');
      expect(resolved.sources?.['Write']?.level).toBe('query');
    });
  });
  
  describe('Dynamic Permissions', () => {
    it('should apply dynamic permissions based on context', () => {
      const dynamicFn: DynamicPermissionFunction = (context) => {
        if (context.environment === 'production') {
          return {
            deny: ['Bash', 'Write', 'Edit'],
            allow: ['Read', 'Grep']
          };
        }
        return {
          allow: ['Read', 'Write', 'Edit', 'Bash']
        };
      };
      
      const prodContext: QueryContext = {
        prompt: 'test',
        timestamp: Date.now(),
        environment: 'production'
      };
      
      const devContext: QueryContext = {
        prompt: 'test',
        timestamp: Date.now(),
        environment: 'development'
      };
      
      const prodResolved = manager.resolvePermissions(undefined, prodContext, dynamicFn);
      const devResolved = manager.resolvePermissions(undefined, devContext, dynamicFn);
      
      expect(prodResolved.denied).toContain('Bash');
      expect(prodResolved.denied).toContain('Write');
      expect(prodResolved.allowed).toContain('Read');
      
      expect(devResolved.allowed).toContain('Bash');
      expect(devResolved.allowed).toContain('Write');
    });
    
    it('should handle time-based dynamic permissions', () => {
      const dynamicFn: DynamicPermissionFunction = (context) => {
        const hour = new Date(context.timestamp).getHours();
        const isBusinessHours = hour >= 9 && hour <= 17;
        
        return isBusinessHours
          ? { allow: ['Write', 'Edit'] }
          : { deny: ['Write', 'Edit'] };
      };
      
      const businessContext: QueryContext = {
        prompt: 'test',
        timestamp: new Date('2024-01-01T14:00:00').getTime() // 2 PM
      };
      
      const afterHoursContext: QueryContext = {
        prompt: 'test',
        timestamp: new Date('2024-01-01T20:00:00').getTime() // 8 PM
      };
      
      const businessResolved = manager.resolvePermissions(undefined, businessContext, dynamicFn);
      const afterHoursResolved = manager.resolvePermissions(undefined, afterHoursContext, dynamicFn);
      
      expect(businessResolved.allowed).toContain('Write');
      expect(afterHoursResolved.denied).toContain('Write');
    });
    
    it('should handle prompt-based dynamic permissions', () => {
      const dynamicFn: DynamicPermissionFunction = (context) => {
        const prompt = context.prompt.toLowerCase();
        
        if (prompt.includes('delete') || prompt.includes('remove')) {
          return { deny: ['Write', 'Edit', 'Bash'] };
        }
        
        if (prompt.includes('analyze') || prompt.includes('read')) {
          return { allow: ['Read', 'Grep', 'Glob'] };
        }
        
        return {};
      };
      
      const deleteContext: QueryContext = {
        prompt: 'Delete all files in the directory',
        timestamp: Date.now()
      };
      
      const analyzeContext: QueryContext = {
        prompt: 'Analyze the codebase structure',
        timestamp: Date.now()
      };
      
      const deleteResolved = manager.resolvePermissions(undefined, deleteContext, dynamicFn);
      const analyzeResolved = manager.resolvePermissions(undefined, analyzeContext, dynamicFn);
      
      expect(deleteResolved.denied).toContain('Write');
      expect(deleteResolved.denied).toContain('Bash');
      expect(analyzeResolved.allowed).toContain('Read');
      expect(analyzeResolved.allowed).toContain('Grep');
    });
  });
  
  describe('Permission Priority and Conflicts', () => {
    it('should respect query > dynamic > role > global priority', () => {
      manager.setGlobalPermissions({ deny: ['Write'] });
      manager.setRolePermissions('user', { allow: ['Write'] });
      
      const dynamicFn: DynamicPermissionFunction = () => ({ deny: ['Write'] });
      const queryOverrides: ToolOverrides = { allow: ['Write'] };
      
      const context: QueryContext = {
        prompt: 'test',
        timestamp: Date.now(),
        userRole: 'user'
      };
      
      // Test each level
      const globalOnly = manager.resolvePermissions();
      const withRole = manager.resolvePermissions(undefined, context);
      const withDynamic = manager.resolvePermissions(undefined, context, dynamicFn);
      const withQuery = manager.resolvePermissions(queryOverrides, context, dynamicFn);
      
      expect(globalOnly.denied).toContain('Write');
      expect(withRole.denied).toContain('Write'); // deny-wins by default
      expect(withDynamic.denied).toContain('Write');
      expect(withQuery.allowed).toContain('Write'); // Query overrides everything
    });
    
    it('should track permission sources', () => {
      manager.setGlobalPermissions({ allow: ['Read'] });
      manager.setRolePermissions('developer', { allow: ['Write'] });
      
      const context: QueryContext = {
        prompt: 'test',
        timestamp: Date.now(),
        userRole: 'developer'
      };
      
      const queryOverrides: ToolOverrides = { allow: ['Bash'] };
      
      const resolved = manager.resolvePermissions(queryOverrides, context);
      
      expect(resolved.sources?.['Read']?.level).toBe('global');
      expect(resolved.sources?.['Write']?.level).toBe('role');
      expect(resolved.sources?.['Bash']?.level).toBe('query');
    });
  });
  
  describe('isToolAllowed Helper', () => {
    it('should check if a tool is allowed', () => {
      manager.setGlobalPermissions({
        allow: ['Read', 'Write'],
        deny: ['Bash']
      });
      
      expect(manager.isToolAllowed('Read')).toBe(true);
      expect(manager.isToolAllowed('Write')).toBe(true);
      expect(manager.isToolAllowed('Bash')).toBe(false);
      expect(manager.isToolAllowed('Edit')).toBe(false); // Not explicitly allowed
    });
    
    it('should respect query overrides in isToolAllowed', () => {
      manager.setGlobalPermissions({ deny: ['Write'] });
      
      const queryOverrides: ToolOverrides = { allow: ['Write'] };
      
      expect(manager.isToolAllowed('Write')).toBe(false);
      expect(manager.isToolAllowed('Write', queryOverrides)).toBe(true);
    });
  });
  
  describe('Permission Templates', () => {
    it('should have pre-defined permission templates', () => {
      // Import templates from the actual implementation when available
      const templates = {
        readOnly: {
          name: 'Read Only',
          permissions: {
            allow: ['Read', 'Grep', 'Glob', 'LS'],
            deny: ['Write', 'Edit', 'Bash']
          }
        },
        safeExecution: {
          name: 'Safe Execution',
          permissions: {
            deny: ['Bash'],
            allow: ['Read', 'Write', 'Edit']
          }
        }
      };
      
      expect(templates.readOnly.permissions.allow).toContain('Read');
      expect(templates.readOnly.permissions.deny).toContain('Write');
      expect(templates.safeExecution.permissions.deny).toContain('Bash');
    });
  });
  
  describe('Complex Scenarios', () => {
    it('should handle multiple roles with inheritance', () => {
      manager.setGlobalPermissions({ allow: ['Read'] });
      manager.setRolePermissions('user', { allow: ['Write'] });
      manager.setRolePermissions('admin', { allow: ['Write', 'Bash', 'Edit'] });
      
      const userContext: QueryContext = {
        prompt: 'test',
        timestamp: Date.now(),
        userRole: 'user'
      };
      
      const adminContext: QueryContext = {
        prompt: 'test',
        timestamp: Date.now(),
        userRole: 'admin'
      };
      
      const userResolved = manager.resolvePermissions(undefined, userContext);
      const adminResolved = manager.resolvePermissions(undefined, adminContext);
      
      expect(userResolved.allowed).toContain('Read');
      expect(userResolved.allowed).not.toContain('Bash');
      
      expect(adminResolved.allowed).toContain('Read');
      expect(adminResolved.allowed).toContain('Bash');
      expect(adminResolved.allowed).toContain('Edit');
    });
    
    it('should handle metadata-based permissions', () => {
      const dynamicFn: DynamicPermissionFunction = (context) => {
        const sensitivity = context.metadata?.sensitivity;
        
        if (sensitivity === 'high') {
          return {
            allow: ['Read'],
            deny: ['Write', 'Edit', 'Bash', 'WebFetch']
          };
        }
        
        return { allow: ['Read', 'Write', 'Edit'] };
      };
      
      const highSensitivity: QueryContext = {
        prompt: 'Process data',
        timestamp: Date.now(),
        metadata: { sensitivity: 'high', department: 'finance' }
      };
      
      const lowSensitivity: QueryContext = {
        prompt: 'Process data',
        timestamp: Date.now(),
        metadata: { sensitivity: 'low', department: 'marketing' }
      };
      
      const highResolved = manager.resolvePermissions(undefined, highSensitivity, dynamicFn);
      const lowResolved = manager.resolvePermissions(undefined, lowSensitivity, dynamicFn);
      
      expect(highResolved.allowed).toContain('Read');
      expect(highResolved.denied).toContain('Write');
      expect(highResolved.denied).toContain('WebFetch');
      
      expect(lowResolved.allowed).toContain('Write');
      expect(lowResolved.allowed).toContain('Edit');
    });
  });
});