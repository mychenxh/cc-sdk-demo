# Claude Code CLI 内置工具集

## 概述

Claude Code CLI 提供了 15 个内置工具，使 Claude 能够与您的开发环境进行交互。这些工具设计为安全、可控且对软件开发任务至关重要。

## 工具清单与详细说明

### 1. **Read** - 文件读取工具

**用途**: 从本地文件系统读取文件内容

**关键参数**:
- `file_path` (字符串, 必需): 要读取的文件的绝对路径
- `offset` (数字, 可选): 开始读取的行号
- `limit` (数字, 可选): 要读取的行数

**返回类型**: 带行号的文件内容，每行最多 2000 个字符

**特殊功能**:
- 可以读取图像 (PNG, JPG)、PDF 和 Jupyter 笔记本
- 自动处理不同文件类型并进行适当处理
- 当由多模态 LLM 处理时，返回图像的视觉内容

**使用示例**:
```typescript
// 读取完整文件
const content = await claude()
  .allowTools('Read')
  .query('读取 src/index.ts 文件的内容')
  .asText();

// 读取文件的前 50 行
const partialContent = await claude()
  .allowTools('Read')
  .query('从第 100 行开始读取 50 行')
  .asText();
```

### 2. **Write** - 文件写入工具

**用途**: 在本地文件系统上创建或覆盖文件

**关键参数**:
- `file_path` (字符串, 必需): 要写入的文件的绝对路径
- `content` (字符串, 必需): 要写入文件的内容

**返回类型**: 成功/失败状态

**重要说明**:
- 将覆盖现有文件而不发出警告
- 编辑前必须先读取文件（要求）
- 用于创建新文件或完全替换

**使用示例**:
```typescript
// 创建新文件
await claude()
  .allowTools('Write')
  .query('创建一个包含 Hello World 的 README.md 文件')
  .asText();
```

### 3. **Edit** - 文件编辑工具

**用途**: 在现有文件中进行精确的字符串替换

**关键参数**:
- `file_path` (字符串, 必需): 要修改的文件的绝对路径
- `old_string` (字符串, 必需): 要替换的文本
- `new_string` (字符串, 必需): 替换用的文本
- `replace_all` (布尔值, 可选): 替换所有出现的位置（默认：false）

**返回类型**: 成功/失败状态

**要求**:
- 编辑前必须读取文件
- `old_string` 必须完全匹配（包括空格）
- 如果 `old_string` 不唯一且 `replace_all` 为 false，则会失败

**使用示例**:
```typescript
// 替换单个字符串
await claude()
  .allowTools('Read', 'Edit')
  .query('将函数名从 foo 改为 bar')
  .asText();

// 替换所有出现的位置
await claude()
  .allowTools('Read', 'Edit')
  .query('将所有的 console.log 改为 logger.info')
  .asText();
```

### 4. **Bash** - 命令行执行工具

**用途**: 在持久 shell 会话中执行 bash 命令

**关键参数**:
- `command` (字符串, 必需): 要执行的命令
- `timeout` (数字, 可选): 超时时间（毫秒，最多 10 分钟）
- `description` (字符串, 可选): 命令的简要描述
- `run_in_background` (布尔值, 可选): 在后台运行命令

**返回类型**: 带有 stdout 和 stderr 的命令输出

**安全特性**:
- 正确处理带空格的路径
- 跨多个调用的持久 shell 会话
- 超时保护
- 后台执行能力

**使用示例**:
```typescript
// 运行构建命令
await claude()
  .allowTools('Bash')
  .query('运行 npm run build')
  .asText();

// 在后台运行长时间任务
await claude()
  .allowTools('Bash')
  .query('在后台运行 npm run dev')
  .asText();
```

### 5. **Grep** - 代码搜索工具

**用途**: 基于 ripgrep 的强大搜索工具，用于快速代码搜索

**关键参数**:
- `pattern` (字符串, 必需): 要搜索的正则表达式模式
- `path` (字符串, 可选): 要搜索的文件或目录
- `glob` (字符串, 可选): 过滤文件的 glob 模式
- `output_mode` (字符串): "content"、"files_with_matches" 或 "count"
- `-A`, `-B`, `-C` (数字): 匹配后/前/周围的上下文行数
- `-n` (布尔值): 显示行号
- `-i` (布尔值): 不区分大小写搜索
- `type` (字符串): 文件类型 (js, py, rust 等)
- `head_limit` (数字): 限制结果数量
- `multiline` (布尔值): 启用多行模式匹配

**返回类型**: 带有匹配行和上下文的搜索结果

**使用示例**:
```typescript
// 搜索函数定义
await claude()
  .allowTools('Grep')
  .query('在所有 TypeScript 文件中搜索名为 getUser 的函数')
  .asText();

// 搜索带上下文的错误处理
await claude()
  .allowTools('Grep')
  .query('搜索所有 try-catch 块，并显示前后 2 行上下文')
  .asText();
```

### 6. **Glob** - 文件模式匹配工具

**用途**: 通过名称模式快速查找文件

