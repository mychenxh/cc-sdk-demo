/**
 * Session Management Examples
 * 
 * This file demonstrates how to use session management features
 * to maintain conversation context across multiple queries.
 */

import { claude, query } from '@instantlyeasy/claude-code-sdk-ts';

// Example 1: Basic session continuation
async function basicSessionExample() {
  console.log('=== Basic Session Example ===\n');
  
  const builder = claude()
    .withModel('sonnet')
    .skipPermissions();
  
  // First query - establish context
  console.log('Query 1: Asking Claude to remember a number...');
  const parser1 = builder.query('Remember this number: 42. I will ask you about it later.');
  const sessionId = await parser1.getSessionId();
  const response1 = await parser1.asText();
  console.log('Response:', response1);
  console.log('Session ID:', sessionId);
  
  // Second query - test memory
  console.log('\nQuery 2: Testing Claude\'s memory...');
  const response2 = await builder
    .withSessionId(sessionId)
    .query('What number did I ask you to remember?')
    .asText();
  console.log('Response:', response2);
  
  // Third query - more context
  console.log('\nQuery 3: Adding more context...');
  const response3 = await builder
    .withSessionId(sessionId)
    .query('Multiply that number by 2 and tell me the result.')
    .asText();
  console.log('Response:', response3);
}

// Example 2: Session with file operations
async function fileOperationSessionExample() {
  console.log('\n\n=== File Operation Session Example ===\n');
  
  const builder = claude()
    .withModel('sonnet')
    .skipPermissions()
    .allowTools('Write', 'Read', 'Edit');
  
  // Create a file
  console.log('Creating a test file...');
  const parser1 = builder.query('Create a file called session-test.txt with the content "Initial content"');
  const sessionId = await parser1.getSessionId();
  await parser1.asResult();
  console.log('File created');
  
  // Modify the file in the same session
  console.log('\nModifying the file...');
  await builder
    .withSessionId(sessionId)
    .query('Append " - Modified in session" to session-test.txt')
    .asResult();
  console.log('File modified');
  
  // Read the file to verify
  console.log('\nReading the file...');
  const content = await builder
    .withSessionId(sessionId)
    .query('Read session-test.txt and tell me its contents')
    .asText();
  console.log('File contents:', content);
  
  // Clean up
  console.log('\nCleaning up...');
  await builder
    .withSessionId(sessionId)
    .query('Delete session-test.txt')
    .asResult();
  console.log('File deleted');
}

// Example 3: Classic API with sessionId option
async function classicAPIExample() {
  console.log('\n=== Classic API with sessionId Example ===\n');

  // Step 1: Start a conversation using classic API to establish a session
  console.log('Step 1: Starting initial conversation with classic API...');

  let sessionId = null;
  let firstResponse = '';

  const initialOptions = {
    model: 'sonnet',
    permissionMode: 'bypassPermissions'
  };

  for await (const message of query(
    'Pick a completely random card from a standard deck of 52 playing cards',
    initialOptions
  )) {
    // Extract session ID from any message that has it
    if (message.session_id) {
      sessionId = message.session_id;
    }

    if (message.type === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'text') {
          firstResponse += block.text;
        }
      }
    }
  }

  console.log('First response:', firstResponse);
  console.log('Extracted session ID:', sessionId);

  // Step 2: Continue the conversation using the extracted session ID
  if (sessionId) {
    console.log('\nStep 2: Continuing conversation with session ID...');

    const continueOptions = {
      sessionId: sessionId,
      model: 'sonnet',
      permissionMode: 'bypassPermissions'
    };

    let secondResponse = '';

    for await (const message of query('Which card did you pick?', continueOptions)) {
      if (message.type === 'assistant') {
        for (const block of message.content) {
          if (block.type === 'text') {
            secondResponse += block.text;
          }
        }
      }
    }

    console.log('Second response:', secondResponse);
    console.log('\n✅ Classic API session management working properly!');
  } else {
    console.log('❌ Could not extract session ID from first conversation.');
  }
}

// Example 4: Complex workflow with session
async function complexWorkflowExample() {
  console.log('\n\n=== Complex Workflow Session Example ===\n');
  
  const builder = claude()
    .withModel('opus')
    .skipPermissions();
  
  // Step 1: Analyze a topic
  console.log('Step 1: Setting up context...');
  const parser1 = builder.query(`
    You are helping me create a simple web application.
    The app should be a todo list with the following features:
    1. Add new todos
    2. Mark todos as complete
    3. Delete todos
    4. Filter by status (all, active, completed)
    
    Please acknowledge that you understand the requirements.
  `);
  const sessionId = await parser1.getSessionId();
  const ack = await parser1.asText();
  console.log('Claude:', ack.substring(0, 100) + '...');
  
  // Step 2: Plan the implementation
  console.log('\n\nStep 2: Planning the implementation...');
  const plan = await builder
    .withSessionId(sessionId)
    .query('What files should we create for this todo app? List them with their purpose.')
    .asText();
  console.log('Implementation plan:', plan.substring(0, 200) + '...');
  
  // Step 3: Review the session context
  console.log('\nStep 3: Verifying session context...');
  const review = await builder
    .withSessionId(sessionId)
    .query('Summarize what we discussed about the todo app requirements')
    .asText();
  console.log('Context review:', review.substring(0, 200) + '...');
  
  return sessionId;
}

// Example 5: Resuming a session later
async function resumeSessionExample(existingSessionId) {
  console.log('\n\n=== Resume Session Example ===\n');
  console.log('Resuming session:', existingSessionId);
  
  const response = await claude()
    .withModel('opus')
    .skipPermissions()
    .withSessionId(existingSessionId)
    .query('What were the main features we discussed for the todo app?')
    .asText();
  
  console.log('Claude remembers:', response.substring(0, 200) + '...');
}

// Run all examples
async function main() {
  try {
    // Run basic session example
    await basicSessionExample();
    
    // Run file operation example (commented out to avoid creating files)
    // await fileOperationSessionExample();
    
    // Run classic API example
    await classicAPIExample();
    
    // Run complex workflow and get session ID
    const sessionId = await complexWorkflowExample();
    
    // Demonstrate resuming a session
    if (sessionId) {
      await resumeSessionExample(sessionId);
    }
    
    console.log('\n✅ All session examples completed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
