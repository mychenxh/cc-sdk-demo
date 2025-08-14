#!/usr/bin/env node

// 直接测试前端显示逻辑
console.log('🔍 直接测试前端显示逻辑...\n');

// 模拟前端接收到的数据
const testText = '第一行\n第二行\n\n第三行';
let resultContent = '';

console.log('📝 模拟前端逐字符接收:');
console.log('原始文本:', JSON.stringify(testText));

// 模拟前端逐字符接收和处理
for (let i = 0; i < testText.length; i++) {
    const char = testText[i];
    resultContent += char;
    
    // 每个字符都模拟前端显示处理
    const formattedContent = '🌊 正在接收流式响应...\n\n' + resultContent + '▋';
    const htmlContent = formattedContent.replace(/\n/g, '<br>');
    
    console.log(`\n字符 ${i + 1}: ${JSON.stringify(char)}`);
    console.log('resultContent:', JSON.stringify(resultContent));
    console.log('HTML显示:', htmlContent);
    
    // 检查是否有问题
    if (char === '\n') {
        console.log('🔄 换行符处理后应该显示为 <br>');
        if (htmlContent.includes('<br>')) {
            console.log('✅ 换行符正确转换为 <br>');
        } else {
            console.log('❌ 换行符未正确转换为 <br>');
        }
    }
}

console.log('\n✅ 最终处理结果:');
const finalContent = resultContent + '\n\n✅ 流式响应完成！';
const finalHtmlContent = finalContent.replace(/\n/g, '<br>');
console.log('最终HTML:', finalHtmlContent);

console.log('\n🎯 关键检查点:');
console.log('1. resultContent 是否包含原始换行符:', resultContent.includes('\n'));
console.log('2. HTML显示是否包含 <br> 标签:', finalHtmlContent.includes('<br>'));
console.log('3. 换行符数量是否正确:', (resultContent.match(/\n/g) || []).length, '->', (finalHtmlContent.match(/<br>/g) || []).length);

// 测试浏览器中的实际显示
console.log('\n🌐 浏览器显示测试:');
console.log('如果将以下HTML设置为innerHTML，应该显示为:');
console.log(finalHtmlContent);
console.log('');
console.log('预期显示:');
console.log('🌊 正在接收流式响应...');
console.log('');
console.log('第一行');
console.log('第二行');
console.log('');
console.log('第三行');
console.log('');
console.log('✅ 流式响应完成！');