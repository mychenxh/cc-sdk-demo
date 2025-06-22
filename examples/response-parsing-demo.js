import { claude } from '@instantlyeasy/claude-code-sdk-ts';

/**
 * Demonstrates the power of response parsing utilities
 */

// Example 1: Extract structured data from natural language
async function extractStructuredData() {
  console.log('=== Extracting Structured Data ===\n');
  
  const userProfile = await claude()
    .skipPermissions()
    .query(`Generate a user profile with:
      - name
      - email
      - age
      - interests (array)
      Format as JSON`)
    .asJSON();
  
  console.log('Extracted profile:', userProfile);
  
  // Type-safe access (in TypeScript)
  if (userProfile) {
    console.log(`Name: ${userProfile.name}`);
    console.log(`Interests: ${userProfile.interests?.join(', ')}`);
  }
}

// Example 2: Parse code generation results
async function parseCodeGeneration() {
  console.log('\n\n=== Parsing Generated Code ===\n');
  
  const parser = claude()
    .skipPermissions()
    .query('Write a Python function that calculates fibonacci numbers');
  
  // Get just the code without explanations
  const response = await parser.asText();
  
  // Extract code block if wrapped in markdown
  const codeMatch = response.match(/```python\n([\s\S]*?)\n```/);
  const code = codeMatch ? codeMatch[1] : response;
  
  console.log('Generated code:');
  console.log(code);
}

// Example 3: Analyze tool execution patterns
async function analyzeToolUsage() {
  console.log('\n\n=== Analyzing Tool Usage ===\n');
  
  const parser = claude()
    .allowTools('Read', 'Grep')
    .skipPermissions()
    .query('Find all TypeScript files that import "express"');
  
  // Get all tool executions
  const executions = await parser.asToolExecutions();
  
  // Group by tool type
  const toolUsage = executions.reduce((acc, exec) => {
    acc[exec.tool] = (acc[exec.tool] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Tool usage summary:', toolUsage);
  
  // Find specific tool results
  const grepResults = await parser.findToolResults('Grep');
  console.log(`\nFound ${grepResults.length} grep operations`);
}

// Example 4: Custom transformation
async function customTransformation() {
  console.log('\n\n=== Custom Transformation ===\n');
  
  const summary = await claude()
    .skipPermissions()
    .query('List 5 programming languages with their main use cases')
    .transform(messages => {
      // Custom logic to extract language mentions
      const languages = [];
      
      for (const msg of messages) {
        if (msg.type === 'assistant') {
          for (const block of msg.content) {
            if (block.type === 'text') {
              // Simple regex to find language mentions
              const matches = block.text.match(/\b(\w+):\s*([^.]+)/g);
              if (matches) {
                languages.push(...matches);
              }
            }
          }
        }
      }
      
      return {
        languageCount: languages.length,
        languages: languages.slice(0, 5),
        timestamp: new Date().toISOString()
      };
    });
  
  console.log('Custom summary:', summary);
}

// Example 5: Error handling and validation
async function errorHandling() {
  console.log('\n\n=== Error Handling ===\n');
  
  const parser = claude()
    .allowTools('Write')
    .skipPermissions()
    .query('Try to write to /invalid/path/file.txt');
  
  // Check if operation succeeded
  const success = await parser.succeeded();
  console.log('Operation succeeded:', success);
  
  // Get any errors
  const errors = await parser.getErrors();
  if (errors.length > 0) {
    console.log('Errors encountered:');
    errors.forEach(err => console.log(`  - ${err}`));
  }
}

// Example 6: Chaining multiple operations
async function chainingOperations() {
  console.log('\n\n=== Chaining Operations ===\n');
  
  // First, analyze code
  const analysis = await claude()
    .allowTools('Read')
    .skipPermissions()
    .query('Read package.json and tell me the main dependencies')
    .asText();
  
  // Then, generate documentation based on analysis
  const docs = await claude()
    .skipPermissions()
    .query(`Based on this analysis: "${analysis}", 
            generate a brief README section about dependencies`)
    .asText();
  
  console.log('Generated documentation:');
  console.log(docs);
}

// Run all examples
async function main() {
  try {
    await extractStructuredData();
    await parseCodeGeneration();
    await analyzeToolUsage();
    await customTransformation();
    await errorHandling();
    await chainingOperations();
  } catch (error) {
    console.error('Demo error:', error);
  }
}

main();