/**
 * Web Research Example
 * Demonstrates using Claude's web search capabilities through the SDK
 */

import { query } from '@instantlyeasy/claude-code-sdk-ts';

async function researchTopic(topic) {
  const options = {
    permissionMode: 'bypassPermissions',
    allowedTools: ['WebSearch', 'WebFetch']
  };
  
  console.log(`🔍 Researching: ${topic}\n`);
  console.log('─'.repeat(60) + '\n');
  
  let searchCount = 0;
  let fetchCount = 0;
  
  for await (const message of query(
    `Research the topic "${topic}" and provide a comprehensive summary with key points and recent developments`,
    options
  )) {
    switch (message.type) {
      case 'assistant':
        for (const block of message.content) {
          if (block.type === 'text') {
            console.log(block.text);
          } else if (block.type === 'tool_use') {
            if (block.name === 'WebSearch') {
              searchCount++;
              console.log(`\n🔎 Searching: "${block.input.query}"`);
            } else if (block.name === 'WebFetch') {
              fetchCount++;
              console.log(`\n📄 Fetching: ${block.input.url}`);
            }
          }
        }
        break;
        
      case 'result':
        console.log('\n' + '─'.repeat(60));
        console.log('📊 Research Statistics:');
        console.log(`   • Web searches performed: ${searchCount}`);
        console.log(`   • Pages fetched: ${fetchCount}`);
        console.log(`   • Total tokens: ${message.usage?.output_tokens || 0}`);
        console.log(`   • Cost: $${message.cost?.total_cost || 0}`);
        break;
    }
  }
}

async function compareTopics(topic1, topic2) {
  const options = {
    permissionMode: 'bypassPermissions',
    allowedTools: ['WebSearch', 'Write']
  };
  
  console.log(`\n📊 Comparing: "${topic1}" vs "${topic2}"\n`);
  console.log('─'.repeat(60) + '\n');
  
  for await (const message of query(
    `Compare and contrast "${topic1}" and "${topic2}". 
     Create a comparison report as a markdown file called "comparison.md"`,
    options
  )) {
    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          console.log(block.text);
        } else if (block.type === 'tool_use' && block.name === 'Write') {
          console.log('\n📝 Creating comparison report...');
        }
      }
    } else if (message.type === 'result') {
      console.log('\n✅ Comparison report saved to comparison.md');
    }
  }
}

async function main() {
  try {
    // Example 1: Research a single topic
    await researchTopic('Latest developments in TypeScript 5.0');
    
    // Example 2: Compare two topics
    await compareTopics('React', 'Vue.js');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('WebSearch')) {
      console.log('\n⚠️  Note: Web search may not be available in all regions');
    }
  }
}

// Uncomment to run examples:
// main();

// Or use it as a module:
export { researchTopic, compareTopics };