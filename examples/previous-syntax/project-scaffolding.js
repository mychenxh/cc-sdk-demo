/**
 * Project Scaffolding Example
 * Demonstrates using Claude to create a complete project structure
 */

import { query } from '@instantlyeasy/claude-code-sdk-ts';
import { join } from 'path';

async function createProject(projectName, projectType) {
  const projectPath = join(process.cwd(), projectName);
  
  const options = {
    permissionMode: 'bypassPermissions',
    allowedTools: ['Write', 'Bash'],
    cwd: process.cwd()
  };
  
  console.log(`🚀 Creating ${projectType} project: ${projectName}\n`);
  console.log('─'.repeat(60) + '\n');
  
  const prompt = `Create a complete ${projectType} project called "${projectName}" with the following:
    1. Appropriate directory structure
    2. Package.json with common dependencies
    3. Basic configuration files (tsconfig.json, .gitignore, etc.)
    4. A simple example/starter code
    5. A README.md with setup instructions
    
    Use best practices for a modern ${projectType} project.`;
  
  let filesCreated = 0;
  let commandsRun = 0;
  
  for await (const message of query(prompt, options)) {
    switch (message.type) {
      case 'assistant':
        for (const block of message.content) {
          if (block.type === 'text') {
            console.log('🤖', block.text);
          } else if (block.type === 'tool_use') {
            if (block.name === 'Write') {
              filesCreated++;
              const filePath = block.input.file_path;
              console.log(`\n📄 Creating: ${filePath.replace(process.cwd(), '.')}`);
            } else if (block.name === 'Bash') {
              commandsRun++;
              console.log(`\n💻 Running: ${block.input.command}`);
            }
          }
        }
        break;
        
      case 'result':
        console.log('\n' + '─'.repeat(60));
        console.log('✅ Project created successfully!\n');
        console.log('📊 Summary:');
        console.log(`   • Files created: ${filesCreated}`);
        console.log(`   • Commands run: ${commandsRun}`);
        console.log(`   • Location: ${projectPath}`);
        console.log('\n🎯 Next steps:');
        console.log(`   cd ${projectName}`);
        console.log('   npm install');
        console.log('   npm run dev\n');
        break;
    }
  }
}

async function addFeature(featureName) {
  const options = {
    permissionMode: 'acceptEdits',
    allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit'],
    cwd: process.cwd()
  };
  
  console.log(`\n🔧 Adding feature: ${featureName}\n`);
  console.log('─'.repeat(60) + '\n');
  
  const prompt = `Add a ${featureName} feature to the current project. 
    Analyze the existing code structure and add the feature following the project's patterns and conventions.`;
  
  for await (const message of query(prompt, options)) {
    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          console.log('🤖', block.text);
        } else if (block.type === 'tool_use') {
          console.log(`\n🔧 ${block.name}: ${
            block.input.file_path || block.input.pattern || 'Processing...'
          }`);
        }
      }
    } else if (message.type === 'result') {
      console.log('\n✅ Feature added successfully!');
    }
  }
}

// Example usage
async function main() {
  // Create different types of projects
  const examples = [
    { name: 'my-react-app', type: 'React TypeScript' },
    { name: 'my-api-server', type: 'Express.js REST API' },
    { name: 'my-cli-tool', type: 'Node.js CLI tool' }
  ];
  
  console.log('🎨 Project Scaffolding Examples\n');
  console.log('Choose a project type to create:');
  examples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.type} - "${ex.name}"`);
  });
  
  console.log('\nExample commands:');
  console.log('  node project-scaffolding.js');
  console.log('  // Then follow the prompts\n');
  
  // Uncomment to run:
  // await createProject('my-awesome-app', 'React TypeScript');
  // await addFeature('user authentication');
}

// Show usage information
main();

export { createProject, addFeature };