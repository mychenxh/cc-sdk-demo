import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleManager } from '../src/roles/manager.js';
import { promises as fs } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn()
  }
}));

// Mock js-yaml
vi.mock('js-yaml', () => ({
  load: vi.fn(),
  JSON_SCHEMA: 'JSON_SCHEMA'
}));

describe('YAML Roles Configuration', () => {
  let roleManager: RoleManager;
  
  beforeEach(() => {
    roleManager = new RoleManager();
    vi.clearAllMocks();
  });
  
  describe('YAML Loading', () => {
    const validRolesYAML = `
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
          - LS
        denied:
          - Bash
          - WebSearch
    promptingTemplate: |
      You are a skilled \${language} developer.
      Focus on writing clean, maintainable code.
      Follow best practices and coding standards.
    context:
      temperature: 0.7
      maxTokens: 4000
      
  dataAnalyst:
    model: sonnet
    permissions:
      mode: default
      tools:
        allowed:
          - Read
          - Grep
          - WebFetch
    promptingTemplate: >
      You are a data analyst specializing in \${domain}.
      Provide insights based on data analysis.
    context:
      temperature: 0.5
      
  seniorDeveloper:
    extends: developer
    model: opus  # Override parent
    permissions:
      tools:
        allowed:
          - Bash  # Additional permission
    context:
      temperature: 0.8
      reviewCode: true
`;

    it('should load roles from YAML file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(validRolesYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        roles: {
          developer: {
            model: 'opus',
            permissions: {
              mode: 'acceptEdits',
              tools: {
                allowed: ['Read', 'Write', 'Edit', 'Grep', 'LS'],
                denied: ['Bash', 'WebSearch']
              }
            },
            promptingTemplate: 'You are a skilled ${language} developer.\\nFocus on writing clean, maintainable code.\\nFollow best practices and coding standards.\\n',
            context: { temperature: 0.7, maxTokens: 4000 }
          },
          dataAnalyst: {
            model: 'sonnet',
            permissions: {
              mode: 'default',
              tools: { allowed: ['Read', 'Grep', 'WebFetch'] }
            },
            promptingTemplate: 'You are a data analyst specializing in ${domain}. Provide insights based on data analysis.\\n',
            context: { temperature: 0.5 }
          },
          seniorDeveloper: {
            extends: 'developer',
            model: 'opus',
            permissions: { tools: { allowed: ['Bash'] } },
            context: { temperature: 0.8, reviewCode: true }
          }
        }
      });
      
      await roleManager.loadFromFile('/roles.yaml');
      
      expect(roleManager.hasRole('developer')).toBe(true);
      expect(roleManager.hasRole('dataAnalyst')).toBe(true);
      expect(roleManager.hasRole('seniorDeveloper')).toBe(true);
    });
    
    it('should handle role inheritance in YAML', async () => {
      const inheritanceYAML = `
version: "1.0"

roles:
  base: &base
    model: sonnet
    permissions:
      mode: default
      tools:
        allowed: [Read, Grep]
        
  developer:
    <<: *base
    model: opus  # Override
    permissions:
      mode: acceptEdits
      tools:
        allowed: [Read, Write, Edit]  # Override completely
        
  analyst:
    <<: *base
    # Inherits all from base
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(inheritanceYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        roles: {
          base: {
            model: 'sonnet',
            permissions: {
              mode: 'default',
              tools: { allowed: ['Read', 'Grep'] }
            }
          },
          developer: {
            model: 'opus',
            permissions: {
              mode: 'acceptEdits',
              tools: { allowed: ['Read', 'Write', 'Edit'] }
            }
          },
          analyst: {
            model: 'sonnet',
            permissions: {
              mode: 'default',
              tools: { allowed: ['Read', 'Grep'] }
            }
          }
        }
      });
      
      await roleManager.loadFromFile('/roles.yaml');
      
      const devRole = roleManager.getRole('developer');
      expect(devRole?.model).toBe('opus');
      expect(devRole?.permissions.mode).toBe('acceptEdits');
      
      const analystRole = roleManager.getRole('analyst');
      expect(analystRole?.model).toBe('sonnet');
    });
    
    it('should handle multi-line prompting templates', async () => {
      const templateYAML = `
version: "1.0"

roles:
  writer:
    model: opus
    permissions:
      mode: acceptEdits
    promptingTemplate: |
      You are a creative writer specializing in \${genre}.
      
      Guidelines:
      - Use vivid descriptions
      - Create compelling characters
      - Maintain consistent tone
      
      Style: \${style}
      Audience: \${audience}
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(templateYAML);
      
      const expectedTemplate = `You are a creative writer specializing in \${genre}.

Guidelines:
- Use vivid descriptions
- Create compelling characters
- Maintain consistent tone

Style: \${style}
Audience: \${audience}
`;
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        roles: {
          writer: {
            model: 'opus',
            permissions: { mode: 'acceptEdits' },
            promptingTemplate: expectedTemplate
          }
        }
      });
      
      await roleManager.loadFromFile('/roles.yaml');
      
      const template = roleManager.getPromptingTemplate('writer', {
        genre: 'science fiction',
        style: 'descriptive',
        audience: 'young adults'
      });
      
      expect(template).toContain('science fiction');
      expect(template).toContain('descriptive');
      expect(template).toContain('young adults');
    });
    
    it('should validate role definitions', async () => {
      const invalidRoleYAML = `
version: "1.0"

roles:
  invalidRole:
    # Missing required 'model' field
    permissions:
      mode: default
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(invalidRoleYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        roles: {
          invalidRole: {
            permissions: { mode: 'default' }
          }
        }
      });
      
      await expect(roleManager.loadFromFile('/roles.yaml'))
        .rejects.toThrow('Role "invalidRole" must have a model');
    });
    
    it('should handle complex context objects', async () => {
      const contextYAML = `
version: "1.0"

roles:
  researcher:
    model: opus
    permissions:
      mode: default
    context:
      temperature: 0.3
      maxTokens: 8000
      systemPrompt: |
        You are a research assistant.
        Always cite sources.
      customSettings:
        searchDepth: 5
        includeReferences: true
        outputFormat: markdown
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(contextYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        roles: {
          researcher: {
            model: 'opus',
            permissions: { mode: 'default' },
            context: {
              temperature: 0.3,
              maxTokens: 8000,
              systemPrompt: 'You are a research assistant.\\nAlways cite sources.\\n',
              customSettings: {
                searchDepth: 5,
                includeReferences: true,
                outputFormat: 'markdown'
              }
            }
          }
        }
      });
      
      await roleManager.loadFromFile('/roles.yaml');
      
      const role = roleManager.getRole('researcher');
      expect(role?.context?.temperature).toBe(0.3);
      expect(role?.context?.customSettings).toEqual({
        searchDepth: 5,
        includeReferences: true,
        outputFormat: 'markdown'
      });
    });
  });
  
  describe('YAML-specific Error Handling', () => {
    it('should provide clear error for YAML syntax errors', async () => {
      const invalidYAML = `
version: "1.0"
roles:
  developer:
    model: opus
      permissions:  # Bad indentation
        mode: default
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(invalidYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockImplementation(() => {
        throw new Error('bad indentation of a mapping entry at line 6');
      });
      
      await expect(roleManager.loadFromFile('/roles.yaml'))
        .rejects.toThrow(/Invalid YAML.*bad indentation/);
    });
    
    it('should handle circular inheritance', async () => {
      const circularYAML = `
version: "1.0"

roles:
  roleA:
    extends: roleB
    model: opus
    
  roleB:
    extends: roleC
    model: sonnet
    
  roleC:
    extends: roleA  # Circular!
    model: haiku
`;
      
      vi.mocked(fs.readFile).mockResolvedValue(circularYAML);
      
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        version: '1.0',
        roles: {
          roleA: { extends: 'roleB', model: 'opus' },
          roleB: { extends: 'roleC', model: 'sonnet' },
          roleC: { extends: 'roleA', model: 'haiku' }
        }
      });
      
      await roleManager.loadFromFile('/roles.yaml');
      
      // Circular inheritance is detected when applying the role
      expect(() => roleManager.applyRole('roleA', {}))
        .toThrow('Circular inheritance detected');
    });
  });
});