**关键参数**:
- `pattern` (字符串, 必需): 匹配文件的 glob 模式
- `path` (字符串, 可选): 要搜索的目录（默认为当前目录）

**返回类型**: 按修改时间排序的匹配文件路径数组

**使用场景**: 当您知道名称或模式但不知道确切位置时查找文件

**使用示例**:
```typescript
// 查找所有测试文件
await claude()
  .allowTools('Glob')
  .query('查找所有以 .test.ts 结尾的文件')
  .asText();

// 在特定目录中查找配置文件
await claude()
  .allowTools('Glob')
  .query('在 config 目录中查找所有 JSON 文件')
  .asText();
```

### 7. **LS** - 目录列表工具

**用途**: 列出给定路径中的文件和目录

**关键参数**:
- `path` (字符串, 必需): 要列出的目录的绝对路径
- `ignore` (数组, 可选): 要忽略的 glob 模式列表

**返回类型**: 带有文件和目录名称的目录列表

**安全**: 需要绝对路径，而不是相对路径

**使用示例**:
```typescript
// 列出项目根目录
await claude()
  .allowTools('LS')
  .query('列出项目根目录的所有文件和文件夹')
  .asText();

// 列出 src 目录，忽略 node_modules
await claude()
  .allowTools('LS')
  .query('列出 src 目录，忽略 node_modules 文件夹')
  .asText();
```

### 8. **MultiEdit** - 批量编辑工具

**用途**: 在一个原子操作中对单个文件执行多次编辑

**关键参数**:
- `file_path` (字符串, 必需): 要修改的文件的绝对路径
- `edits` (数组, 必需): 包含 old_string 和 new_string 的编辑操作数组

**返回类型**: 所有编辑的成功/失败状态

**特性**:
- 所有编辑按顺序应用或完全不应用（原子性）
- 每个编辑可以独立指定 `replace_all`
- 比多次 Edit 调用更高效

**使用示例**:
```typescript
// 批量重命名变量
await claude()
  .allowTools('Read', 'MultiEdit')
  .query('将文件中所有的 userId 重构为 user_id，userName 重构为 user_name')
  .asText();
```

### 9. **NotebookRead** - 笔记本读取工具

**用途**: 读取 Jupyter 笔记本文件 (.ipynb)

**关键参数**:
- `notebook_path` (字符串, 必需): 笔记本文件的绝对路径

**返回类型**: 完整的笔记本内容，包含所有单元格、输出和可视化

**特性**: 处理代码和 markdown 单元格及其输出

**使用示例**:
```typescript
// 读取数据分析笔记本
await claude()
  .allowTools('NotebookRead')
  .query('读取 analysis.ipynb 笔记本的内容')
  .asText();
```

### 10. **NotebookEdit** - 笔记本编辑工具

**用途**: 编辑 Jupyter 笔记本中的特定单元格

**关键参数**:
- `notebook_path` (字符串, 必需): 笔记本文件的绝对路径
- `cell_id` (字符串, 可选): 要编辑的单元格 ID
- `new_source` (字符串, 必需): 单元格的新源代码
- `cell_type` (字符串, 可选): "code" 或 "markdown"
- `edit_mode` (字符串, 可选): "replace"、"insert" 或 "delete"

**特性**: 精确的单元格级编辑，不影响其他单元格

**使用示例**:
```typescript
// 修改笔记本中的代码单元格
await claude()
  .allowTools('NotebookRead', 'NotebookEdit')
  .query('将 analysis.ipynb 中第 3 个单元格的 pandas 导入改为 polars')
  .asText();
```

### 11. **WebFetch** - 网页抓取工具

**用途**: 从网页 URL 获取并分析内容

**关键参数**:
- `url` (字符串, 必需): 要获取内容的 URL
- `prompt` (字符串, 必需): 处理内容的提示

**返回类型**: 基于提示的处理内容分析

**特性**:
- 自动 HTML 到 markdown 转换
- AI 驱动的内容分析
- 重复请求的 15 分钟缓存
- 自动处理重定向

**使用示例**:
```typescript
// 获取并分析 API 文档
await claude()
  .allowTools('WebFetch')
  .query('获取 https://api.example.com/docs 的内容，并总结主要端点')
  .asText();
```

### 12. **TodoRead** - 任务列表读取工具

**用途**: 读取结构化任务列表

**特性**: 用于读取任务/TODO 列表，详细实现未在当前代码库中找到

### 13. **TodoWrite** - 任务列表管理工具

**用途**: 创建和管理结构化任务列表

**关键参数**:
- `todos` (数组, 必需): 包含内容、状态和 ID 的任务对象数组

**特性**:
- 跟踪复杂任务的进度
- 组织多步骤项目
- 跨会话维护任务状态
- 支持 pending、in_progress 和 completed 状态

**使用示例**:
```typescript
// 创建项目任务列表
await claude()
  .allowTools('TodoWrite')
  .query('创建一个包含以下任务的项目计划：1. 设计数据库架构 2. 实现 API 3. 编写测试')
  .asText();
```

### 14. **WebSearch** - 网络搜索工具

