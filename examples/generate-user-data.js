#!/usr/bin/env node

/**
 * User Data Generator
 * Generates realistic user data for testing and development
 */

// Helper functions for generating random data
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Olivia', 'Robert', 'Sophia', 'William', 'Isabella', 'Richard', 'Mia', 'Joseph', 'Charlotte', 'Thomas', 'Amelia', 'Christopher', 'Harper'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'company.com', 'example.com', 'work.com', 'email.com'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Boston'];
const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA', 'TX', 'FL', 'TX', 'OH', 'NC', 'CA', 'IN', 'WA', 'CO', 'MA'];
const streets = ['Main St', 'First Ave', 'Oak Dr', 'Elm St', 'Maple Ave', 'Cedar Ln', 'Park Blvd', 'Washington St', 'Lake Rd', 'Hill Dr'];

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  return `${randomInt(200, 999)}-${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function generateEmail(firstName, lastName) {
  const variations = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${randomInt(1, 999)}`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}`
  ];
  return `${randomElement(variations)}@${randomElement(domains)}`;
}

function generateDate(startYear = 1950, endYear = 2005) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function generateUser(id) {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const cityIndex = randomInt(0, cities.length - 1);
  
  return {
    id: id,
    firstName: firstName,
    lastName: lastName,
    fullName: `${firstName} ${lastName}`,
    email: generateEmail(firstName, lastName),
    phone: generatePhone(),
    dateOfBirth: generateDate(),
    age: randomInt(18, 75),
    address: {
      street: `${randomInt(100, 9999)} ${randomElement(streets)}`,
      city: cities[cityIndex],
      state: states[cityIndex],
      zipCode: randomInt(10000, 99999).toString(),
      country: 'USA'
    },
    username: `${firstName.toLowerCase()}${randomInt(100, 9999)}`,
    registeredDate: generateDate(2020, 2024),
    isActive: Math.random() > 0.2,
    role: randomElement(['user', 'admin', 'moderator', 'guest']),
    preferences: {
      newsletter: Math.random() > 0.5,
      notifications: Math.random() > 0.3,
      theme: randomElement(['light', 'dark', 'auto'])
    }
  };
}

function generateUsers(count = 10) {
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push(generateUser(i));
  }
  return users;
}

// Parse command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 10;
const format = args[1] || 'json';

// Generate users
const users = generateUsers(count);

// Output in requested format
if (format === 'csv') {
  // CSV header
  console.log('id,firstName,lastName,email,phone,dateOfBirth,age,street,city,state,zipCode,username,registeredDate,isActive,role');
  
  // CSV rows
  users.forEach(user => {
    console.log([
      user.id,
      user.firstName,
      user.lastName,
      user.email,
      user.phone,
      user.dateOfBirth,
      user.age,
      user.address.street,
      user.address.city,
      user.address.state,
      user.address.zipCode,
      user.username,
      user.registeredDate,
      user.isActive,
      user.role
    ].join(','));
  });
} else {
  // JSON output (default)
  console.log(JSON.stringify(users, null, 2));
}