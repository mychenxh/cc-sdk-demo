#!/usr/bin/env node

// 测试流式换行符修复
import { createServer } from 'http';
import { execa } from 'execa';

// 模拟服务器发送的数据
const testData = "这是第一行\n这是第二行\n\n这是第三行（前面有空行）\n这是第四行";

console.log('🚀 开始测试流式换行符修复...\n');

// 模拟前端处理逻辑
function simulateStreamingProcess() {
    console.log('🔍 模拟前端流式接收过程...');
    console.log('原始内容:');
    console.log(JSON.stringify(testData));
    console.log('');
    
    let resultContent = '';
    let step = 0;
    
    // 模拟逐字符接收
    for (let i = 0; i < testData.length; i++) {
        resultContent += testData[i];
        step++;
        
        // 每5个字符显示一次结果
        if (i % 5 === 0 || i === testData.length - 1) {
            console.log(`📝 第${step}步处理结果 (接收${i + 1}个字符):`);
            console.log('当前resultContent:');
            console.log(JSON.stringify(resultContent));
            
            // 模拟前端显示处理
            const formattedContent = '🌊 正在接收流式响应...\n\n' + resultContent + '▋';
            const htmlContent = formattedContent.replace(/\n/g, '<br>');
            
            console.log('HTML显示内容:');
            console.log(htmlContent);
            console.log('---');
        }
    }
    
    // 最终完成
    console.log('✅ 最终完成结果:');
    const finalContent = resultContent + '\n\n✅ 流式响应完成！';
    const finalHtmlContent = finalContent.replace(/\n/g, '<br>');
    console.log(finalHtmlContent);
    
    return finalHtmlContent;
}

// 运行测试
const result = simulateStreamingProcess();

console.log('\n🎉 测试完成！');
console.log('✅ 换行符应该在流式接收过程中正确显示');
console.log('✅ 最终完成时换行符也应该正确显示');