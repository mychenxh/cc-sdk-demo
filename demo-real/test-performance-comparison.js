#!/usr/bin/env node

// 性能对比测试 - 常规 vs 极速版本
import http from 'http';

const testPrompt = '生成一个简单的测试响应，大约100个字符。';
const testData = {
    prompt: testPrompt,
    allowedTools: ['Read'],
    permissionMode: 'auto'
};

// 测试常规端点
async function testRegularEndpoint() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3002,
            path: '/api/streaming-query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(testData))
            }
        };
        
        console.log('📊 测试常规端点...');
        const startTime = Date.now();
        let totalChars = 0;
        let chunkCount = 0;
        
        const req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Regular endpoint failed: ${res.statusCode}`));
                return;
            }
            
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
                            // 忽略解析错误
                        }
                    }
                }
            });
            
            res.on('end', () => {
                const totalTime = Date.now() - startTime;
                resolve({
                    type: 'regular',
                    totalTime,
                    totalChars,
                    chunkCount,
                    avgChunkSize: totalChars / chunkCount,
                    charsPerSecond: totalChars / totalTime * 1000
                });
            });
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(testData));
        req.end();
        
        // 30秒超时
        setTimeout(() => {
            reject(new Error('Regular endpoint test timeout'));
        }, 30000);
    });
}

// 测试极速端点
async function testFastEndpoint() {
    return new Promise((resolve, reject) => {
        const fastTestData = {
            ...testData,
            fastMode: true
        };
        
        const options = {
            hostname: 'localhost',
            port: 3002,
            path: '/api/streaming-query-fast',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(fastTestData))
            }
        };
        
        console.log('🚀 测试极速端点...');
        const startTime = Date.now();
        let totalChars = 0;
        let chunkCount = 0;
        
        const req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Fast endpoint failed: ${res.statusCode}`));
                return;
            }
            
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
                            // 忽略解析错误
                        }
                    }
                }
            });
            
            res.on('end', () => {
                const totalTime = Date.now() - startTime;
                resolve({
                    type: 'fast',
                    totalTime,
                    totalChars,
                    chunkCount,
                    avgChunkSize: totalChars / chunkCount,
                    charsPerSecond: totalChars / totalTime * 1000
                });
            });
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(fastTestData));
        req.end();
        
        // 30秒超时
        setTimeout(() => {
            reject(new Error('Fast endpoint test timeout'));
        }, 30000);
    });
}

// 运行对比测试
async function runComparisonTest() {
    console.log('🔬 开始性能对比测试...\n');
    
    try {
        // 测试常规端点
        const regularResult = await testRegularEndpoint();
        console.log('📊 常规端点结果:');
        console.log(`   总耗时: ${regularResult.totalTime}ms`);
        console.log(`   总字符: ${regularResult.totalChars}`);
        console.log(`   块数: ${regularResult.chunkCount}`);
        console.log(`   平均块大小: ${regularResult.avgChunkSize.toFixed(1)} 字符`);
        console.log(`   处理速度: ${regularResult.charsPerSecond.toFixed(0)} 字符/秒\n`);
        
        // 等待一下
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 测试极速端点
        const fastResult = await testFastEndpoint();
        console.log('🚀 极速端点结果:');
        console.log(`   总耗时: ${fastResult.totalTime}ms`);
        console.log(`   总字符: ${fastResult.totalChars}`);
        console.log(`   块数: ${fastResult.chunkCount}`);
        console.log(`   平均块大小: ${fastResult.avgChunkSize.toFixed(1)} 字符`);
        console.log(`   处理速度: ${fastResult.charsPerSecond.toFixed(0)} 字符/秒\n`);
        
        // 计算性能提升
        const speedup = fastResult.charsPerSecond / regularResult.charsPerSecond;
        const timeImprovement = ((regularResult.totalTime - fastResult.totalTime) / regularResult.totalTime * 100);
        const chunkSizeImprovement = ((fastResult.avgChunkSize - regularResult.avgChunkSize) / regularResult.avgChunkSize * 100);
        
        console.log('🎯 性能对比分析:');
        console.log(`   速度提升: ${speedup.toFixed(1)}倍`);
        console.log(`   时间节省: ${timeImprovement.toFixed(1)}%`);
        console.log(`   块大小提升: ${chunkSizeImprovement.toFixed(1)}%`);
        
        if (speedup > 2) {
            console.log('✅ 极速优化成功！性能显著提升');
        } else if (speedup > 1.5) {
            console.log('✅ 优化有效，性能有所提升');
        } else {
            console.log('⚠️ 优化效果有限，需要进一步调整');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

// 运行测试
runComparisonTest();