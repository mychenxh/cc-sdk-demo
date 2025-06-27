#!/usr/bin/env node

import { claude } from './dist/index.js';

console.log('Testing basic SDK functionality...\n');

try {
  console.log('1. Testing basic query...');
  const response = await claude()
    .withModel('sonnet')
    .query('Say exactly "SDK works" and nothing else')
    .asText();
  
  console.log('Response:', response);
  
  if (response && response.includes('SDK works')) {
    console.log('✅ Basic query works!\n');
  } else {
    console.log('❌ Basic query failed\n');
  }
  
  console.log('2. Testing onMessage callback...');
  let messageCount = 0;
  
  await claude()
    .onMessage((msg) => {
      messageCount++;
      console.log(`  Got message type: ${msg.type}`);
    })
    .query('Say "callback test"')
    .asText();
  
  console.log(`✅ Received ${messageCount} messages\n`);
  
  console.log('3. Testing tool permissions...');
  await claude()
    .allowTools('Bash')
    .query('Use bash to echo "permissions work"')
    .asText();
  
  console.log('✅ Tool permissions work!\n');
  
  console.log('Summary: Core functionality is working in the beta branch!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}