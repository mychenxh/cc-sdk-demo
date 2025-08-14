#!/usr/bin/env node

// 测试Claude Code SDK的实际响应
import { claude } from '../dist/index.js';

console.log('🧪 测试Claude Code SDK的实际响应...\n');

async function testClaudeResponse() {
    try {
        const builder = claude();
        
        const prompt = `请生成一个包含多行文本的示例，包含：
1. 第一行标题
2. 第二行内容
3. 空行
4. 第三行更多内容
5. 第四行结束

请确保包含换行符。`;
        
        console.log('📝 发送提示词:', prompt);
        console.log('');
        
        const result = await builder.query(prompt).asText();
        
        console.log('📤 Claude Code SDK原始响应:');
        console.log('====================');
        console.log(result);
        console.log('====================');
        console.log('');
        
        console.log('🔍 响应分析:');
        console.log('总字符数:', result.length);
        console.log('包含换行符数量:', (result.match(/\n/g) || []).length);
        console.log('包含换行符位置:', []);
        
        // 显示每个字符的详细信息
        console.log('');
        console.log('📋 字符级别分析:');
        for (let i = 0; i < result.length; i++) {
            const char = result[i];
            const charCode = char.charCodeAt(0);
            
            if (char === '\n') {
                console.log(`位置 ${i}: 换行符 (ASCII: ${charCode})`);
            } else if (char === '\r') {
                console.log(`位置 ${i}: 回车符 (ASCII: ${charCode})`);
            } else if (i < 50 || char === '\n' || i > result.length - 10) {
                console.log(`位置 ${i}: "${char}" (ASCII: ${charCode})`);
            }
        }
        
        console.log('');
        console.log('📊 换行符测试:');
        const lines = result.split('\n');
        console.log('总行数:', lines.length);
        lines.forEach((line, index) => {
            console.log(`第${index + 1}行: "${line}" (长度: ${line.length})`);
        });
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testClaudeResponse();