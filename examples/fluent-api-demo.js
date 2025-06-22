import { claude, ConsoleLogger, LogLevel } from '@instantlyeasy/claude-code-sdk-ts';

// Example 1: Basic fluent API usage
async function basicExample() {
  console.log('=== Basic Fluent API Example ===\n');
  
  const response = await claude()
    .withModel('sonnet')
    .skipPermissions()
    .query('Say hello in 3 different languages')
    .asText();
  
  console.log('Response: \n', response);
}

// Example 2: File operations with tool filtering
async function fileOperationsExample() {
  console.log('\n=== File Operations Example ===\n');
  
  const result = await claude()
    .allowTools('Read', 'Write', 'Edit')
    .acceptEdits()
    .inDirectory(process.cwd())
    .query('Create a config.json file with basic project settings')
    .asResult();
  
  console.log('Operation result:', result);
}

// Example 3: Using response parser utilities
async function parsingExample() {
  console.log('\n=== Response Parsing Example ===\n');
  
  // Get structured JSON data
  const jsonData = await claude()
    .skipPermissions()
    .query('Generate a JSON object with 3 random user profiles')
    .asJSON();
  
  console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
  
  // Extract tool execution results
  const toolResults = await claude()
    .allowTools('Read')
    .skipPermissions()
    .query('Read the package.json file')
    .findToolResult('Read');
  
  console.log('\nTool result:', toolResults);
}

// Example 4: Logging and monitoring
async function loggingExample() {
  console.log('\n=== Logging Example ===\n');
  
  const logger = new ConsoleLogger(LogLevel.DEBUG, '[Demo]');
  
  const response = await claude()
    .withLogger(logger)
    .withTimeout(30000)
    .debug(true)
    .onMessage(msg => {
      if (msg.type === 'assistant') {
        console.log('Assistant is typing...');
      }
    })
    .onToolUse(tool => {
      console.log(`Using tool: ${tool.name}`);
    })
    .query('What is 2 + 2?')
    .asText();
  
  console.log('Answer:', response);
}

// Example 5: Streaming responses
async function streamingExample() {
  console.log('\n=== Streaming Example ===\n');
  
  await claude()
    .skipPermissions()
    .query('Count from 1 to 5 slowly')
    .stream(async (message) => {
      if (message.type === 'assistant') {
        for (const block of message.content) {
          if (block.type === 'text') {
            process.stdout.write(block.text);
          }
        }
      }
    });
  
  console.log('\n');
}

// Example 6: Error handling and usage stats
async function statsExample() {
  console.log('\n=== Usage Stats Example ===\n');
  
  const parser = claude()
    .skipPermissions()
    .query('Write a haiku about programming');
  
  const haiku = await parser.asText();
  console.log('Haiku:\n', haiku);
  
  const usage = await parser.getUsage();
  if (usage) {
    console.log('\nUsage stats:');
    console.log(`- Input tokens: ${usage.inputTokens}`);
    console.log(`- Output tokens: ${usage.outputTokens}`);
    console.log(`- Total tokens: ${usage.totalTokens}`);
    console.log(`- Total cost: $${usage.totalCost.toFixed(4)}`);
  }
}

// Example 7: Complex chaining
async function complexExample() {
  console.log('\n=== Complex Chaining Example ===\n');
  
  const executions = await claude()
    .withModel('opus')
    .allowTools('Read', 'Grep', 'WebSearch')
    .denyTools('Write', 'Edit')  // Read-only mode
    .withEnv({ NODE_ENV: 'production' })
    .withTimeout(60000)
    .onAssistant(content => {
      const textBlocks = content.filter(block => block.type === 'text');
      console.log(`Assistant said ${textBlocks.length} text block(s)`);
    })
    .query('Search for TODO comments in the src directory')
    .asToolExecutions();
  
  console.log(`Found ${executions.length} tool executions`);
  for (const exec of executions) {
    console.log(`- ${exec.tool}: ${exec.isError ? 'Failed' : 'Success'}`);
  }
}

// Example 8: Backward compatibility
async function backwardCompatExample() {
  console.log('\n=== Backward Compatibility Example ===\n');
  
  // The original API still works exactly the same
  const { query } = await import('@instantlyeasy/claude-code-sdk-ts');
  
  for await (const message of query('Say "Hello from the original API"')) {
    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          console.log('Original API:', block.text);
        }
      }
    }
  }
}

// Run all examples
async function main() {
  try {
    await basicExample();
    await fileOperationsExample();
    await parsingExample();
    await loggingExample();
    await streamingExample();
    await statsExample();
    await complexExample();
    await backwardCompatExample();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();