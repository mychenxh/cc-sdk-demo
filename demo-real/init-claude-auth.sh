#!/bin/bash

# Railway Claude CLI 自动认证脚本
# 在 Railway 环境中自动设置 Claude CLI 认证

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔧 开始 Claude CLI 自动认证..."

# 检查是否在 Railway 环境
if [ -z "$RAILWAY_ENVIRONMENT" ]; then
    echo "⚠️  不在 Railway 环境，跳过自动认证"
    exit 0
fi

# 检查 Claude CLI 是否已安装
if ! command -v claude &> /dev/null; then
    echo "📦 安装 Claude CLI..."
    npm install -g @anthropic-ai/claude-code
fi

echo "✅ Claude CLI 已安装: $(claude --version)"

# 检查是否已认证
if claude auth status &> /dev/null; then
    echo "🔐 Claude CLI 已认证，跳过认证步骤"
    exit 0
fi

echo "🔐 Claude CLI 需要认证..."

# 检查是否有 API Key
if [ -n "$CLAUDE_API_KEY" ]; then
    echo "🔑 使用 API Key 进行认证..."
    
    # 创建配置目录
    mkdir -p ~/.config/claude
    
    # 创建认证配置文件
    cat > ~/.config/claude/auth.json << EOF
{
  "api_key": "$CLAUDE_API_KEY",
  "created_at": "$(date -Iseconds)",
  "expires_at": null
}
EOF
    
    echo "✅ API Key 认证配置完成"
    
    # 验证认证状态
    if claude auth status &> /dev/null; then
        echo "🎉 Claude CLI 认证成功！"
    else
        echo "❌ API Key 认证失败，需要手动认证"
        echo "请在 Railway 终端运行: claude login"
    fi
else
    echo "⚠️  未找到 CLAUDE_API_KEY 环境变量"
    echo "请在 Railway 环境变量中设置 CLAUDE_API_KEY"
    echo "或者手动在 Railway 终端运行: claude login"
fi

echo "🔧 Claude CLI 认证脚本完成"