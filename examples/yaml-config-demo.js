import { claude } from '@instantlyeasy/claude-code-sdk-ts';

/**
 * YAML Configuration Demo
 * Demonstrates using YAML configuration files with the Claude Code SDK
 */

console.log('🔧 Claude Code SDK - YAML Configuration Demo\n');

// Example 1: Load YAML config file
console.log('1️⃣ Loading YAML configuration file...');
const builder = claude();
await builder.withConfigFile('./config/yaml/mcpconfig.yaml');

const result1 = await builder
  .query('List the permissions configured in the MCP config')
  .asText();

console.log(result1);
console.log('\n' + '='.repeat(80) + '\n');

// Example 2: Using YAML roles configuration
console.log('2️⃣ Loading roles from YAML...');
const roleBuilder = claude();
await roleBuilder.withRolesFile('./config/yaml/roles.yaml');

// Apply the data analyst role
roleBuilder.withRole('dataAnalyst', {
  domain: 'financial',
  specialty: 'risk analysis'
});

const result2 = await roleBuilder
  .query('Explain your role and capabilities')
  .asText();

console.log(result2);
console.log('\n' + '='.repeat(80) + '\n');

// Example 3: Combining YAML config with roles
console.log('3️⃣ Combining YAML config and roles...');
const combinedBuilder = claude();

// Load both config and roles
await combinedBuilder.withConfigFile('./config/yaml/mcpconfig.yaml');
await combinedBuilder.withRolesFile('./config/yaml/roles.yaml');

// Apply security auditor role
combinedBuilder.withRole('securityAuditor', {
  language: 'JavaScript',
  project: 'web-application'
});

const result3 = await combinedBuilder
  .query('What tools do I have access to for security auditing?')
  .asText();

console.log(result3);
console.log('\n' + '='.repeat(80) + '\n');

// Example 4: YAML vs JSON comparison
console.log('4️⃣ YAML vs JSON - Same configuration, different formats');

// Load JSON version
const jsonBuilder = claude();
await jsonBuilder.withConfigFile('./config/json/mcpconfig.json');

// Load YAML version
const yamlBuilder = claude();
await yamlBuilder.withConfigFile('./config/yaml/mcpconfig.yaml');

console.log('Both configurations loaded successfully!');
console.log('YAML provides better readability with:');
console.log('  - Comments for documentation');
console.log('  - Multi-line strings');
console.log('  - Cleaner syntax without quotes and commas');
console.log('  - Anchor/reference support for DRY configuration');

// Example 5: Environment variable substitution in YAML
console.log('\n5️⃣ Environment variables in YAML configuration');
console.log('The YAML config uses ${HOME} which will be expanded to:', process.env.HOME);

// Example 6: Show YAML advanced features
console.log('\n6️⃣ Advanced YAML features in roles.yaml:');
console.log('  - Role inheritance (seniorDeveloper extends developer)');
console.log('  - Multi-line prompting templates with |');
console.log('  - Arrays in both flow and block style');
console.log('  - Nested context objects');

// Example 7: Create a custom YAML config programmatically
console.log('\n7️⃣ Creating configuration for YAML export:');

const customConfig = {
  version: '1.0',
  globalSettings: {
    model: 'opus',
    timeout: 45000,
    permissionMode: 'ask'
  },
  mcpServers: {
    'custom-mcp': {
      defaultPermission: 'allow',
      tools: {
        CustomTool1: 'allow',
        CustomTool2: 'ask'
      }
    }
  }
};

console.log('Custom configuration created (ready for YAML export):');
console.log(JSON.stringify(customConfig, null, 2));

console.log('\n✅ YAML configuration demo complete!');
console.log('\nBenefits of YAML configuration:');
console.log('  1. More readable and maintainable');
console.log('  2. Support for comments and documentation');
console.log('  3. Multi-line strings for templates');
console.log('  4. Anchors and references for DRY configs');
console.log('  5. Cleaner syntax for complex structures');