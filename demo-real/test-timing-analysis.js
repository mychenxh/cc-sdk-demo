#!/usr/bin/env node

// 精确时间分析测试
import http from 'http';

const testData = {
    prompt: '简单回复：测试',
    allowedTools: [],
    useFluent: true
};

const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/claude-sdk-query',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(testData))
    }
};

console.log('🔬 开始精确时间分析...');
const startTime = Date.now();

const req = http.request(options, (res) => {
    const requestEndTime = Date.now();
    console.log(`⏱️ 请求到达服务器时间: ${requestEndTime - startTime}ms`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        const responseEndTime = Date.now();
        console.log(`⏱️ 服务器处理时间: ${responseEndTime - requestEndTime}ms`);
        console.log(`⏱️ 总时间: ${responseEndTime - startTime}ms`);
        
        try {
            const result = JSON.parse(data);
            console.log(`📊 响应大小: ${JSON.stringify(result).length} 字符`);
            console.log(`📝 内容长度: ${result.content ? result.content.length : 0} 字符`);
        } catch (e) {
            console.log('❌ 响应解析失败');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ 请求错误:', error.message);
});

req.write(JSON.stringify(testData));
req.end();

// 15秒超时
setTimeout(() => {
    console.log('⏰ 测试超时');
    process.exit(1);
}, 15000);