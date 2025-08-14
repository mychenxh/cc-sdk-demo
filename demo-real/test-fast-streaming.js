// Test fast streaming performance
const testFastStreaming = async () => {
    console.log('🚀 Testing fast streaming performance...');
    
    const startTime = Date.now();
    
    try {
        const response = await fetch('http://localhost:3002/api/streaming-query-fast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: '请简单介绍一下人工智能的应用领域',
                allowedTools: ['Read', 'Write', 'LS', 'Bash'],
                permissionMode: 'auto',
                fastMode: true,
                mockMode: true // Use mock mode for testing
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let totalChars = 0;
        let chunkCount = 0;
        let firstChunkTime = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.type === 'content' && data.content) {
                            if (!firstChunkTime) {
                                firstChunkTime = Date.now();
                                console.log(`⏱️ First chunk received in ${firstChunkTime - startTime}ms`);
                            }
                            totalChars += data.content.length;
                            chunkCount++;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const timeToFirstChunk = firstChunkTime ? firstChunkTime - startTime : 0;
        const streamingTime = endTime - firstChunkTime;

        console.log('📊 Fast Streaming Performance Results:');
        console.log(`⏱️ Total time: ${totalTime}ms`);
        console.log(`⏱️ Time to first chunk: ${timeToFirstChunk}ms`);
        console.log(`⏱️ Streaming time: ${streamingTime}ms`);
        console.log(`📝 Total characters: ${totalChars}`);
        console.log(`📦 Number of chunks: ${chunkCount}`);
        console.log(`🚀 Average speed: ${Math.round(totalChars / (totalTime / 1000))} chars/sec`);
        console.log(`📦 Average chunk size: ${Math.round(totalChars / chunkCount)} chars`);
        console.log(`⚡ Chunk frequency: ${Math.round(chunkCount / (streamingTime / 1000))} chunks/sec`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

testFastStreaming();