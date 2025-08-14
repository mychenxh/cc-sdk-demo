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

### 4. Railway 环境中的 Claude CLI 认证

#### 🚀 自动化认证（推荐）

我们已经创建了完整的自动化脚本，可以大大简化认证流程：

##### 快速开始（一键式）

```bash
# 完整的自动化部署和认证流程
npm run deploy:full

# 或者分步执行
npm run railway:setup    # 设置 Railway CLI
npm run railway:auth     # 执行 Claude CLI 认证
npm run railway:verify   # 验证认证状态
```

##### 自动化脚本说明

| 脚本命令 | 功能描述 |
|---------|----------|
| `npm run railway:setup` | 自动安装和配置 Railway CLI |
| `npm run railway:auth` | 半自动化 Claude CLI 认证流程 |
| `npm run railway:verify` | 验证应用和认证状态 |
| `npm run railway:health` | 执行健康检查 |
| `npm run railway:monitor` | 启动持续监控模式 |
| `npm run deploy:setup` | 完整的设置和认证流程 |
| `npm run deploy:full` | 构建部署 + 设置认证 + 验证 |
| `npm run deploy:auto` | 完整的自动化部署流程 |

#### 🔧 手动认证步骤

如果自动化脚本无法使用，可以按照以下步骤手动完成认证：

1. **等待部署完成**：确保应用成功部署到 Railway

2. **启动 Railway 终端**：
   - 进入 Railway 项目控制台
   - 点击 "Terminal" 或 "Web Terminal"
   - 等待终端启动完成

3. **验证 CLI 安装**：
   ```bash
   claude --version
   ```
   应该显示 Claude CLI 版本信息

4. **运行认证命令**：
   ```bash
   claude login
   ```

5. **完成 OAuth 认证**：
   - 命令会提供一个认证 URL
   - 复制 URL 到浏览器中打开
   - 使用你的 Anthropic 账户登录
   - 授权完成后，CLI 会显示认证成功

6. **验证认证状态**：
   ```bash
   claude auth status
   ```

7. **重启应用**（可选）：
   - 在 Railway 控制台重启应用
   - 或等待应用自动重启

#### 重要提示

- **每次重新部署**：Railway 重新部署后可能需要重新认证
- **认证持久性**：认证令牌通常在 Railway 容器重启后仍然有效
- **多环境问题**：如果使用多个 Railway 环境，每个环境都需要单独认证

### 5. 部署配置

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

### 6. 自动部署

1. 推送代码到 GitHub 仓库
2. Railway 会自动检测更改并开始部署
3. 部署完成后，Railway 会提供一个公共 URL

### 7. 访问应用

部署成功后，你可以通过以下端点访问应用：

- **主页**: `https://your-app.railway.app/`
- **健康检查**: `https://your-app.railway.app/api/health`
- **CLI 状态**: `https://your-app.railway.app/api/auth-check`
- **流式演示**: `https://your-app.railway.app/simple-real-demo.html`

## 8. 本地测试 Railway 配置

在部署前，可以本地测试 Railway 启动命令：

```bash
# 测试 Railway 启动脚本
npm run railway:start

# 或者直接运行启动命令
cd demo-real && npm install && npm start
```

## 9. 故障排除

### 1. 部署失败

- 检查 Railway 构建日志
- 确认 `demo-real/package.json` 中的依赖项正确
- 验证启动命令路径

### 2. 应用无法启动

- 检查环境变量配置
- 确认端口配置正确（使用 `$PORT`）
- 查看应用日志

### 3. Claude CLI 认证问题

- 确认 Claude CLI 已正确安装：`claude --version`
- 检查认证状态：`claude auth status`
- 如果未认证，按照上述步骤重新运行 `claude login`
- 确保在 Railway 终端中完成认证流程

## 10. 成本估算

 Railway 免费计划包括：
- $5/月 免费额度
- 512MB RAM
- 1GB 磁盘空间
- 无限制的构建时间

对于演示项目，免费计划通常足够使用。

## 11. 监控和日志

1. **实时日志**: Railway 控制台提供实时日志查看
2. **指标监控**: CPU、内存使用情况监控
3. **部署历史**: 查看所有部署记录
4. **回滚功能**: 一键回滚到之前的版本

## 12. 更新部署

1. 推送代码到 GitHub
2. Railway 自动检测并部署
3. 零停机时间更新

## 13. 自动化脚本详解

### 📁 脚本文件结构

```
scripts/
├── railway-setup.sh      # Railway CLI 自动化设置
├── claude-auth.sh        # Claude CLI 认证脚本
├── verify-auth.sh        # 认证状态验证脚本
└── health-check.sh       # 健康检查和自动恢复
```

### 🛠️ 脚本功能详解

#### railway-setup.sh
- 自动安装 Railway CLI
- 处理 Railway 登录
- 自动连接项目
- 显示项目信息

#### claude-auth.sh
- 半自动化 Claude CLI 认证流程
- 引导用户完成 OAuth 认证
- 自动验证认证结果
- 测试应用功能

#### verify-auth.sh
- 全面检查系统状态
- 验证 Railway CLI 连接
- 检查应用健康状态
- 验证 Claude CLI 认证
- 生成详细状态报告

#### health-check.sh
- 持续健康监控
- 自动故障检测
- 自动恢复功能
- 重试机制
- 日志记录

### 🎯 使用场景

#### 首次部署
```bash
# 一键式完整部署
npm run deploy:full
```

#### 日常维护
```bash
# 健康检查
npm run railway:health

# 状态验证
npm run railway:verify

# 持续监控
npm run railway:monitor
```

#### 故障恢复
```bash
# 重新认证
npm run railway:auth

# 完整恢复流程
npm run deploy:setup
```

### ⚙️ 高级配置

#### 环境变量配置
```bash
# 启用调试模式
DEBUG=true npm run railway:verify

# 自定义重试参数
MAX_RETRIES=5 npm run railway:health

# 设置监控间隔
HEALTH_CHECK_INTERVAL=600 npm run railway:monitor
```

#### Webhook 通知
```bash
# 配置通知 Webhook
export WEBHOOK_URL="https://hooks.slack.com/services/..."
npm run railway:monitor
```

### 🔍 故障排除

#### 脚本权限问题
```bash
# 确保脚本有执行权限
chmod +x scripts/*.sh
```

#### Railway CLI 问题
```bash
# 重新安装 Railway CLI
npm install -g @railway/cli

# 重新登录
railway logout && railway login
```

#### 认证失败
```bash
# 清理认证状态
railway ssh --command "rm -rf ~/.claude"

# 重新认证
npm run railway:auth
```

### 📊 监控和日志

#### 日志文件
- `health-check.log` - 健康检查日志
- 所有脚本都会记录详细的操作日志

#### 监控指标
- Railway CLI 连接状态
- 应用健康状态
- Claude CLI 认证状态
- 自动恢复成功率

---

**重要提醒**: Railway 支持长时间运行的应用，非常适合需要保持 Claude CLI 连接的项目。相比 Vercel 的 serverless 限制，Railway 提供了更好的兼容性。现在通过自动化脚本，认证和管理过程已经大大简化，但请注意每次重新部署后可能需要重新进行 Claude CLI 认证。