import { claude } from '@instantlyeasy/claude-code-sdk-ts';

/**
 * Comprehensive examples of new Claude Code SDK features:
 * 1. MCP Server-Level Permission Management
 * 2. Configuration File Support
 * 3. Roles/Personas System
 */

// Example 1: MCP Server-Level Permissions
async function mcpPermissionsExample() {
  console.log('=== MCP Server-Level Permissions Example ===\n');
  
  // Simple MCP server permissions
  const response1 = await claude()
    .withMCPServerPermission('file-system-mcp', 'whitelist')
    .withMCPServerPermission('database-mcp', 'ask')
    .withMCPServerPermission('external-api-mcp', 'blacklist')
    .query('List all files in the current directory')
    .asText();
  
  console.log('With MCP permissions:', response1);
  
  // Bulk MCP server permissions
  const response2 = await claude()
    .withMCPServerPermissions({
      'file-system-mcp': 'whitelist',
      'git-mcp': 'whitelist',
      'database-mcp': 'blacklist',
      'external-api-mcp': 'ask'
    })
    .query('Show git status and recent commits')
    .asText();
  
  console.log('\nWith bulk permissions:', response2);
}

// Example 2: Configuration File Support
async function configFileExample() {
  console.log('\n=== Configuration File Example ===\n');
  
  // First, let's create a sample config file
  const sampleConfig = {
    version: '1.0',
    globalSettings: {
      model: 'opus',
      timeout: 60000,
      permissionMode: 'acceptEdits',
      defaultToolPermission: 'ask'
    },
    mcpServers: {
      'file-system-mcp': {
        defaultPermission: 'allow',
        tools: {
          'Read': 'allow',
          'Write': 'deny',
          'Edit': 'ask'
        }
      },
      'database-mcp': {
        defaultPermission: 'deny',
        tools: {
          'Query': 'ask'
        }
      }
    },
    tools: {
      allowed: ['Read', 'Grep', 'LS'],
      denied: ['Bash', 'WebSearch']
    }
  };
  
  console.log('Sample config:', JSON.stringify(sampleConfig, null, 2));
  
  // Load config from file
  try {
    const response = await claude()
      .withConfigFile('./config/json/mcpconfig.json')
      .query('Analyze the project structure')
      .asText();
    
    console.log('\nWith config file:', response);
  } catch (error) {
    console.log('Config file not found, using inline config instead');
  }
  
  // Use inline configuration
  const response = await claude()
    .withConfig(sampleConfig)
    .query('Analyze the project structure')
    .asText();
  
  console.log('\nWith inline config:', response);
}

// Example 3: Roles/Personas System
async function rolesExample() {
  console.log('\n=== Roles/Personas Example ===\n');
  
  // Define roles inline
  const dataAnalystRole = {
    name: 'dataAnalyst',
    description: 'Expert data analyst focused on insights and patterns',
    model: 'opus',
    permissions: {
      mode: 'acceptEdits',
      mcpServers: {
        'database-mcp': 'whitelist',
        'visualization-mcp': 'whitelist'
      },
      tools: {
        allowed: ['Read', 'Query', 'Analyze', 'Visualize'],
        denied: ['Write', 'Edit', 'Delete']
      }
    },
    promptingTemplate: 'You are a ${domain} data analyst specializing in ${specialty}.',
    systemPrompt: 'Always provide data-driven insights with clear visualizations.',
    context: {
      maxTokens: 4000,
      temperature: 0.2,
      additionalContext: [
        'Focus on statistical significance',
        'Include confidence intervals where applicable'
      ]
    }
  };
  
  // Use role with template variables
  const response1 = await claude()
    .withRole(dataAnalystRole, {
      domain: 'financial',
      specialty: 'risk assessment'
    })
    .query('Analyze the quarterly revenue trends')
    .asText();
  
  console.log('Data Analyst response:', response1);
  
  // Content Creator role
  const contentCreatorRole = {
    name: 'contentCreator',
    model: 'sonnet',
    permissions: {
      mode: 'acceptEdits',
      tools: {
        allowed: ['Write', 'Edit', 'Read'],
        denied: ['Delete', 'Bash']
      }
    },
    promptingTemplate: 'You are a creative ${type} writer.',
    context: {
      temperature: 0.8,
      maxTokens: 8000
    }
  };
  
  const response2 = await claude()
    .withRole(contentCreatorRole, {
      type: 'technical blog'
    })
    .query('Write an introduction about TypeScript generics')
    .asText();
  
  console.log('\n\nContent Creator response:', response2);
}

