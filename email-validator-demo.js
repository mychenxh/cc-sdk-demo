// Import the email validator functions
import { 
    isValidEmail, 
    validateEmailDetailed, 
    getEmailDomain, 
    isEmailFromDomain, 
    normalizeEmail 
} from './email-validator.js';

// Example 1: Basic validation
console.log('=== Basic Email Validation ===');
const emailsToTest = [
    'user@example.com',
    'john.doe@company.co.uk',
    'invalid-email',
    'user@.com',
    'user@domain.',
    '  spaces@example.com  ',
    'user+tag@gmail.com',
    ''
];

emailsToTest.forEach(email => {
    console.log(`${email}: ${isValidEmail(email) ? 'Valid' : 'Invalid'}`);
});

// Example 2: Detailed validation with error messages
console.log('\n=== Detailed Validation ===');
const detailedTests = [
    'user@example.com',
    'user@.com',
    'user@domain.',
    'invalid-email',
    '   user@example.com   ',
    'a'.repeat(300) + '@example.com'
];

detailedTests.forEach(email => {
    const result = validateEmailDetailed(email);
    console.log(`\nEmail: "${email}"`);
    console.log(`Valid: ${result.isValid}`);
    if (!result.isValid) {
        console.log(`Errors: ${result.errors.join(', ')}`);
    }
});

// Example 3: Domain extraction and checking
console.log('\n=== Domain Operations ===');
const domainEmails = [
    'user@gmail.com',
    'admin@yahoo.com',
    'support@company.com',
    'invalid-email'
];

domainEmails.forEach(email => {
    const domain = getEmailDomain(email);
    console.log(`Email: ${email} -> Domain: ${domain || 'Invalid email'}`);
});

console.log('\n=== Domain Checking ===');
console.log(`Is 'user@gmail.com' from gmail.com? ${isEmailFromDomain('user@gmail.com', 'gmail.com')}`);
console.log(`Is 'user@yahoo.com' from gmail.com? ${isEmailFromDomain('user@yahoo.com', 'gmail.com')}`);

// Example 4: Email normalization
console.log('\n=== Email Normalization ===');
const emailsToNormalize = [
    '  USER@Example.COM  ',
    'John.Doe@Company.COM',
    '  test.email@domain.com  '
];

emailsToNormalize.forEach(email => {
    const normalized = normalizeEmail(email);
    console.log(`Original: "${email}" -> Normalized: "${normalized}"`);
});

// Example 5: Practical form validation simulation
console.log('\n=== Form Validation Simulation ===');
const formData = {
    email: '  USER@Example.COM  ',
    confirmEmail: 'user@example.com'
};

const normalizedEmail = normalizeEmail(formData.email);
const normalizedConfirm = normalizeEmail(formData.confirmEmail);

if (!normalizedEmail) {
    console.log('❌ Invalid email format');
} else if (normalizedEmail !== normalizedConfirm) {
    console.log('❌ Email addresses do not match');
} else {
    console.log('✅ Email validation successful');
    console.log(`Normalized email: ${normalizedEmail}`);
}