#!/usr/bin/env node

// 测试实时统计功能的简单脚本
// 使用Node.js内置的fetch（需要Node 18+）

import { createServer } from 'http';
import { parse } from 'url';

// 创建简单的测试服务器来验证实时统计功能
const server = createServer((req, res) => {
  const pathname = parse(req.url).pathname;
  
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>实时统计功能测试</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .test-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .test-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 0;
        }
        
        .test-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .result-area {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            min-height: 200px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .result-area.streaming {
            background: #e3f2fd;
            border-color: #2196f3;
        }
        
        .typing-cursor {
            display: inline-block;
            width: 8px;
            height: 1.2em;
            background-color: #0ea5e9;
            animation: blink 1s infinite;
            margin-left: 2px;
            vertical-align: text-bottom;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        
        .stats {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 6px;
            padding: 10px;
            margin: 10px 0;
            font-size: 14px;
        }
        
        .info-box {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h1>📊 实时统计功能测试</h1>
        
        <div class="info-box">
            <strong>🎯 测试说明：</strong>
            <p>这个页面测试实时统计功能，包括：</p>
            <ul>
                <li>✅ 实时字符计数</li>
                <li>✅ 实时数据块计数</li>
                <li>✅ 实时速度计算</li>
                <li>✅ 实时进度估算</li>
            </ul>
        </div>
        
        <button class="test-button" onclick="testStreaming()" id="testBtn">开始实时统计测试</button>
        <button class="test-button" onclick="clearResult()" style="background: #6c757d;">清空结果</button>
        
        <div class="result-area" id="result">点击"开始实时统计测试"按钮来测试实时统计功能...</div>
        
        <div class="stats" id="stats" style="display: none;">
            <strong>📊 最终统计信息：</strong>
            <div id="statsContent"></div>
        </div>
    </div>

    <script>
        function clearResult() {
            document.getElementById('result').innerHTML = '点击"开始实时统计测试"按钮来测试实时统计功能...';
            document.getElementById('result').classList.remove('streaming');
            document.getElementById('stats').style.display = 'none';
        }
        
        async function testStreaming() {
            const btn = document.getElementById('testBtn');
            const result = document.getElementById('result');
            const stats = document.getElementById('stats');
            const statsContent = document.getElementById('statsContent');
            
            btn.disabled = true;
            btn.textContent = '测试中...';
            
            result.innerHTML = '🌊 正在连接服务器...\\n\\n';
            result.classList.add('streaming');
            stats.style.display = 'none';
            
            const startTime = Date.now();
            let chunkCount = 0;
            let totalContent = '';
            
            // 创建实时统计信息显示
            const realTimeStats = document.createElement('div');
            realTimeStats.style.cssText = \`
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 1000;
                min-width: 200px;
            \`;
            realTimeStats.innerHTML = \`
                <div style="font-weight: bold; margin-bottom: 5px;">📊 实时统计</div>
                <div>字符数: <span id="realTimeChars">0</span></div>
                <div>数据块: <span id="realTimeChunks">0</span></div>
                <div>速度: <span id="realTimeSpeed">0</span> 字符/秒</div>
                <div>进度: <span id="realTimeProgress">0</span>%</div>
            \`;
            document.body.appendChild(realTimeStats);
            
            // 实时更新统计信息的函数
            function updateRealTimeStats() {
                const currentTime = Date.now();
                const elapsed = (currentTime - startTime) / 1000;
                const speed = elapsed > 0 ? Math.round(totalContent.length / elapsed) : 0;
                
                document.getElementById('realTimeChars').textContent = totalContent.length;
                document.getElementById('realTimeChunks').textContent = chunkCount;
                document.getElementById('realTimeSpeed').textContent = speed;
                
                // 估算进度（基于平均响应长度）
                const estimatedTotal = 800; // 基于历史数据的估算
                const progress = Math.min(Math.round((totalContent.length / estimatedTotal) * 100), 100);
                document.getElementById('realTimeProgress').textContent = progress;
            }
            
            try {
                // 模拟流式响应 - 测试实时统计功能
                const testContent = \`这是一个模拟的流式响应，用于测试实时统计功能。

📊 实时统计功能包括：
• 实时字符计数：显示已接收的字符总数
• 实时数据块计数：显示已接收的数据块数量  
• 实时速度计算：显示当前接收速度（字符/秒）
• 实时进度估算：显示完成进度的百分比估算

🎯 测试效果：
1. 右上角会显示实时统计信息
2. 统计信息会随着内容接收实时更新
3. 完成后会显示最终统计并移除实时统计

✅ 实时统计功能测试完成！\`;
                
                // 模拟流式接收
                const words = testContent.split('');
                for (let i = 0; i < words.length; i += 3) {
                    const chunk = words.slice(i, Math.min(i + 3, words.length)).join('');
                    totalContent += chunk;
                    chunkCount++;
                    
                    // 实时显示（带光标）
                    result.innerHTML = totalContent.replace(/\\n/g, '<br>') + '<span class="typing-cursor"></span>';
                    result.scrollTop = result.scrollHeight;
                    
                    // 更新实时统计信息
                    updateRealTimeStats();
                    
                    // 模拟网络延迟
                    await new Promise(resolve => setTimeout(resolve, 120));
                }
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                const avgSpeed = Math.round(totalContent.length / (duration / 1000));
                
                // 显示最终结果（移除光标）
                result.innerHTML = totalContent.replace(/\\n/g, '<br>') + '\\n\\n✅ 实时统计测试完成！';
                result.classList.remove('streaming');
                
                // 移除实时统计信息
                if (realTimeStats && realTimeStats.parentNode) {
                    realTimeStats.parentNode.removeChild(realTimeStats);
                }
                
                // 显示统计信息
                statsContent.innerHTML = \`
                    • 总耗时: \${duration}ms<br>
                    • 总字符数: \${totalContent.length}<br>
                    • 数据块数: \${chunkCount}<br>
                    • 平均速度: \${avgSpeed} 字符/秒<br>
                    • 批处理大小: 3字符/块<br>
                    • 延迟: 120ms/块
                \`;
                stats.style.display = 'block';
                
            } catch (error) {
                result.innerHTML = \`❌ 测试失败: \${error.message}\`;
                result.classList.remove('streaming');
                
                // 移除实时统计信息
                if (realTimeStats && realTimeStats.parentNode) {
                    realTimeStats.parentNode.removeChild(realTimeStats);
                }
            } finally {
                btn.disabled = false;
                btn.textContent = '开始实时统计测试';
            }
        }
    </script>
</body>
</html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`🚀 实时统计测试服务器启动成功!`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
});