#!/usr/bin/env node

const { query } = require('@anthropic-ai/claude-code-sdk');

async function generateUserData(count = 10) {
  console.log(`Generating ${count} user records...`);
  
  const prompt = `Generate ${count} realistic user records with the following fields:
  - id (UUID)
  - firstName
  - lastName
  - email
  - username
  - age (18-80)
  - country
  - city
  - occupation
  - registrationDate (ISO format, within last 2 years)
  - isActive (boolean)
  
  Return the data as a JSON array. Make the data diverse and realistic.`;

  try {
    let userData = '';
    
    for await (const message of query(prompt)) {
      if (message.type === 'text') {
        userData += message.text;
        process.stdout.write(message.text);
      }
    }
    
    // Parse and validate the generated data
    try {
      const users = JSON.parse(userData);
      console.log(`\n\nSuccessfully generated ${users.length} users`);
      
      // Save to file
      const fs = require('fs');
      const filename = `users-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(users, null, 2));
      console.log(`Data saved to ${filename}`);
      
      return users;
    } catch (parseError) {
      console.error('\nError parsing generated data:', parseError.message);
    }
    
  } catch (error) {
    console.error('Error generating user data:', error);
  }
}

// Run the generator
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 10;
  generateUserData(count);
}

module.exports = { generateUserData };