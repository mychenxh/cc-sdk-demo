/**
 * Validates an email address format using a comprehensive regex pattern
 * @param {string} email - The email address to validate
 * @returns {boolean} True if the email format is valid, false otherwise
 */
function isValidEmail(email) {
    if (typeof email !== 'string') {
        return false;
    }

    // Comprehensive email regex pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Basic length check
    if (email.length > 254) {
        return false;
    }

    // Check for consecutive dots
    if (email.includes('..') || email.includes('.@') || email.includes('@.')) {
        return false;
    }

    return emailRegex.test(email);
}

/**
 * Validates email with detailed error messages
 * @param {string} email - The email address to validate
 * @returns {Object} Validation result with isValid flag and optional error message
 */
function validateEmailDetailed(email) {
    if (typeof email !== 'string') {
        return {
            isValid: false,
            error: 'Email must be a string'
        };
    }

    if (email.length === 0) {
        return {
            isValid: false,
            error: 'Email cannot be empty'
        };
    }

    if (email.length > 254) {
        return {
            isValid: false,
            error: 'Email is too long (max 254 characters)'
        };
    }

    if (!email.includes('@')) {
        return {
            isValid: false,
            error: 'Email must contain @ symbol'
        };
    }

    if (email.includes('..')) {
        return {
            isValid: false,
            error: 'Email cannot contain consecutive dots'
        };
    }

    if (email.includes('.@') || email.includes('@.')) {
        return {
            isValid: false,
            error: 'Email cannot have dots adjacent to @ symbol'
        };
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            error: 'Invalid email format'
        };
    }

    return {
        isValid: true,
        error: null
    };
}

// Export functions for use as module
export { isValidEmail, validateEmailDetailed };

// Usage examples (run directly with Node.js)
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('=== Email Validator Demo ===\n');

    // Test cases
    const testEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@gmail.com',
        'invalid-email',
        '@example.com',
        'user@.com',
        'user@domain.',
        'user..name@domain.com',
        '',
        'a@b.c',
        'very.long.email.address.that.exceeds.the.maximum.allowed.length.for.an.email.address@domain.com'
    ];

    console.log('Simple validation:');
    testEmails.forEach(email => {
        const isValid = isValidEmail(email);
        console.log(`"${email}" -> ${isValid ? 'Valid' : 'Invalid'}`);
    });

    console.log('\nDetailed validation:');
    testEmails.forEach(email => {
        const result = validateEmailDetailed(email);
        console.log(`"${email}" -> ${result.isValid ? 'Valid' : 'Invalid'}`);
        if (!result.isValid) {
            console.log(`  Error: ${result.error}`);
        }
    });
}