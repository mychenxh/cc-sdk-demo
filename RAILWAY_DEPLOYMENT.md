# Railway 部署指南

本文档介绍如何将 Claude Code SDK Demo 项目部署到 Railway 平台。

## Railway 优势

- ✅ **免费计划**：每月提供 $5 免费额度
- ✅ **长时间运行**：支持持续运行的 Node.js 应用
- ✅ **保留 CLI 功能**：可以完整使用 Claude CLI 功能
- ✅ **自动部署**：Git 推送后自动部署
- ✅ **环境变量管理**：方便的环境变量配置

## 部署步骤

### 1. 准备 Railway 账户

1. 访问 [Railway.app](https://railway.app)
2. 使用 GitHub 账户登录
3. 验证邮箱地址

### 2. 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的 Claude Code SDK 仓库
4. Railway 会自动检测到 Node.js 项目

### 3. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

```
NODE_ENV=production
PORT=$PORT  # Railway 自动提供
```

如果需要 Claude CLI 认证，还需要添加：
```
CLAUDE_API_KEY=your_api_key_here
```

### 4. 部署配置

项目已包含以下配置文件：

#### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd demo-real && npm install && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "environments": {
    "production": {
      "variables": {
        "NODE_ENV": "production",
        "PORT": "$PORT"
      }
    }
  }
}
```

#### `Procfile`
```
web: cd demo-real && npm install && npm start
```

### 5. 自动部署

1. 推送代码到 GitHub 仓库
2. Railway 会自动检测更改并开始部署
3. 部署完成后，Railway 会提供一个公共 URL

### 6. 访问应用

部署成功后，你可以通过以下端点访问应用：

- **主页**: `https://your-app.railway.app/`
- **健康检查**: `https://your-app.railway.app/health`
- **CLI 状态**: `https://your-app.railway.app/claude-status`
- **流式演示**: `https://your-app.railway.app/stream`

## 本地测试 Railway 配置

在部署前，可以本地测试 Railway 启动命令：

```bash
# 测试 Railway 启动脚本
npm run railway:start

# 或者直接运行启动命令
cd demo-real && npm install && npm start
```

## 故障排除

### 1. 部署失败

- 检查 Railway 构建日志
- 确认 `demo-real/package.json` 中的依赖项正确
- 验证启动命令路径

### 2. 应用无法启动

- 检查环境变量配置
- 确认端口配置正确（使用 `$PORT`）
- 查看应用日志

### 3. Claude CLI 问题

- 确认 Claude CLI 已正确安装
- 检查 API 密钥配置
- 验证认证状态

## 成本估算

 Railway 免费计划包括：
- $5/月 免费额度
- 512MB RAM
- 1GB 磁盘空间
- 无限制的构建时间

对于演示项目，免费计划通常足够使用。

## 监控和日志

1. **实时日志**: Railway 控制台提供实时日志查看
2. **指标监控**: CPU、内存使用情况监控
3. **部署历史**: 查看所有部署记录
4. **回滚功能**: 一键回滚到之前的版本

## 更新部署

1. 推送代码到 GitHub
2. Railway 自动检测并部署
3. 零停机时间更新

---

**注意**: Railway 支持长时间运行的应用，非常适合需要保持 Claude CLI 连接的项目。相比 Vercel 的 serverless 限制，Railway 提供了更好的兼容性。