#!/usr/bin/env node

// 测试流式响应的简单脚本
// 使用Node.js内置的fetch（需要Node 18+）

async function testStreaming() {
    console.log('🌊 开始测试流式响应...');
    
    const prompt = '请简单介绍一下人工智能的发展历程，包括主要里程碑。';
    
    try {
        const response = await fetch('http://localhost:3002/api/streaming-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                allowedTools: ['Read'],
                permissionMode: 'auto',
                useFluent: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('✅ 连接成功，开始接收流式数据...');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let chunkCount = 0;
        let totalContent = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                console.log('\n🏁 流式响应完成');
                break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            chunkCount++;
            
            // 解析SSE数据
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const dataStr = line.substring(6);
                        if (dataStr && dataStr.trim() !== '') {
                            const parsed = JSON.parse(dataStr);
                            
                            if (parsed.type === 'content' && parsed.content) {
                                totalContent += parsed.content;
                                process.stdout.write(parsed.content); // 实时输出
                            } else if (parsed.type === 'complete') {
                                console.log('\n📊 统计信息:');
                                console.log(`• 总块数: ${chunkCount}`);
                                console.log(`• 总字符数: ${parsed.totalLength}`);
                                console.log(`• 消息数: ${parsed.messageCount}`);
                            }
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
        
        console.log('\n✅ 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testStreaming();