/**
 * 邮箱地址验证工具函数
 * 
 * @param {string} email - 要验证的邮箱地址
 * @returns {boolean} - 返回验证结果，true表示格式正确，false表示格式错误
 */
function isValidEmail(email) {
    if (typeof email !== 'string' || email.trim() === '') {
        return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
}

/**
 * 验证邮箱地址并返回详细信息
 * 
 * @param {string} email - 要验证的邮箱地址
 * @returns {Object} - 返回验证结果对象
 */
function validateEmailDetailed(email) {
    const result = {
        isValid: false,
        email: email,
        errors: []
    };

    if (typeof email !== 'string') {
        result.errors.push('邮箱地址必须是字符串');
        return result;
    }

    const trimmedEmail = email.trim();
    
    if (trimmedEmail === '') {
        result.errors.push('邮箱地址不能为空');
        return result;
    }

    if (trimmedEmail.length > 254) {
        result.errors.push('邮箱地址过长，最大长度为254个字符');
        return result;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    result.isValid = emailRegex.test(trimmedEmail);
    result.email = trimmedEmail;

    if (!result.isValid) {
        result.errors.push('邮箱地址格式不正确');
    }

    return result;
}

// 使用示例
console.log('=== 简单验证示例 ===');
console.log('user@example.com:', isValidEmail('user@example.com'));
console.log('user.name@company.co.uk:', isValidEmail('user.name@company.co.uk'));
console.log('invalid-email:', isValidEmail('invalid-email'));
console.log('user@.com:', isValidEmail('user@.com'));
console.log('user@domain:', isValidEmail('user@domain'));
console.log('user@domain.', isValidEmail('user@domain.'));
console.log('', isValidEmail(''));
console.log(null, isValidEmail(null));

console.log('\n=== 详细验证示例 ===');
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
    console.log(`\n邮箱: ${email}`);
    console.log(`验证结果: ${validation.isValid ? '有效' : '无效'}`);
    if (!validation.isValid) {
        console.log(`错误信息: ${validation.errors.join(', ')}`);
    }
});

// 导出函数供其他模块使用
module.exports = {
    isValidEmail,
    validateEmailDetailed
};