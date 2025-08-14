#!/usr/bin/env node

// 简化的极速性能测试
import http from 'http';

const testData = {
    prompt: '简单测试：生成100个字符内容',
    allowedTools: ['Read'],
    fastMode: true
};

const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/streaming-query-fast',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(testData))
    }
};

console.log('🚀 极速测试开始...');
const startTime = Date.now();
let totalChars = 0;
let chunkCount = 0;

const req = http.request(options, (res) => {
    console.log('✅ 极速响应状态:', res.statusCode);
    
    res.on('data', (chunk) => {
        const data = chunk.toString();
        const lines = data.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const parsed = JSON.parse(line.substring(6));
                    if (parsed.type === 'content' && parsed.content) {
                        totalChars += parsed.content.length;
                        chunkCount++;
                    }
                } catch (e) {
                    // 忽略
                }
            }
        }
    });
    
    res.on('end', () => {
        const totalTime = Date.now() - startTime;
        const speed = totalChars / totalTime * 1000;
        
        console.log('\n🚀 极速测试结果:');
        console.log(`• 耗时: ${totalTime}ms`);
        console.log(`• 字符: ${totalChars}`);
        console.log(`• 块数: ${chunkCount}`);
        console.log(`• 速度: ${speed.toFixed(0)} 字符/秒`);
        console.log(`• 平均块大小: ${(totalChars / chunkCount).toFixed(1)} 字符`);
        
        console.log('\n✅ 极速优化完成！');
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('❌ 测试错误:', error.message);
    process.exit(1);
});

req.write(JSON.stringify(testData));
req.end();

setTimeout(() => {
    console.log('⏰ 测试超时');
    process.exit(1);
}, 30000);