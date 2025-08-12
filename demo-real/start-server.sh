#!/bin/bash

# Claude SDK Demo Server 启动脚本

echo "🚀 启动 Claude SDK Demo Server..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "📦 检查依赖..."
# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

echo "🔍 检查端口3001..."
# 检查端口是否被占用
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口3001被占用，正在终止占用进程..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "🎯 启动服务器..."
# 启动服务器
node server.js &
SERVER_PID=$!

echo "⏳ 等待服务器启动..."
sleep 3

# 检查服务器是否成功启动
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ 服务器启动成功！"
    echo "📱 访问地址: http://localhost:3001"
    echo "🔧 API健康检查: http://localhost:3001/api/health"
    echo "📝 进程ID: $SERVER_PID"
    echo "📋 日志文件: server.log"
    echo ""
    echo "🌟 服务器运行中... 按 Ctrl+C 停止服务器"
    
    # 等待用户中断
    wait $SERVER_PID
else
    echo "❌ 服务器启动失败"
    exit 1
fi