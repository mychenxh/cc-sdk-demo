import { claude } from '../../dist/index.mjs';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Code Analysis Example using Fluent API
 * Demonstrates using Claude Code SDK to analyze code files
 */

async function analyzeCodeFile(filePath) {
  const code = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  console.log(`\nAnalyzing ${fileName}...`);
  
  // Perform code analysis with streaming output
  await claude()
    .withModel('opus')
    .allowTools('Read', 'Grep', 'Glob')
    .withTimeout(60000)
    .query(`Analyze this code and provide:
1. A brief summary of what it does
2. Any potential issues or improvements
3. Code quality assessment

Code to analyze (${fileName}):
\`\`\`javascript
${code}
\`\`\``)
    .stream(async (message) => {
      if (message.type === 'assistant') {
        for (const block of message.content) {
          if (block.type === 'text') {
            process.stdout.write(block.text);
          }
        }
      }
    });
  
  console.log('\n' + '='.repeat(80));
}

// Analyze multiple files in the project
async function analyzeProject() {
  const files = [
    '../src/index.ts',
    '../src/fluent.ts',
    '../src/parser.ts'
  ];
  
  console.log('Starting project code analysis...');
  
  // Project-wide analysis using fluent API
  const projectAnalysis = await claude()
    .withModel('opus')
    .allowTools('Read', 'Grep', 'Glob', 'LS')
    .inDirectory(path.resolve('..'))
    .acceptEdits()
    .withTimeout(120000)
    .onToolUse(tool => console.log(`  [Tool: ${tool.name}]`))
    .query(`Analyze the TypeScript SDK project structure. Look at:
1. The overall architecture and design patterns
2. Type safety and error handling
3. API design and usability
4. Potential improvements or missing features

Focus on the main source files in the src/ directory.`)
    .asText();
  
  console.log('\nProject Analysis:');
  console.log(projectAnalysis);
}

// Run analyses
if (process.argv[2] === '--file' && process.argv[3]) {
  analyzeCodeFile(process.argv[3]);
} else {
  analyzeProject();
}