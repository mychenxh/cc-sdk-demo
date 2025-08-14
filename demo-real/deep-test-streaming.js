#!/usr/bin/env node

// 深度测试流式换行符问题
import { createServer } from 'http';
import { execa } from 'execa';

console.log('🔍 深度分析流式换行符问题...\n');

// 模拟包含换行符的文本
const testText = `这是第一行
这是第二行

这是第三行（前面有空行）
这是第四行
包含换行符的文本结束`;

console.log('📝 原始测试文本:');
console.log(JSON.stringify(testText));
console.log('');

// 模拟服务器端处理
console.log('🖥️  模拟服务器端处理:');
console.log('1. 服务器将文本按字符分解发送:');
for (let i = 0; i < testText.length; i++) {
    const char = testText[i];
    const charCode = char.charCodeAt(0);
    console.log(`   字符 ${i}: "${char}" (ASCII: ${charCode})`);
    
    if (char === '\n') {
        console.log('   ^ 这是一个换行符');
    }
}
console.log('');

// 模拟前端接收和处理
console.log('🌐 模拟前端接收和处理:');
let resultContent = '';

for (let i = 0; i < testText.length; i++) {
    const char = testText[i];
    resultContent += char;
    
    // 每5个字符或遇到换行符时显示处理结果
    if (i % 5 === 0 || char === '\n' || i === testText.length - 1) {
        console.log(`   接收第 ${i + 1} 个字符后:`);
        console.log(`   resultContent: ${JSON.stringify(resultContent)}`);
        
        // 模拟前端显示处理
        const formattedContent = '🌊 正在接收流式响应...\n\n' + resultContent + '▋';
        const htmlContent = formattedContent.replace(/\n/g, '<br>');
        
        console.log(`   HTML显示: ${htmlContent}`);
        console.log('');
    }
}

// 模拟最终处理
console.log('✅ 模拟最终处理:');
const finalContent = resultContent + '\n\n✅ 流式响应完成！';
const finalHtmlContent = finalContent.replace(/\n/g, '<br>');
console.log('最终HTML显示:');
console.log(finalHtmlContent);
console.log('');

// 检查问题
console.log('🔍 问题分析:');
console.log('1. 服务器端: 按字符发送，换行符作为单独字符发送');
console.log('2. 前端接收: 逐字符接收并累积到 resultContent');
console.log('3. 前端显示: 每次都将整个 resultContent 转换为 HTML');
console.log('4. 关键问题: 换行符在 resultContent 中是 \n，显示时转换为 <br>');
console.log('');

console.log('🎯 如果仍有问题，可能的原因:');
console.log('1. 前端显示函数有问题');
console.log('2. 服务器发送的换行符被转义');
console.log('3. 浏览器缓存问题');
console.log('4. SSE 数据解析问题');