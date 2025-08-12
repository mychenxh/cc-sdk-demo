// Claude Code SDK TypeScript 演示应用
// 注意：这是一个演示应用，实际的SDK调用需要在Node.js环境中运行

// 模拟的Claude SDK响应数据
const mockResponses = {
    basic: {
        success: true,
        data: "Hello! I'm Claude, an AI assistant created by Anthropic. How can I help you today?",
        timestamp: new Date().toISOString()
    },
    file: {
        success: true,
        data: {
            filesRead: ['src/index.ts', 'src/utils.ts', 'package.json'],
            filesModified: ['src/index.ts'],
            changes: [
                {
                    file: 'src/index.ts',
                    action: 'refactor',
                    description: '重构了主要的导出函数，提高了代码可读性'
                }
            ],
            summary: '成功重构了模块代码，优化了函数结构和类型定义'
        },
        timestamp: new Date().toISOString()
    },
    stream: {
        chunks: [
            "# 项目分析报告\n\n",
            "## 概述\n",
            "本项目是一个TypeScript SDK，",
            "用于与Claude AI进行交互。\n\n",
            "## 主要特性\n",
            "- 🚀 Fluent API设计\n",
            "- 📝 完整的TypeScript支持\n",
            "- 🔄 流式响应处理\n",
            "- 🛠️ 丰富的工具集成\n\n",
            "## 技术架构\n",
            "项目采用模块化设计，",
            "包含核心API、工具管理、",
            "权限控制等多个模块。\n\n",
            "## 使用建议\n",
            "建议在生产环境中配置适当的",
            "超时时间和错误处理机制。"
        ]
    },
    advanced: {
        success: true,
        data: {
            projectStructure: {
                totalFiles: 45,
                directories: ['src', 'examples', 'docs', 'dist'],
                mainFiles: [
                    'src/index.ts',
                    'src/fluent.ts', 
                    'src/parser.ts',
                    'src/types.ts'
                ],
                dependencies: {
                    production: ['execa', 'js-yaml', 'which'],
                    development: ['typescript', 'vitest', 'tsup']
                }
            },
            analysis: {
                codeQuality: 'Excellent',
                testCoverage: '85%',
                documentation: 'Comprehensive',
                maintainability: 'High'
            },
            recommendations: [
                '考虑添加更多的集成测试',
                '可以优化构建配置以减少包大小',
                '建议添加更多的使用示例'
            ]
        },
        logs: [
            { level: 'info', message: 'Starting project analysis...', timestamp: new Date().toISOString() },
            { level: 'info', message: 'Reading project structure...', timestamp: new Date().toISOString() },
            { level: 'info', message: 'Tool used: Read', timestamp: new Date().toISOString() },
            { level: 'info', message: 'Tool used: LS', timestamp: new Date().toISOString() },
            { level: 'success', message: 'Analysis completed successfully', timestamp: new Date().toISOString() }
        ],
        timestamp: new Date().toISOString()
    }
};

// 工具函数
function updateResult(elementId, content, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = content;
    }
}

function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
        const statusDiv = `<div class="status ${type}">${message}</div>`;
        element.innerHTML = statusDiv + element.innerHTML;
    }
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading"></div>正在处理请求...';
    }
}

function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. 基础用法示例
async function runBasicExample() {
    const resultId = 'basic-result';
    const button = event.target;
    
    try {
        button.disabled = true;
        showLoading(resultId);
        
        // 模拟API调用延迟
        await simulateDelay(1500);
        
        const response = mockResponses.basic;
        
        if (response.success) {
            const result = `✅ 基础查询成功！\n\n` +
                          `📝 响应内容：\n${response.data}\n\n` +
                          `⏰ 响应时间：${response.timestamp}\n\n` +
                          `🔧 使用的模型：claude-3-5-sonnet-20241022`;
            
            updateResult(resultId, result);
            showStatus(resultId, '基础查询执行成功', 'success');
        }
        
    } catch (error) {
        const errorMsg = `❌ 执行失败：${error.message}`;
        updateResult(resultId, errorMsg);
        showStatus(resultId, '基础查询执行失败', 'error');
    } finally {
        button.disabled = false;
    }
}

// 2. 文件操作示例
async function runFileExample() {
    const resultId = 'file-result';
    const button = event.target;
    
    try {
        button.disabled = true;
        showLoading(resultId);
        
        // 模拟文件操作延迟
        await simulateDelay(2000);
        
        const response = mockResponses.file;
        
        if (response.success) {
            const data = response.data;
            const result = `✅ 文件操作成功！\n\n` +
                          `📂 读取的文件：\n${data.filesRead.map(f => `  - ${f}`).join('\n')}\n\n` +
                          `✏️ 修改的文件：\n${data.filesModified.map(f => `  - ${f}`).join('\n')}\n\n` +
                          `🔄 执行的更改：\n${data.changes.map(c => `  - ${c.file}: ${c.description}`).join('\n')}\n\n` +
                          `📋 操作总结：\n${data.summary}\n\n` +
                          `⏰ 完成时间：${response.timestamp}`;
            
            updateResult(resultId, result);
            showStatus(resultId, '文件操作执行成功', 'success');
        }
        
    } catch (error) {
        const errorMsg = `❌ 执行失败：${error.message}`;
        updateResult(resultId, errorMsg);
        showStatus(resultId, '文件操作执行失败', 'error');
    } finally {
        button.disabled = false;
    }
}

