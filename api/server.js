import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname的替代方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        server: 'Claude SDK Demo Server',
        version: '1.0.0',
        auth: 'Claude Code CLI'
    });
});

// CLI认证检查端点
app.get('/api/auth-check', async (req, res) => {
    try {
        console.log('🔐 检查Claude Code CLI认证状态...');
        
        // 简单的CLI检查 - 尝试运行claude --version
        const { execa } = await import('execa');
        
        try {
            const { stdout } = await execa('claude', ['--version']);
            const isAuthenticated = stdout.includes('claude') || stdout.includes('Claude');
            
            res.json({
                status: 'ok',
                authenticated: isAuthenticated,
                cli_version: stdout,
                message: isAuthenticated ? 'Claude Code CLI 已安装并可用' : 'Claude Code CLI 需要登录认证',
                timestamp: new Date().toISOString()
            });
        } catch (cliError) {
            res.json({
                status: 'warning',
                authenticated: false,
                error: 'Claude Code CLI 未找到或未正确安装',
                message: '请运行: claude login',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.json({
            status: 'error',
            authenticated: false,
            error: error.message,
            message: '认证检查失败',
            timestamp: new Date().toISOString()
        });
    }
});

// 流式响应端点
app.post('/api/streaming-query', async (req, res) => {
    const { prompt, allowedTools, permissionMode, cwd } = req.body;
    
    console.log('🌊 收到流式查询请求:', {
        prompt: prompt ? prompt.substring(0, 50) + '...' : '未提供',
        allowedTools: allowedTools || '默认工具',
        permissionMode: permissionMode || '默认权限模式',
        cwd: cwd || '当前工作目录'
    });
    
    // 设置SSE响应头
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type'
    });
    
    // 发送初始连接确认
    res.write(`data: ${JSON.stringify({type: "connected", message: "流式连接已建立"})}\n\n`);
    
    // 模拟流式响应
    const mockResponse = "这是一个模拟的Claude SDK响应。在Vercel部署环境中，实际的Claude Code SDK调用可能需要额外的配置。";
    
    // 逐字符发送响应
    for (let i = 0; i < mockResponse.length; i++) {
        const char = mockResponse[i];
        res.write(`data: ${JSON.stringify({type: "content", content: char})}\n\n`);
        // 添加延迟以模拟真实的流式效果
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 发送完成信号
    res.write(`data: ${JSON.stringify({type: "done", message: "响应完成"})}\n\n`);
    res.end();
});

// 保持GET端点以支持向后兼容
app.get('/api/streaming-query', async (req, res) => {
    const { prompt, allowedTools, permissionMode, cwd } = req.query;
    
    console.log('🌊 收到GET流式查询请求:', {
        prompt: prompt ? prompt.substring(0, 50) + '...' : '未提供',
        allowedTools: allowedTools || '默认工具',
        permissionMode: permissionMode || '默认权限模式',
        cwd: cwd || '当前工作目录'
    });
    
    // 设置SSE响应头
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // 发送初始连接确认
    res.write(`data: ${JSON.stringify({type: "connected", message: "流式连接已建立"})}\n\n`);
    
    // 模拟流式响应
    const mockResponse = "这是一个模拟的Claude SDK响应。在Vercel部署环境中，实际的Claude Code SDK调用可能需要额外的配置。";
    
    // 逐字符发送响应
    for (let i = 0; i < mockResponse.length; i++) {
        const char = mockResponse[i];
        res.write(`data: ${JSON.stringify({type: "content", content: char})}\n\n`);
        // 添加延迟以模拟真实的流式效果
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 发送完成信号
    res.write(`data: ${JSON.stringify({type: "done", message: "响应完成"})}\n\n`);
    res.end();
});

// 导出为Vercel函数
export default app;