**用途**: 搜索网络以获取超出 Claude 知识截止日期的当前信息

**关键参数**:
- `query` (字符串, 必需): 搜索查询
- `allowed_domains` (数组, 可选): 仅包含来自这些域的结果
- `blocked_domains` (数组, 可选): 从不包含来自这些域的结果

**返回类型**: 带有格式化信息的搜索结果块

**特性**:
- 最新信息访问
- 域过滤功能
- 仅在美国地区可用
- 自动处理今天的日期

**使用示例**:
```typescript
// 搜索最新的技术趋势
await claude()
  .allowTools('WebSearch')
  .query('搜索 2024 年前端开发的最新趋势')
  .asText();

// 在特定域中搜索
await claude()
  .allowTools('WebSearch')
  .query('在 github.com 中搜索 React 性能优化的最佳实践')
  .asText();
```

### 15. **Task** - 高级任务管理工具

**用途**: 复杂、多步骤操作的高级任务管理

**特性**:
- 将复杂任务分解为可管理的步骤
- 跟踪多个操作的进度
- 处理任务之间的依赖关系
- 为复杂问题提供结构化方法

**使用示例**:
```typescript
// 管理复杂的项目重构
await claude()
  .allowTools('Task', 'Read', 'Write', 'Edit')
  .query('帮我重构这个项目：1. 分析现有代码结构 2. 设计新的架构 3. 逐步实现重构 4. 运行测试确保功能正常')
  .asText();
```

### 16. **MCPTool** - MCP 服务器集成工具

**用途**: 与模型上下文协议 (MCP) 服务器接口

**关键参数**:
- 服务器配置和工具特定参数

**特性**:
- 通过 MCP 服务器的可扩展工具系统
- 与外部工具和服务集成
- 自定义工具开发支持

## 工具权限系统

SDK 提供了全面的权限系统来控制工具访问：

### 权限级别
- **allow**: 工具可以使用
- **deny**: 工具不能使用
- **default**: 使用系统默认行为

### 权限来源（按优先级顺序）
1. **查询级别覆盖**: 最高优先级，每次查询设置
2. **动态权限**: 运行时权限函数
3. **角色权限**: 基于角色的访问控制
4. **全局权限**: SDK 级别配置
5. **默认权限**: 系统默认（通常为 allow）

### 权限管理示例

```typescript
// 允许特定工具
await claude()
  .allowTools('Read', 'Grep', 'LS')
  .query('分析这个代码库')
  .asText();

// 拒绝危险工具
await claude()
  .denyTools('Bash', 'Write')
  .query('审查这个代码')
  .asText();

// 只读模式
await claude()
  .allowTools() // 空数组 = 拒绝所有
  .query('解释这个架构')
  .asText();
```

## 工具分类

### 文件操作
- **Read**: 读取文件内容
- **Write**: 创建/覆盖文件
- **Edit**: 修改现有文件
- **MultiEdit**: 批量文件修改
- **LS**: 列出目录内容

### 代码分析
- **Grep**: 搜索代码模式
- **Glob**: 按模式查找文件

### 系统集成
- **Bash**: 执行 shell 命令

### 网络集成
- **WebFetch**: 获取和分析网页内容
- **WebSearch**: 搜索网络

### 特殊格式
- **NotebookRead**: 读取 Jupyter 笔记本
- **NotebookEdit**: 编辑 Jupyter 笔记本

### 任务管理
- **TodoRead**: 读取任务列表
- **TodoWrite**: 创建任务列表
- **Task**: 高级任务管理

### 扩展性
- **MCPTool**: MCP 服务器集成

## 安全考虑

1. **文件操作**: 所有文件操作都需要绝对路径
2. **命令执行**: Bash 命令具有超时保护
3. **网络访问**: Web 工具具有域过滤功能
4. **权限系统**: 对工具访问的细粒度控制
5. **原子操作**: MultiEdit 确保全有或全无的文件更改

## 最佳实践

1. **为任务使用最具体的工具**（例如，用 Grep 进行代码搜索，而不是 Bash + grep）
2. **编辑前始终读取文件**以了解上下文
3. **对同一文件的多次更改使用 MultiEdit**
4. **为您的用例设置适当的权限**
5. **当工具可能失败时优雅地处理错误**

## 使用场景示例

### 代码审查场景
```typescript
// 只读代码审查
await claude()
  .allowTools('Read', 'Grep', 'Glob', 'LS')
  .query('审查这个项目的代码质量和架构')
  .asText();
```

### 开发辅助场景
```typescript
// 全功能开发辅助
await claude()
  .allowTools('Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Grep', 'Glob', 'LS')
  .query('帮我实现一个用户认证系统')
  .asText();
```

### 研究分析场景
```typescript
// 研究和分析
await claude()
  .allowTools('Read', 'WebFetch', 'WebSearch', 'Grep', 'TodoWrite')
  .query('研究最新的微服务架构模式并创建实现计划')
  .asText();
```

这个全面的工具系统使 Claude Code CLI 成为软件开发的强大助手，同时保持对系统操作的安全性和控制。