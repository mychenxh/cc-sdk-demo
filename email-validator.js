/**
 * Email validation utility function
 * @param {string} email - The email address to validate
 * @returns {boolean} - Returns validation result, true for valid format, false for invalid format
 */
function isValidEmail(email) {
    if (typeof email !== 'string' || email.trim() === '') {
        return false;
    }

    // Enhanced email regex that covers more cases
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const trimmedEmail = email.trim();
    
    // Basic length check
    if (trimmedEmail.length > 254) {
        return false;
    }
    
    // Check for multiple @ symbols
    if (trimmedEmail.split('@').length !== 2) {
        return false;
    }
    
    // Check for invalid sequences
    if (trimmedEmail.includes('..') || trimmedEmail.includes('.@') || trimmedEmail.includes('@.')) {
        return false;
    }
    
    return emailRegex.test(trimmedEmail);
}

/**
 * Validate email address and return detailed information
 * @param {string} email - The email address to validate
 * @returns {Object} - Returns validation result object
 */
function validateEmailDetailed(email) {
    const result = {
        isValid: false,
        email: email,
        errors: [],
        normalizedEmail: null
    };

    if (typeof email !== 'string') {
        result.errors.push('Email must be a string');
        return result;
    }

    const trimmedEmail = email.trim();
    result.normalizedEmail = trimmedEmail;
    
    if (trimmedEmail === '') {
        result.errors.push('Email cannot be empty');
        return result;
    }

    if (trimmedEmail.length > 254) {
        result.errors.push('Email too long (maximum 254 characters)');
        return result;
    }

    // Check for multiple @ symbols
    if (trimmedEmail.split('@').length !== 2) {
        result.errors.push('Email must contain exactly one @ symbol');
        return result;
    }

    const [localPart, domain] = trimmedEmail.split('@');
    
    if (!localPart || !domain) {
        result.errors.push('Email must have both local part and domain part');
        return result;
    }

    if (localPart.length > 64) {
        result.errors.push('Local part too long (maximum 64 characters)');
        return result;
    }

    if (domain.length > 253) {
        result.errors.push('Domain part too long (maximum 253 characters)');
        return result;
    }

    if (trimmedEmail.includes('..') || trimmedEmail.includes('.@') || trimmedEmail.includes('@.')) {
        result.errors.push('Email contains invalid character sequences');
        return result;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    result.isValid = emailRegex.test(trimmedEmail);

    if (!result.isValid) {
        result.errors.push('Email format is invalid');
    }

    return result;
}

/**
 * Extract email domain from email address
 * @param {string} email - The email address
 * @returns {string|null} - Returns domain or null if invalid
 */
function getEmailDomain(email) {
    if (!isValidEmail(email)) {
        return null;
    }
    const trimmedEmail = email.trim();
    return trimmedEmail.split('@')[1];
}

/**
 * Check if email is from a specific domain
 * @param {string} email - The email address
 * @param {string} domain - The domain to check
 * @returns {boolean} - True if email is from the specified domain
 */
function isEmailFromDomain(email, domain) {
    const emailDomain = getEmailDomain(email);
    return emailDomain && emailDomain.toLowerCase() === domain.toLowerCase();
}

/**
 * Normalize email address (trim and lowercase)
 * @param {string} email - The email address
 * @returns {string|null} - Returns normalized email or null if invalid
 */
function normalizeEmail(email) {
    if (!isValidEmail(email)) {
        return null;
    }
    return email.trim().toLowerCase();
}

// Usage Examples
console.log('=== Simple Validation Examples ===');
console.log('user@example.com:', isValidEmail('user@example.com'));
console.log('user.name@company.co.uk:', isValidEmail('user.name@company.co.uk'));
console.log('invalid-email:', isValidEmail('invalid-email'));
console.log('user@.com:', isValidEmail('user@.com'));
console.log('user@domain:', isValidEmail('user@domain'));
console.log('user@domain.', isValidEmail('user@domain.'));
console.log('', isValidEmail(''));
console.log(null, isValidEmail(null));

console.log('\n=== Detailed Validation Examples ===');
const testEmails = [
    'user@example.com',
    'user.name+tag@company.co.uk',
    'user@localhost',
    'invalid-email',
    'user@.com',
    'user@domain.',
    '',
    '   user@example.com   ',
    'a'.repeat(255) + '@example.com'
];

testEmails.forEach(email => {
    const validation = validateEmailDetailed(email);
    console.log(`\nEmail: ${email}`);
    console.log(`Validation: ${validation.isValid ? 'Valid' : 'Invalid'}`);
    if (!validation.isValid) {
        console.log(`Errors: ${validation.errors.join(', ')}`);
    }
});

console.log('\n=== Additional Utility Functions ===');
console.log('Domain of user@example.com:', getEmailDomain('user@example.com'));
console.log('Is from gmail.com:', isEmailFromDomain('user@gmail.com', 'gmail.com'));
console.log('Is from yahoo.com:', isEmailFromDomain('user@gmail.com', 'yahoo.com'));
console.log('Normalized email:', normalizeEmail('  USER@Example.COM  '));

// Chinese examples
console.log('\n=== 中文示例 ===');
console.log('简单验证 - user@example.com:', isValidEmail('user@example.com'));
console.log('域名提取 - user@gmail.com:', getEmailDomain('user@gmail.com'));
console.log('域名检查 - 是否来自gmail.com:', isEmailFromDomain('user@gmail.com', 'gmail.com'));
console.log('邮箱标准化 -  USER@Example.COM  :', normalizeEmail('  USER@Example.COM  '));

// ES6 module exports
export {
    isValidEmail,
    validateEmailDetailed,
    getEmailDomain,
    isEmailFromDomain,
    normalizeEmail
};

// Also export as default object
export default {
    isValidEmail,
    validateEmailDetailed,
    getEmailDomain,
    isEmailFromDomain,
    normalizeEmail
};