# CC SKK 工具清单

## 项目概述
CC (Claude Code) 工具是一个TypeScript SDK，用于通过命令行界面与Claude进行交互。这是一个官方Python SDK的非官方移植版本，提供了经典的异步生成器API和现代的流式API。

## 核心开发工具



### 构建和开发
- **构建项目**: `npm run build`
- **开发模式（监听）**: `npm run dev`
- **类型检查**: `npm run typecheck`
- **运行测试**: `npm run test`
- **运行测试（覆盖率）**: `npm run test:coverage`
- **代码检查**: `npm run lint`
- **代码格式化**: `npm run format`
- **发布准备**: `npm run prepare`

### 测试工具
- **测试框架**: Vitest (TypeScript)
- **测试文件模式**: `*.test.ts`
- **测试环境**: Node.js
- **当前状态**: 需要创建测试套件

## 架构组件

### 核心模块
1. **内部客户端** (`src/_internal/client.ts`)
   - 通过子进程与Claude Code CLI通信
   - 处理消息解析和错误处理
   - 使用`SubprocessCLITransport`进行CLI通信

2. **流式API** (`src/fluent.ts`)
   - 提供可链式调用的QueryBuilder接口
   - 处理配置合并、权限、角色和模板
   - 主入口点：`claude()`函数

3. **经典API** (`src/index.ts`)
   - 保持与原始异步生成器的向后兼容性
   - 导出经典和流式API
   - 处理所有类型重新导出

4. **类型系统** (`src/types.ts`)
   - 所有Claude Code概念的完整TypeScript定义
   - 消息类型、工具定义、权限模式
   - 配置接口和流式类型

### 增强功能模块
- **重试策略** (`src/retry/`): 智能重试机制
- **错误处理** (`src/errors/`): 增强的错误类型和处理
- **权限管理** (`src/permissions/`): 细粒度工具访问控制
- **角色系统** (`src/roles/`): 基于角色的配置管理
- **流式处理** (`src/streaming/`): 令牌级别的流式支持
- **遥测** (`src/telemetry/`): 使用情况跟踪

## 构建系统

### 工具链
- **打包工具**: tsup (构建CJS和ESM格式)
- **TypeScript**: ES2022目标，严格模式启用
- **测试框架**: Vitest (Node.js环境)
- **代码检查**: ESLint + TypeScript解析器
- **代码格式化**: Prettier

### 依赖管理
#### 运行时依赖
- `execa`: CLI通信的进程执行
- `js-yaml`: YAML配置文件解析
- `which`: 跨平台命令查找

#### 开发依赖
- `typescript`: 语言和编译器
- `vitest`: 测试框架
- `tsup`: 打包工具
- `eslint` + `prettier`: 代码质量

## 部署和托管

### 部署平台
- **Vercel**: 无服务器部署
- **Railway**: 全栈应用部署
- **传统托管**: 通过Node.js服务器

### 配置文件
- `vercel.json`: Vercel部署配置
- `railway.json`: Railway部署配置
- `Procfile`: Heroku风格部署配置

## 示例和演示

### 功能演示
- **基础功能**: Hello World、文件操作、代码分析
- **交互式会话**: 实时对话和流式响应
- **项目脚手架**: 自动化项目创建
- **网络研究**: 信息收集和分析
- **错误处理**: 完善的错误恢复机制

### 增强功能演示
- **令牌流式**: 实时令牌级别的流式处理
- **重试策略**: 智能错误恢复
- **交互式流式**: 带打字机效果的实时交互

## 文档资源

### API文档
- **经典API**: `docs/CLASSIC_API.md`
- **流式API**: `docs/FLUENT_API.md`
- **增强功能**: `docs/ENHANCED_FEATURES.md`
- **错误处理**: `docs/ERROR_HANDLING.md`
- **环境变量**: `docs/ENVIRONMENT_VARIABLES.md`

### 部署文档
- **Railway部署**: `RAILWAY_DEPLOYMENT.md`
- **演示调用链**: `docs/demo-call-chains.md`

## 开发指南

### 代码质量
- **类型安全**: 保持严格的TypeScript合规性
- **向后兼容**: 保持经典API同时增强流式API
- **错误处理**: 使用增强的错误类型和解决提示
- **测试**: 为新功能创建全面的测试
- **文档**: 添加功能时更新README和示例

### 重要注意事项
- SDK通过子进程与Claude Code CLI通信，不是直接API调用
- 身份验证完全由CLI处理，SDK不处理
- 项目保持与原始Python SDK模式的向后兼容性
- 增强功能包括令牌流式、重试策略和高级错误处理

## 当前状态
- **版本**: 0.3.3（包含增强功能）
- **API状态**: 经典和流式API都可用
- **测试覆盖**: 当前无测试 - 需要测试套件
- **文档**: 包含示例的综合README
- **构建状态**: 工作的构建系统，支持双格式输出