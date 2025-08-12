/**
 * Claude Code SDK - 浏览器版本
 * 这是一个简化的浏览器兼容版本，用于演示目的
 */

// Claude SDK 浏览器版本类
function ClaudeBrowserSDK(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.anthropic.com';
    this.defaultModel = 'claude-3-haiku-20240307';
}

// 基础查询方法
ClaudeBrowserSDK.prototype.query = function(prompt, options) {
    var self = this;
    options = options || {};
    
    return new Promise(function(resolve, reject) {
        var requestBody = {
            model: options.model || self.defaultModel,
            max_tokens: options.maxTokens || 1000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        };
        
        // 如果有系统消息，添加到请求中
        if (options.systemMessage) {
            requestBody.system = options.systemMessage;
        }
        
        fetch(self.baseUrl + '/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': self.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('API请求失败: ' + response.status + ' ' + response.statusText);
            }
            return response.json();
        })
        .then(function(data) {
            if (data.error) {
                throw new Error(data.error.message || '未知API错误');
            }
            
            resolve({
                content: data.content[0].text,
                model: data.model,
                usage: data.usage,
                id: data.id,
                role: data.role,
                type: data.type
            });
        })
        .catch(function(error) {
            reject(error);
        });
    });
};

// 流式查询方法（简化版）
ClaudeBrowserSDK.prototype.queryStream = function(prompt, options, onChunk) {
    var self = this;
    options = options || {};
    
    return new Promise(function(resolve, reject) {
        var requestBody = {
            model: options.model || self.defaultModel,
            max_tokens: options.maxTokens || 1000,
            messages: [{
                role: 'user',
                content: prompt
            }],
            stream: true
        };
        
        if (options.systemMessage) {
            requestBody.system = options.systemMessage;
        }
        
        fetch(self.baseUrl + '/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': self.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('API请求失败: ' + response.status + ' ' + response.statusText);
            }
            
            var reader = response.body.getReader();
            var decoder = new TextDecoder();
            var buffer = '';
            
            function readStream() {
                return reader.read().then(function(result) {
                    if (result.done) {
                        resolve();
                        return;
                    }
                    
                    buffer += decoder.decode(result.value, { stream: true });
                    var lines = buffer.split('\n');
                    buffer = lines.pop(); // 保留不完整的行
                    
                    lines.forEach(function(line) {
                        if (line.startsWith('data: ')) {
                            var data = line.slice(6);
                            if (data === '[DONE]') {
                                resolve();
                                return;
                            }
                            
                            try {
                                var parsed = JSON.parse(data);
                                if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
                                    onChunk(parsed.delta.text);
                                }
                            } catch (e) {
                                // 忽略解析错误
                            }
                        }
                    });
                    
                    return readStream();
                });
            }
            
            return readStream();
        })
        .catch(function(error) {
            reject(error);
        });
    });
};

// 代码分析方法
ClaudeBrowserSDK.prototype.analyzeCode = function(codeContent, language, analysisType) {
    var systemMessage = '你是一个专业的代码分析师。请分析提供的代码并提供详细的反馈。';
    
    var prompt = '请分析以下' + (language || '代码') + '：\n\n' + codeContent + '\n\n';
    
    switch (analysisType) {
        case 'quality':
            prompt += '请重点关注代码质量，包括可读性、可维护性、性能等方面。';
            break;
        case 'security':
            prompt += '请重点关注安全性问题，识别潜在的安全漏洞。';
            break;
        case 'optimization':
            prompt += '请提供性能优化建议和最佳实践。';
            break;
        default:
            prompt += '请提供全面的代码分析，包括质量、安全性、性能等各个方面。';
    }
    
    return this.query(prompt, {
        systemMessage: systemMessage,
        model: 'claude-3-sonnet-20240229',
        maxTokens: 2000
    });
};

// 文件操作模拟方法
ClaudeBrowserSDK.prototype.generateCode = function(description, language, requirements) {
    var systemMessage = '你是一个专业的软件开发工程师。请根据用户需求生成高质量的代码。';
    
    var prompt = '请生成' + (language || 'TypeScript') + '代码：\n\n' +
                '需求描述：' + description + '\n\n';
    
    if (requirements && requirements.length > 0) {
        prompt += '具体要求：\n';
        requirements.forEach(function(req, index) {
            prompt += (index + 1) + '. ' + req + '\n';
        });
        prompt += '\n';
    }
    
    prompt += '请提供完整的代码实现，包括必要的注释和使用示例。';
    
    return this.query(prompt, {
        systemMessage: systemMessage,
        model: 'claude-3-sonnet-20240229',
        maxTokens: 3000
    });
};

// 项目分析方法
ClaudeBrowserSDK.prototype.analyzeProject = function(projectInfo) {
    var systemMessage = '你是一个资深的软件架构师和项目分析专家。请对项目进行全面分析。';
    
    var prompt = '请分析以下项目：\n\n' +
                '项目信息：\n' + JSON.stringify(projectInfo, null, 2) + '\n\n' +
                '请提供以下方面的分析：\n' +
                '1. 项目结构和架构评估\n' +
                '2. 代码质量和最佳实践\n' +
                '3. 潜在的改进建议\n' +
                '4. 技术栈评估\n' +
                '5. 维护性和扩展性分析';
    
    return this.query(prompt, {
        systemMessage: systemMessage,
        model: 'claude-3-sonnet-20240229',
        maxTokens: 3000
    });
};

// 验证API密钥
ClaudeBrowserSDK.prototype.validateApiKey = function() {
    return this.query('Hi', {
        model: 'claude-3-haiku-20240307',
        maxTokens: 10
    })
    .then(function() {
        return true;
    })
    .catch(function() {
        return false;
    });
};

// 获取可用模型列表
ClaudeBrowserSDK.prototype.getAvailableModels = function() {
    return [
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229'
    ];
};

// 导出SDK类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClaudeBrowserSDK;
} else {
    window.ClaudeBrowserSDK = ClaudeBrowserSDK;
}

// 创建SDK实例的工厂函数
function createClaudeSDK(apiKey, baseUrl) {
    return new ClaudeBrowserSDK(apiKey, baseUrl);
}

if (typeof window !== 'undefined') {
    window.createClaudeSDK = createClaudeSDK;
}