// Example 4: Combined Features
async function combinedFeaturesExample() {
  console.log('\n\n=== Combined Features Example ===\n');
  
  // Create a comprehensive configuration
  const config = {
    version: '1.0',
    globalSettings: {
      timeout: 120000,
      cwd: process.cwd()
    }
  };
  
  // Create a secure developer role
  const secureDeveloperRole = {
    name: 'secureDeveloper',
    model: 'opus',
    permissions: {
      mode: 'default',
      mcpServers: {
        'file-system-mcp': 'whitelist',
        'git-mcp': 'whitelist',
        'database-mcp': 'ask',
        'external-api-mcp': 'blacklist'
      },
      tools: {
        allowed: ['Read', 'Write', 'Edit', 'Grep', 'Git'],
        denied: ['Bash', 'WebFetch']
      }
    },
    promptingTemplate: 'You are a security-conscious ${language} developer working on ${project}.',
    systemPrompt: 'Always follow secure coding practices and validate all inputs.',
    context: {
      temperature: 0.3,
      maxTokens: 6000
    }
  };
  
  // Combine all features
  const response = await claude()
    .withConfig(config)
    .withRole(secureDeveloperRole, {
      language: 'TypeScript',
      project: 'authentication system'
    })
    .withMCPServerPermission('logging-mcp', 'whitelist')
    .allowTools('TodoRead', 'TodoWrite')
    .debug(true)
    .onToolUse(tool => {
      console.log(`[Tool Used] ${tool.name}`);
    })
    .query('Review the authentication code for security vulnerabilities')
    .asText();
  
  console.log('Combined features response:', response);
}

// Example 5: Role Inheritance
async function roleInheritanceExample() {
  console.log('\n\n=== Role Inheritance Example ===\n');
  
  // Create a roles configuration with inheritance
  const rolesConfig = {
    version: '1.0',
    roles: {
      baseAnalyst: {
        model: 'sonnet',
        permissions: {
          mode: 'default',
          tools: {
            allowed: ['Read', 'Grep', 'Analyze']
          }
        },
        context: {
          temperature: 0.3
        }
      },
      seniorAnalyst: {
        extends: 'baseAnalyst',
        model: 'opus', // Override model
        permissions: {
          tools: {
            allowed: ['Write', 'Query'], // Adds to parent's tools
            denied: ['Delete']
          }
        },
        context: {
          maxTokens: 5000 // Add new property
        },
        promptingTemplate: 'You are a senior analyst with expertise in ${domain}.'
      },
      leadAnalyst: {
        extends: 'seniorAnalyst',
        permissions: {
          mode: 'acceptEdits', // Override permission mode
          mcpServers: {
            'database-mcp': 'whitelist',
            'reporting-mcp': 'whitelist'
          }
        },
        systemPrompt: 'Provide executive-level insights and recommendations.'
      }
    },
    defaultRole: 'baseAnalyst'
  };
  
  // Simulate loading from file (using inline for demo)
  const builder = claude();
  
  // In real usage, you would load from file:
  // await builder.withRolesFile('./config/json/roles.json')
  
  // For demo, we'll add roles manually
  builder.withConfig({ version: '1.0' }); // Reset config
  
  // Note: In production, roles would be loaded from file
  // This is just for demonstration
  console.log('Role inheritance structure:', JSON.stringify(rolesConfig, null, 2));
}

// Example 6: Error Handling
async function errorHandlingExample() {
  console.log('\n\n=== Error Handling Example ===\n');
  
  try {
    // Invalid permission value
    await claude()
      .withMCPServerPermission('test-mcp', 'invalid' as any)
      .query('test');
  } catch (error) {
    console.log('Caught error:', error.message);
  }
  
  try {
    // Non-existent role
    await claude()
      .withRole('nonExistentRole')
      .query('test');
  } catch (error) {
    console.log('Caught error:', error.message);
  }
}

// Run all examples
async function main() {
  try {
    await mcpPermissionsExample();
    await configFileExample();
    await rolesExample();
    await combinedFeaturesExample();
    await roleInheritanceExample();
    await errorHandlingExample();
  } catch (error) {
    console.error('Demo error:', error);
  }
}

main();