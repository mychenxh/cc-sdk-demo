import axios from 'axios';

// 测试Claude Code SDK集成
async function testClaudeSDK() {
    console.log('🧪 开始测试Claude Code SDK集成...');
    
    try {
        // 测试参数
        const testParams = {
            apiKey: 'test-key-12345', // 测试用的API Key
            baseUrl: 'https://api.anthropic.com',
            prompt: '请简单介绍一下Claude AI助手的特点和能力。'
        };
        
        console.log('📡 发送测试请求到流式API端点...');
        
        // 发送请求到流式API端点
        const response = await axios.get('http://localhost:3001/api/streaming-query', {
            params: testParams,
            responseType: 'stream'
        });
        
        console.log('✅ 成功连接到流式API端点');
        console.log('📊 响应状态:', response.status);
        console.log('📋 响应头:', response.headers['content-type']);
        
        // 监听流式数据
        let dataCount = 0;
        response.data.on('data', (chunk) => {
            const data = chunk.toString();
            if (data.trim() && data.startsWith('data: ')) {
                dataCount++;
                try {
                    const jsonData = JSON.parse(data.substring(6));
                    if (jsonData.type === 'connected') {
                        console.log('🔗 流式连接已建立');
                    } else if (jsonData.type === 'content') {
                        process.stdout.write(jsonData.content);
                    } else if (jsonData.type === 'complete') {
                        console.log('\n✅ 流式响应完成');
                        console.log('📊 总字符数:', jsonData.totalLength);
                        console.log('📦 消息块数:', jsonData.messageCount);
                    } else if (jsonData.type === 'error') {
                        console.log('\n❌ 收到错误:', jsonData.error);
                    }
                } catch (parseError) {
                    // 忽略解析错误，可能是不完整的数据块
                }
            }
        });
        
        response.data.on('end', () => {
            console.log('\n🏁 流式数据传输结束');
            console.log('📊 总数据块数:', dataCount);
            process.exit(0);
        });
        
        response.data.on('error', (error) => {
            console.error('❌ 流式数据错误:', error.message);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('📊 响应状态:', error.response.status);
            console.error('📋 响应数据:', error.response.data);
        }
        process.exit(1);
    }
}

// 运行测试
testClaudeSDK();