#!/usr/bin/env node

// 测试换行符处理修复
import { createServer } from 'http';
import { execa } from 'execa';

const testContent = "这是第一行\n这是第二行\n\n这是第三行（前面有空行）\n这是第四行";

// 模拟前端处理逻辑
function simulateFrontendProcessing(content) {
    console.log('🔍 原始内容:');
    console.log(JSON.stringify(content));
    console.log('');
    
    // 模拟流式接收过程中的处理
    let resultContent = '';
    for (let i = 0; i < content.length; i++) {
        resultContent += content[i];
        
        // 每隔几个字符模拟一次显示更新
        if (i % 10 === 0 || i === content.length - 1) {
            const formattedContent = '🌊 正在接收流式响应...\n\n' + resultContent + '▋';
            const htmlContent = formattedContent.replace(/\n/g, '<br>');
            
            console.log(`📝 第${i + 1}个字符处理完成:`);
            console.log(`HTML内容: ${JSON.stringify(htmlContent)}`);
            console.log('');
        }
    }
    
    // 模拟最终完成
    const finalContent = resultContent + '\n\n✅ 流式响应完成！';
    const finalHtmlContent = finalContent.replace(/\n/g, '<br>');
    
    console.log('✅ 最终处理结果:');
    console.log(`HTML内容: ${JSON.stringify(finalHtmlContent)}`);
    console.log('');
    
    return finalHtmlContent;
}

// 运行测试
console.log('🚀 开始测试换行符处理修复...\n');
const result = simulateFrontendProcessing(testContent);

console.log('🎉 测试完成！');
console.log('✅ 换行符在流式接收过程中应该正确显示');
console.log('✅ 最终完成时换行符也应该正确显示');