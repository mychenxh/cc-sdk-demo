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

echo "🔧 开始 Claude CLI 自动认证......"

# 检查是否在 Railway 环境
if [ -z "$RAILWAY_ENVIRONMENT" ]; then
    echo "⚠️  不在 Railway 环境，跳过自动认证"
    exit 0
fi

# 更新 PATH 以包含 npm 全局包
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:/opt/nodejs/bin"

# 检查 Claude CLI 是否已安装
if ! command -v claude &> /dev/null; then
    echo "📦 安装 Claude CLI..."
    npm install -g @anthropic-ai/claude-code
    
    # 重新加载 PATH
    export PATH="$PATH:$(npm config get prefix)/bin"
    
    # 等待一下让安装完成
    sleep 2
fi

# 检查 CLI 是否可用
if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "未知版本")
    echo "✅ Claude CLI 已安装: $CLAUDE_VERSION"
else
    echo "❌ Claude CLI 安装失败"
    echo "💡 请在 Railway 终端手动运行: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# 检查是否已认证
if claude auth status &> /dev/null 2>&1; then
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
    
    # 等待一下让配置生效
    sleep 1
    
    # 验证认证状态
    if claude auth status &> /dev/null 2>&1; then
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

# 执行外部 Claude Code 生产脚本
echo "🚀 执行 Claude Code 生产脚本..."
if [ -f "./claude_code_prod.sh" ]; then
    echo "📝 发现生产脚本，开始执行..."
    
    # 创建执行日志文件
    LOG_FILE="/tmp/claude_code_prod_execution.log"
    
    # 记录执行开始时间
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始执行 Claude Code 生产脚本" > "$LOG_FILE"
    echo "脚本文件: $(pwd)/claude_code_prod.sh" >> "$LOG_FILE"
    echo "脚本大小: $(wc -c < ./claude_code_prod.sh) 字节" >> "$LOG_FILE"
    echo "脚本权限: $(ls -la ./claude_code_prod.sh | awk '{print $1}')" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    # 执行脚本并记录输出
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始执行脚本内容..." >> "$LOG_FILE"
    if timeout 300 ./claude_code_prod.sh >> "$LOG_FILE" 2>&1; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Claude Code 生产脚本执行成功" >> "$LOG_FILE"
        echo "✅ Claude Code 生产脚本执行成功"
        
        # 显示脚本执行的关键信息
        if [ -f "$LOG_FILE" ]; then
            echo "📋 执行摘要:"
            echo "   开始时间: $(head -1 "$LOG_FILE" | cut -d'[' -f2 | cut -d']' -f1)"
            echo "   结束时间: $(tail -1 "$LOG_FILE" | cut -d'[' -f2 | cut -d']' -f1)"
            echo "   日志文件: $LOG_FILE"
            echo "   执行时长: 约5分钟"
            
            # 检查脚本是否修改了CLI配置
            if grep -i "claude\|auth\|login" "$LOG_FILE" > /dev/null; then
                echo "🔍 检测到脚本可能修改了CLI配置，重新验证认证状态..."
                sleep 2
                if claude auth status &> /dev/null 2>&1; then
                    echo "🎉 脚本执行后 Claude CLI 已认证！"
                else
                    echo "⚠️  脚本执行后仍需要认证"
                fi
            fi
        fi
    else
        exit_code=$?
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Claude Code 生产脚本执行失败 (退出码: $exit_code)" >> "$LOG_FILE"
        echo "❌ Claude Code 生产脚本执行失败 (退出码: $exit_code)"
        
        # 显示错误信息
        if [ -f "$LOG_FILE" ]; then
            echo "📋 错误详情:"
            tail -20 "$LOG_FILE"
            echo "🔍 完整日志: $LOG_FILE"
        fi
    fi
    
    # 显示脚本执行结果（最后20行）
    if [ -f "$LOG_FILE" ]; then
        echo ""
        echo "📊 脚本执行结果 (最后20行):"
        echo "================================"
        tail -20 "$LOG_FILE"
        echo "================================"
    fi
else
    echo "⚠️  未找到 Claude Code 生产脚本，跳过执行"
    echo "💡 如果需要执行生产脚本，请确保文件存在于: ./claude_code_prod.sh"
fi

echo "🔧 Claude CLI 认证脚本完成"