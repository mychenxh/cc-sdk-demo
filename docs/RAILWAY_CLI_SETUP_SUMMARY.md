# Railway部署中Claude CLI安装与认证核心流程

## 📋 概述
本文档简要说明Claude Code SDK在Railway平台部署过程中的CLI安装和认证机制。

## 🏗️ 核心架构

### Railway配置 (`railway.json`)
```json
{
  "deploy": {
    "startCommand": "cd demo-real && npm install && npm install -g @anthropic-ai/claude-code --force && export PATH=$PATH:$(npm config get prefix)/bin:/usr/local/bin:/opt/nodejs/bin && which claude && npm start"
  }
}
```

## 📦 CLI自动安装流程

### 安装步骤
1. **全局安装**: `npm install -g @anthropic-ai/claude-code --force`
2. **路径配置**: `export PATH=$PATH:$(npm config get prefix)/bin:/usr/local/bin:/opt/nodejs/bin`
3. **安装验证**: `which claude`

### 安装位置
- **默认路径**: `/nix/store/fkyp1bm5gll9adnfcj92snyym524mdrj-nodejs-22.11.0/bin/claude`
- **版本信息**: Claude CLI v1.0.80 (Claude Code)

## 🔐 认证机制

### 认证脚本 (`init-claude-auth.sh`)

#### 认证流程
1. **环境检测**: 检查 `$RAILWAY_ENVIRONMENT` 变量
2. **CLI验证**: 确认 `claude` 命令可用
3. **状态检查**: `claude auth status` 验证已认证状态
4. **API Key认证**: 优先使用 `CLAUDE_API_KEY` 环境变量
5. **生产脚本**: 执行外部认证脚本 `claude_code_prod.sh`

#### 认证方式
1. **API Key认证** (推荐)
   ```bash
   # 自动创建认证配置
   mkdir -p ~/.config/claude
   cat > ~/.config/claude/auth.json << EOF
   {
     "api_key": "$CLAUDE_API_KEY",
     "created_at": "$(date -Iseconds)",
     "expires_at": null
   }
   EOF
   ```

2. **OAuth认证** (备选)
   ```bash
   claude login
   ```

3. **生产脚本认证** (深度配置)
   ```bash
   # 外部脚本执行
   timeout 300 ./claude_code_prod.sh
   ```

### 认证持久化
- **配置文件**: `~/.config/claude/auth.json`
- **缓存目录**: `~/.claude/cache/`
- **会话信息**: `~/.claude/sessions/`

## 🚀 部署时序

```
Railway部署启动
       ↓
执行startCommand
       ↓
安装项目依赖 + CLI
       ↓
配置PATH环境变量
       ↓
执行init-claude-auth.sh
       ↓
检查认证状态
       ↓
已认证 → 启动应用
未认证 → 执行认证流程
       ↓
启动应用服务器
```

## 🔧 关键配置

### 环境变量
```bash
# 必需变量
PORT=$PORT
NODE_ENV=production

# 认证变量 (推荐)
CLAUDE_API_KEY=your_anthropic_api_key
```

### 健康检查
- **健康端点**: `/api/health`
- **认证检查**: `/api/auth-check`
- **超时设置**: 60秒
- **检查间隔**: 30秒

## 📊 监控与验证

### 状态检查
```bash
# CLI版本检查
claude --version

# 认证状态
claude auth status

# 应用健康
curl https://your-app.railway.app/api/health
```

### 日志记录
- **执行日志**: `/tmp/claude_code_prod_execution.log`
- **Railway日志**: `railway logs`

## 🚨 故障排除

### 常见问题
1. **CLI安装失败**: 重新执行 `npm install -g @anthropic-ai/claude-code --force`
2. **认证失败**: 检查 `CLAUDE_API_KEY` 或执行 `claude login`
3. **PATH问题**: 重新配置 `export PATH=$PATH:$(npm config get prefix)/bin:/usr/local/bin:/opt/nodejs/bin`

### 调试命令
```bash
# 检查CLI状态
which claude
claude --version
claude auth status

# 检查配置
ls -la ~/.config/claude/
cat ~/.config/claude/auth.json
```

## 🎉 总结

Railway部署实现了Claude CLI的完全自动化安装和认证：

- ✅ **自动安装**: 通过startCommand自动安装CLI
- ✅ **智能认证**: 优先API Key，支持OAuth和生产脚本
- ✅ **持久化配置**: 认证状态在重启后保持
- ✅ **健康监控**: 完整的状态检查和日志记录
- ✅ **故障恢复**: 多重保障机制确保稳定运行

整个流程无需手动干预，实现了真正的"一键部署"体验。