// 3. 流式响应示例
async function runStreamExample() {
    const resultId = 'stream-result';
    const button = event.target;
    
    try {
        button.disabled = true;
        updateResult(resultId, '🌊 开始流式响应...\n\n');
        
        const chunks = mockResponses.stream.chunks;
        let accumulatedContent = '';
        
        // 模拟流式响应
        for (let i = 0; i < chunks.length; i++) {
            await simulateDelay(300); // 每个chunk之间的延迟
            accumulatedContent += chunks[i];
            
            const progress = Math.round(((i + 1) / chunks.length) * 100);
            const result = `🌊 流式响应进行中... (${progress}%)\n\n` +
                          `📝 已接收内容：\n${accumulatedContent}\n\n` +
                          `📊 进度：${i + 1}/${chunks.length} chunks`;
            
            updateResult(resultId, result);
        }
        
        // 完成状态
        const finalResult = `✅ 流式响应完成！\n\n` +
                           `📝 完整内容：\n${accumulatedContent}\n\n` +
                           `📊 统计信息：\n` +
                           `  - 总chunks数：${chunks.length}\n` +
                           `  - 总字符数：${accumulatedContent.length}\n` +
                           `  - 平均延迟：300ms/chunk`;
        
        updateResult(resultId, finalResult);
        showStatus(resultId, '流式响应执行成功', 'success');
        
    } catch (error) {
        const errorMsg = `❌ 执行失败：${error.message}`;
        updateResult(resultId, errorMsg);
        showStatus(resultId, '流式响应执行失败', 'error');
    } finally {
        button.disabled = false;
    }
}

// 4. 高级配置示例
async function runAdvancedExample() {
    const resultId = 'advanced-result';
    const button = event.target;
    
    try {
        button.disabled = true;
        showLoading(resultId);
        
        // 模拟高级配置处理延迟
        await simulateDelay(2500);
        
        const response = mockResponses.advanced;
        
        if (response.success) {
            const data = response.data;
            
            // 显示日志信息
            let logOutput = '📋 执行日志：\n';
            response.logs.forEach(log => {
                const icon = log.level === 'success' ? '✅' : log.level === 'error' ? '❌' : 'ℹ️';
                logOutput += `${icon} [${log.level.toUpperCase()}] ${log.message}\n`;
            });
            
            const result = `✅ 高级配置执行成功！\n\n` +
                          logOutput + '\n' +
                          `📊 项目结构分析：\n` +
                          `  - 总文件数：${data.projectStructure.totalFiles}\n` +
                          `  - 主要目录：${data.projectStructure.directories.join(', ')}\n` +
                          `  - 核心文件：${data.projectStructure.mainFiles.join(', ')}\n\n` +
                          `📈 代码质量评估：\n` +
                          `  - 代码质量：${data.analysis.codeQuality}\n` +
                          `  - 测试覆盖率：${data.analysis.testCoverage}\n` +
                          `  - 文档完整性：${data.analysis.documentation}\n` +
                          `  - 可维护性：${data.analysis.maintainability}\n\n` +
                          `💡 优化建议：\n${data.recommendations.map(r => `  - ${r}`).join('\n')}\n\n` +
                          `⚙️ 配置信息：\n` +
                          `  - 超时时间：30000ms\n` +
                          `  - 日志级别：JSON Logger\n` +
                          `  - 允许工具：Read, LS\n` +
                          `  - 事件监听：Message, ToolUse\n\n` +
                          `⏰ 完成时间：${response.timestamp}`;
            
            updateResult(resultId, result);
            showStatus(resultId, '高级配置执行成功', 'success');
        }
        
    } catch (error) {
        const errorMsg = `❌ 执行失败：${error.message}`;
        updateResult(resultId, errorMsg);
        showStatus(resultId, '高级配置执行失败', 'error');
    } finally {
        button.disabled = false;
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Claude Code SDK TypeScript 演示应用已加载');
    console.log('📝 注意：这是一个前端演示应用，使用模拟数据展示API功能');
    console.log('🔧 实际的SDK调用需要在Node.js环境中运行');
    
    // 添加一些交互提示
    const cards = document.querySelectorAll('.demo-card');
    cards.forEach((card, index) => {
        card.addEventListener('mouseenter', function() {
            console.log(`💡 悬停在示例 ${index + 1} 上`);
        });
    });
});

// 导出函数供HTML调用
window.runBasicExample = runBasicExample;
window.runFileExample = runFileExample;
window.runStreamExample = runStreamExample;
window.runAdvancedExample = runAdvancedExample;