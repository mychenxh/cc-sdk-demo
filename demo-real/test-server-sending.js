#!/usr/bin/env node

// 测试服务器端的JSON.stringify处理
console.log('🔍 测试服务器端的JSON.stringify处理...\n');

// 模拟服务器端的处理逻辑
const testChars = ['A', 'B', '\n', 'C', '\n', '\n', 'D'];

console.log('📋 测试字符序列:', testChars.map(char => JSON.stringify(char)).join(', '));

for (let i = 0; i < testChars.length; i++) {
    const char = testChars[i];
    
    // 模拟服务器端的处理
    const charData = {
        type: 'content',
        content: char,
        position: i + 1,
        totalLength: testChars.length,
        timestamp: new Date().toISOString()
    };
    
    const sseMessage = `data: ${JSON.stringify(charData)}\n\n`;
    
    console.log(`\n字符 ${i + 1}: ${JSON.stringify(char)}`);
    console.log('charData:', JSON.stringify(charData));
    console.log('SSE消息:', sseMessage);
    
    // 模拟前端解析
    const lines = sseMessage.split('\n');
    for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();
        if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr && dataStr.trim() !== '') {
                try {
                    const parsed = JSON.parse(dataStr);
                    console.log('前端解析结果:', JSON.stringify(parsed));
                    
                    // 检查换行符是否正确传输
                    if (parsed.content === '\n') {
                        console.log('✅ 换行符正确传输');
                    } else if (parsed.content === char) {
                        console.log('✅ 字符正确传输');
                    } else {
                        console.log('❌ 字符传输错误');
                    }
                } catch (e) {
                    console.log('❌ JSON解析错误:', e.message);
                }
            }
        }
    }
}

console.log('\n🎯 测试结论:');
console.log('1. JSON.stringify正确处理了换行符');
console.log('2. SSE格式正确');
console.log('3. 前端应该能够正确解析换行符');

// 测试包含换行符的完整文本
console.log('\n📝 测试完整文本:');
const testText = '第一行\n第二行\n\n第三行';
console.log('原始文本:', JSON.stringify(testText));

// 模拟服务器逐字符发送
let resultContent = '';
for (let i = 0; i < testText.length; i++) {
    const char = testText[i];
    const charData = { type: 'content', content: char };
    const sseMessage = `data: ${JSON.stringify(charData)}\n\n`;
    
    // 模拟前端解析
    const lines = sseMessage.split('\n');
    for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();
        if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            const parsed = JSON.parse(dataStr);
            resultContent += parsed.content;
        }
    }
}

console.log('重组后的文本:', JSON.stringify(resultContent));
console.log('文本一致性:', testText === resultContent ? '✅ 一致' : '❌ 不一致');