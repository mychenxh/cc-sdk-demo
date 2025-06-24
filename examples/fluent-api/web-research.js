import { claude } from '../../dist/index.mjs';

/**
 * Web Research Example using Fluent API
 * Demonstrates using Claude Code SDK for research and learning tasks
 */

// 1. Simple web research query
console.log('1. Basic web research:');
const basicResearch = await claude()
  .withModel('sonnet')
  .query('What are the latest features in TypeScript 5.0?')
  .asText();

console.log(basicResearch);

// 2. Comparative analysis
console.log('\n2. Comparative analysis:');
const comparison = await claude()
  .withModel('opus')
  .withTimeout(60000)
  .query(`Compare and contrast these JavaScript frameworks:
    - React
    - Vue
    - Angular
    - Svelte
    
    Focus on:
    1. Performance characteristics
    2. Learning curve
    3. Ecosystem and community
    4. Best use cases`)
  .asText();

console.log(comparison);

// 3. Technical deep dive with code examples
console.log('\n3. Technical deep dive:');
await claude()
  .withModel('opus')
  .allowTools('Write')
  .acceptEdits()
  .query(`Research and explain JavaScript Promises vs Async/Await:
    1. Provide a comprehensive explanation
    2. Show practical code examples
    3. Create a file called "async-examples.js" with working examples
    4. Include error handling patterns`)
  .stream(async (message) => {
    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          process.stdout.write(block.text);
        }
      }
    }
  });

// 4. Research with structured output
console.log('\n\n4. Structured research output:');
const structuredResearch = await claude()
  .withModel('sonnet')
  .query(`Research WebAssembly (WASM) and provide a structured report:
    
    Format the response as:
    ## Overview
    [Brief introduction]
    
    ## Key Benefits
    - Benefit 1
    - Benefit 2
    
    ## Use Cases
    1. Use case with example
    2. Use case with example
    
    ## Getting Started
    [Step by step guide]
    
    ## Resources
    - Resource 1
    - Resource 2`)
  .asText();

console.log(structuredResearch);

// 5. Research with follow-up questions
console.log('\n5. Interactive research session:');
class ResearchSession {
  constructor() {
    this.context = [];
    this.builder = claude()
      .withModel('opus')
      .withTimeout(45000);
  }
  
  async ask(question) {
    this.context.push({ role: 'user', question });
    
    const contextStr = this.context
      .map(item => item.role === 'user' 
        ? `Q: ${item.question}` 
        : `A: ${item.answer}`)
      .join('\n\n');
    
    const answer = await this.builder
      .query(`${contextStr}\n\nQ: ${question}`)
      .asText();
    
    this.context.push({ role: 'assistant', answer });
    return answer;
  }
}

const session = new ResearchSession();

const q1 = await session.ask('What is GraphQL?');
console.log('Q: What is GraphQL?');
console.log('A:', q1);

const q2 = await session.ask('How does it compare to REST?');
console.log('\nQ: How does it compare to REST?');
console.log('A:', q2);

const q3 = await session.ask('Show me a simple GraphQL schema example');
console.log('\nQ: Show me a simple GraphQL schema example');
console.log('A:', q3);

// 6. Research with tool assistance
console.log('\n6. Research with documentation lookup:');
const docsResearch = await claude()
  .withModel('opus')
  .allowTools('Read', 'Grep', 'WebFetch')
  .query(`Research the Claude Code SDK by:
    1. Looking at the README.md file
    2. Examining the type definitions
    3. Providing a comprehensive guide on using the Fluent API
    4. Include real code examples from the codebase`)
  .asText();

console.log(docsResearch);

// 7. Research project with artifact creation
console.log('\n7. Creating research artifacts:');
const researchProject = await claude()
  .withModel('opus')
  .allowTools('Write', 'Edit')
  .acceptEdits()
  .withTimeout(90000)
  .onToolUse(tool => console.log(`  Creating: ${tool.input?.path || tool.name}`))
  .query(`Create a comprehensive research document about "Modern State Management in React":
    1. Research current state management solutions
    2. Create a markdown file "state-management-guide.md" with:
       - Overview of each solution
       - Pros and cons
       - Code examples
       - Decision matrix
    3. Create example implementations for the top 3 solutions`)
  .asText();

console.log(researchProject);