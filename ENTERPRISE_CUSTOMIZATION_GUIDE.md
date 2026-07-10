# openclaw-desktop 企业版二次开发规范

> **版本**: v2.0 | **日期**: 2026-07-10 | **基础仓库**: `openclaw-desktop` v1.0.0 (二开重置版)
> **技术栈**: Tauri v2 + React 19 + TypeScript + Rust

---

## 目录

1. [范围定义](#1-范围定义)
2. [架构约束](#2-架构约束)
3. [功能规格](#3-功能规格)
4. [接口定义](#4-接口定义)
5. [文件变更清单](#5-文件变更清单)
6. [数据结构](#6-数据结构)
7. [配置文件](#7-配置文件)
8. [实施阶段](#8-实施阶段)
9. [验收标准](#9-验收标准)
10. [UI 设计规范](#10-ui-设计规范)

---

## 1. 范围定义

### 1.1 目标

| ID | 目标 | 验证方式 |
|----|------|---------|
| E-01 | 仅保留 API Key 模式，移除 OAuth / Ollama 入口 | UI 无 OAuth/Ollama 选项 |
| E-02 | 提供 LLM 服务商企业预设（国内供应商 + Code Plan + 自定义） | 配置页展示预设列表 |
| E-03 | 支持飞书/钉钉/企业微信渠道配置（可跳过） | 渠道配置面板可操作，含"跳过"按钮 |
| E-04 | 实现 Skills 白名单机制（必选/可选/禁选） | Skill 选择器受控展示 |
| E-05 | 单窗口体验：配置完成后关闭配置窗口，切换至 OpenClaw UI 窗口 | 运行时仅存在一个窗口 |
| E-06 | 提供二次配置入口（菜单栏 / 系统托盘） | 菜单栏可见"企业设置" |
| E-07 | 浏览器自动化功能保留，使用默认配置（托管隔离浏览器模式） | Shell 设置页保留浏览器模式选择，默认 openclaw |
| E-08 | UI 视觉升级为现代企业级设计风格 | 符合第 10 章 UI 设计规范 |

### 1.2 排除范围

- UI 深度定制（隐藏高级菜单）
- OAuth 认证模式
- Ollama 本地模型支持
- 多语言国际化扩展（当前版本仅支持中文，i18n 暂不考虑）
- OpenAI / Anthropic 作为内置预设（仅保留自定义端点供有需要的用户手动填写）

---

## 2. 架构约束

### 2.1 窗口管理

**当前行为**：启动后同时存在 `main`（配置窗口）和 `official-local-web`（OpenClaw UI 窗口）。

**目标行为**：

```
启动 → [配置窗口 main] → 用户完成配置 → 销毁 main → 创建 [OpenClaw UI 窗口 official-local-web]
```

**二次配置路径**：

| 平台 | 入口方式 | 实现位置 |
|------|---------|---------|
| macOS / Windows | 菜单栏 → 应用 → 企业设置 | `main.rs` `on_menu_event` |
| Windows | 系统托盘 → 打开设置 | `TrayIconBuilder` |
| 通用 | OpenClaw UI 内嵌按钮（通过 Tauri invoke） | 前端调用 `open_enterprise_settings` |

### 2.2 浏览器自动化策略

**保留现有浏览器自动化功能**（`Shell.tsx` 中的 `BrowserModeStatus` / `BrowserRelay` 相关逻辑），不做删除或禁用。

**默认值设定**：

| 配置项 | 默认值 | 说明 |
|--------|-------|------|
| 浏览器模式 (`browserMode.mode`) | `"openclaw"` | 托管隔离浏览器，不污染个人环境 |
| Browser Relay | 按现有逻辑自动准备 | Bootstrap 阶段自动初始化 |

**UI 调整**：
- Shell 设置页中浏览器模式选择区域保留，但降低视觉权重（从首屏主区域移至次要位置）
- 不在 Onboarding 向导中展示浏览器模式选择（使用默认值即可）
- 用户如需切换，通过二次配置入口（菜单栏 → 企业设置）进入

### 2.3 代码分层

```
src-tauri/src/
├── main.rs              # Tauri Command 注册与窗口管理（重大修改）
└── crypto.rs            # 凭证加密模块（新建）

src/
├── bridge/
│   └── types.ts         # OpenClawBridge 类型扩展
├── features/onboarding/
│   ├── Onboarding.tsx   # 企业版配置向导（重写，UI 升级）
│   └── components/
│       ├── ChannelConfig.tsx    # 渠道配置（新建）
│       ├── SkillSelector.tsx    # Skills 选择器（新建）
│       └── LlmProviderSelect.tsx # LLM 预设选择（新建）
├── data/
│   └── llm-presets.ts    # LLM 预设数据（新建）
├── types/
│   └── channels.ts       # 渠道类型定义（新建）
├── services/
│   ├── llm-test.ts       # 连接测试（新建）
│   └── channel-test.ts   # 渠道测试（新建）
├── styles/
│   └── enterprise.css    # 企业版样式覆盖（新建）
└── utils/
    ├── validation.ts     # 表单验证（新建）
    └── skill-validator.ts # Skills 校验（新建）

src-tauri/capabilities/
└── enterprise-skills.json # Skills 白名单（新建）
```

---

## 3. 功能规格

### 3.1 LLM 配置

**UI 流程**：

1. 展示服务商预设列表（大卡片网格，单选）
2. 根据预设自动填充 Base URL 和可用模型
3. 输入 API Key
4. 可选：覆盖模型名称
5. 点击"测试连接"验证
6. 点击"保存并启动"

**预设列表**：

```typescript
// src/data/llm-presets.ts
interface LlmPreset {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  models: string[];
  defaultModel: string;
  recommended?: boolean;
  icon?: string;  // 图标标识或 emoji
}
```

**内置预设**：

| ID | 名称 | Base URL | 默认模型 | 推荐 | 说明 |
|----|------|----------|---------|------|------|
| `deepseek` | DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | ✅ | 高性价比，国内首选 |
| `qwen` | 通义千问 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | - | 阿里云大模型 |
| `zhipu` | 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` | - | 智谱 AI 大模型 |
| `moonshot` | Moonshot Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` | - | 月之暗面 Kimi |
| `baidu` | 百度千帆 | `https://qianfan.baidubce.com/v2` | `ernie-speed-128k` | - | 百度文心系列 |
| `openai-compatible` | OpenAI 兼容 | （用户输入） | （用户输入） | - | 兼容 OpenAI API 协议的任意服务（含官方 OpenAI、国内中转站等） |
| `anthropic-compatible` | Anthropic 兼容 | （用户输入） | （用户输入） | - | 兼容 Anthropic API 协议的任意服务（含官方 Claude、中转站等） |
| `custom` | 完全自定义 | （用户输入） | （用户输入） | - | 任意 API 格式，需手动填写全部参数 |

> **设计意图**：不预置 OpenAI/Anthropic 的官方 endpoint 和模型名（企业内网可能不可达），但提供**协议兼容**入口。用户选择 "OpenAI 兼容" 后只需填 Base URL + API Key + 模型名即可，系统自动按 OpenAI 协议格式组装请求。

### 3.2 渠道集成

**支持的渠道**：

| 渠道 ID | 名称 | 必填字段 | 选填字段 |
|---------|------|---------|---------|
| `feishu` | 飞书 | `appId`, `appSecret` | - |
| `dingtalk` | 钉钉 | `appKey`, `appSecret` | `robotCode` |
| `wecom` | 企业微信 | `corpId`, `agentId`, `secret` | - |

**规则**：
- 支持多选（可同时启用多个渠道），也支持全部不选（**跳过**）
- 敏感信息加密存储（`appSecret`, `secret`）
- 每个渠道提供外部配置指南链接
- 配置向导底部始终显示「跳过渠道配置」按钮，点击后直接进入下一步
- 渠道配置为可选步骤，不影响核心 LLM 配置流程

### 3.3 Skills 白名单

**分类体系**：

| 分类 ID | 名称 | 说明 |
|---------|------|------|
| `core` | 核心能力 | 企业必备，含必选项 |
| `productivity` | 效率工具 | 可选启用 |
| `communication` | 通讯协作 | IM 相关插件 |

**Skill 属性控制**：

| 属性 | 行为 |
|------|------|
| `required: true` | 自动勾选，不可取消，显示"必选"标签 |
| `defaultEnabled: true` | 默认勾选，用户可取消 |
| `defaultEnabled: false` | 默认不勾选，用户可勾选 |
| 出现在 `blacklist` | 不展示在列表中 |

---

## 4. 接口定义

### 4.1 后端 Command（Rust）

#### 4.1.1 窗口切换

```rust
#[tauri::command]
async fn switch_to_openclaw_ui(
    app: tauri::AppHandle
) -> Result<OpenOfficialWebResult, String>
```

**行为**：
1. 调用 `ensure_official_web_ready()` 确保 Gateway 就绪
2. 关闭 `main` 窗口（如存在）
3. 若 `official-local-web` 窗口已存在，激活并聚焦；否则创建新窗口
4. 返回结果

**注册**：添加到 `invoke_handler(tauri::generate_handler![..., switch_to_openclaw_ui])`

#### 4.1.2 渠道配置存储

```rust
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ChannelConfig {
    channel_type: String,              // "feishu" | "dingtalk" | "wecom"
    enabled: bool,
    credentials: HashMap<String, String>,  // 加密后的凭证
    created_at: String,                // ISO 8601
}

#[tauri::command]
async fn save_channel_config(
    app: tauri::AppHandle,
    channel_id: String,
    config: ChannelConfig,
) -> Result<(), String>
```

**存储路径**：`{app_config_dir}/channels.json`

#### 4.1.3 Skills 白名单加载

```rust
#[tauri::command]
async fn get_enterprise_skills(
    app: tauri::AppHandle
) -> Result<EnterpriseSkillWhitelist, String>
```

**加载优先级**：
1. `{resource_dir}/capabilities/enterprise-skills.json`
2. 内置硬编码默认值（回退）

#### 4.1.4 企业设置入口

```rust
#[tauri::command]
async fn open_enterprise_settings(app: tauri::AppHandle) -> Result<(), String>
```

**行为**：打开或聚焦企业设置窗口（模态或独立窗口）

### 4.2 前端 Bridge（TypeScript）

扩展 `OpenClawBridge` 接口（`src/bridge/types.ts`）：

```typescript
export interface OpenClawBridge {
  // ===== 现有方法保持不变 =====

  // ===== 新增企业版方法 =====

  /** 关闭配置窗口并打开 OpenClaw UI 窗口 */
  switchToOpenClawUi(): Promise<OpenOfficialWebResult>;

  /** 获取企业 Skills 白名单 */
  getEnterpriseSkills(): Promise<EnterpriseSkillWhitelist>;

  /** 保存渠道配置 */
  saveChannelConfig(channelId: string, config: ChannelConfig): Promise<void>;

  /** 打开企业设置窗口 */
  openEnterpriseSettings(): Promise<void>;
}
```

### 4.3 新增类型定义

```typescript
// src/types/channels.ts
export interface ChannelOption {
  id: string;
  name: string;
  icon: string;
  fields: ChannelField[];
  setupGuide: string;
}

export interface ChannelField {
  key: string;
  label: string;
  required: boolean;
  type?: 'text' | 'password';
}

export interface ChannelConfigPayload {
  channelId: string;
  values: Record<string, string>;
}

// src/features/onboarding/components/SkillSelector.tsx 关联类型
export interface EnterpriseSkillWhitelist {
  version: number;
  lastUpdated: string;
  categories: SkillCategory[];
  blacklist: BlacklistedSkill[];
}

export interface SkillCategory {
  id: string;
  name: string;
  description: string;
  skills: SkillItem[];
}

export interface SkillItem {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  defaultEnabled: boolean;
  platform?: string;
  reason?: string;
}

export interface BlacklistedSkill {
  id: string;
  reason: string;
}
```

---

## 5. 文件变更清单

### 5.1 修改现有文件

| 文件 | 变更类型 | 要点 |
|------|---------|------|
| `src-tauri/src/main.rs` | **重大修改** | 新增 4 个 Command；菜单栏构建；系统托盘（Windows）；渠道存储逻辑 |
| `src/features/onboarding/Onboarding.tsx` | **重写** | 移除 OAuth/Ollama mode 分支；集成 LlmProviderSelect / ChannelConfig / SkillSelector；UI 视觉升级 |
| `src/features/bootstrap/Bootstrap.tsx` | 小改 | 进度提示文案适配企业版 |
| `src/features/shell/Shell.tsx` | 小改 | 浏览器模式默认值锁定为 openclaw，保留切换能力但降低视觉权重 |
| `src/bridge/types.ts` | 扩展 | OpenClawBridge 新增 4 个方法签名；新增导出类型 |
| `src/styles.css` | 小改 | 引入 `enterprise.css` 覆盖层；微调全局变量以支持新色彩体系 |
| `package.json` | 清理 | 移除 OAuth 相关依赖（如有） |
| `src-tauri/tauri.conf.json` | 配置 | 菜单声明；权限配置 |
| `src/i18n/resources.ts` | **暂不修改** | 当前版本仅支持中文，i18n 后续迭代再考虑 |

### 5.2 新建文件

| 文件 | 用途 |
|------|------|
| `src/data/llm-presets.ts` | LLM 预设常量数据（国内供应商 + Code Plan + custom） |
| `src/types/channels.ts` | 渠道配置 TypeScript 类型 |
| `src/features/onboarding/components/LlmProviderSelect.tsx` | LLM 服务商选择组件（卡片网格式） |
| `src/features/onboarding/components/ChannelConfig.tsx` | 渠道配置组件（可跳过） |
| `src/features/onboarding/components/SkillSelector.tsx` | Skills 选择器组件 |
| `src/services/llm-test.ts` | API Key 连接测试服务 |
| `src/services/channel-test.ts` | 渠道连通性测试 |
| `src/utils/validation.ts` | 表单验证工具函数 |
| `src/utils/skill-validator.ts` | Skills 校验逻辑 |
| `src/styles/enterprise.css` | 企业版样式覆盖层（不修改原 styles.css，以覆盖方式生效） |
| `src-tauri/src/crypto.rs` | 凭证加密模块（AES 或系统钥匙串封装） |
| `src-tauri/capabilities/enterprise-skills.json` | Skills 白名单配置文件 |

### 5.3 删除文件/代码

| 文件/代码 | 原因 |
|-----------|------|
| `Onboarding.tsx` 中 `mode === "oauth"` 分支 | 不再支持 OAuth |
| `Onboarding.tsx` 中 `mode === "ollama"` 分支 | 不再支持 Ollama |
| `Onboarding.tsx` 中 OAuth/Ollama 相关 state 与 handler | 减少死代码 |
| OAuth 相关 npm 包（`package.json` dependencies） | 减少包体积 |

---

## 6. 数据结构

### 6.1 企业配置持久化（`~/.openclaw/openclaw.json` 扩展字段）

```json
{
  "llm": {
    "provider": "deepseek",
    "base_url": "https://api.deepseek.com/v1",
    "api_key": "sk-***",
    "model": "deepseek-chat"
  },
  "channels": {
    "_skipped": true,
    "feishu": { "enabled": true, "configured_at": "2026-07-09T10:00:00Z" },
    "dingtalk": { "enabled": false }
  },
  "skills": {
    "enabled": ["coding-agent", "summarize", "github"],
    "disabled": ["imsg", "notion"],
    "version": 1
  },
  "enterprise": {
    "mode": "configured",
    "first_launch": false,
    "last_config_update": "2026-07-09T10:05:00Z",
    "browser_mode": "openclaw"
  }
}
```

> `channels._skipped: true` 表示用户在向导中跳过了渠道配置步骤。

### 6.2 渠道凭证存储（`{app_config_dir}/channels.json`）

```json
{
  "feishu": {
    "channel_type": "feishu",
    "enabled": true,
    "credentials": {
      "appId": "cli_xxxxxxxx",
      "appSecret": "<encrypted>"
    },
    "created_at": "2026-07-09T10:00:00Z"
  }
}
```

---

## 7. 配置文件

### 7.1 Skills 白名单（`src-tauri/capabilities/enterprise-skills.json`）

```json
{
  "version": 1,
  "lastUpdated": "2026-07-09",
  "categories": [
    {
      "id": "core",
      "name": "核心能力",
      "description": "企业必备的基础功能",
      "skills": [
        {
          "id": "coding-agent",
          "name": "编程助手",
          "required": true,
          "reason": "提供代码生成和调试能力",
          "defaultEnabled": true
        },
        {
          "id": "summarize",
          "name": "内容摘要",
          "required": true,
          "reason": "自动总结文档和对话",
          "defaultEnabled": true
        },
        {
          "id": "taskflow-inbox-triage",
          "name": "任务管理",
          "required": false,
          "defaultEnabled": true
        }
      ]
    },
    {
      "id": "productivity",
      "name": "效率工具",
      "description": "提升工作效率的辅助工具",
      "skills": [
        { "id": "notion", "name": "Notion 集成", "required": false, "defaultEnabled": false },
        { "id": "obsidian", "name": "Obsidian 笔记", "required": false, "defaultEnabled": false },
        { "id": "github", "name": "GitHub 操作", "required": false, "defaultEnabled": true }
      ]
    },
    {
      "id": "communication",
      "name": "通讯协作",
      "description": "与 IM 平台集成",
      "skills": [
        { "id": "imsg", "name": "iMessage", "required": false, "defaultEnabled": false, "platform": "macOS only" },
        { "id": "healthcheck", "name": "健康检查", "required": false, "defaultEnabled": true }
      ]
    }
  ],
  "blacklist": [
    { "id": "meme-maker", "reason": "非生产力工具" },
    { "id": "camsnap", "reason": "涉及摄像头权限，隐私风险" },
    { "id": "peekaboo", "reason": "屏幕监控功能，违反隐私政策" }
  ]
}
```

---

## 8. 实施阶段

### Phase 1：窗口管理与功能裁剪（3-5 天）

| # | 任务 | 文件 | P |
|---|------|------|---|
| 1.1 | 实现 `switch_to_openclaw_ui` Command | `src-tauri/src/main.rs` | 0 |
| 1.2 | 注册新 Command 到 `invoke_handler` | `src-tauri/src/main.rs` | 0 |
| 1.3 | 扩展 Bridge 类型定义 | `src/bridge/types.ts` | 0 |
| 1.4 | 重写 Onboarding：移除 OAuth/Ollama，保留 API Key 分支 | `src/features/onboarding/Onboarding.tsx` | 0 |
| 1.5 | API Key 保存后调用 `switchToOpenClawUi()` | `src/features/onboarding/Onboarding.tsx` | 0 |
| 1.6 | 添加菜单栏"企业设置"入口 + `open_enterprise_settings` Command | `src-tauri/src/main.rs` | 1 |

**验收**：
- [ ] 启动后仅显示配置窗口
- [ ] 保存 API Key 后配置窗口关闭，OpenClaw UI 窗口为唯一窗口
- [ ] 菜单栏可重新打开设置

### Phase 2：LLM 预设化 + UI 升级（3-5 天）

> ⚠️ 本 Phase 同时包含 LLM 预设功能和企业版 UI 视觉升级，二者耦合实施。

| # | 任务 | 文件 | P |
|---|------|------|---|
| 2.1 | 创建 `enterprise.css` 样式覆盖层（色彩体系、组件规范） | `src/styles/enterprise.css` | 0 |
| 2.2 | 在 `styles.css` 中引入 `enterprise.css` | `src/styles.css` | 0 |
| 2.3 | 创建 `llm-presets.ts` 国内供应商预设数据 | `src/data/llm-presets.ts` | 0 |
| 2.4 | 创建 `LlmProviderSelect.tsx` 卡片网格选择组件 | `src/features/onboarding/components/` | 0 |
| 2.5 | 重写 Onboarding 整体布局（向导步骤条 + 卡片式面板） | `src/features/onboarding/Onboarding.tsx` | 0 |
| 2.6 | 实现 `testConnection` 功能 | `src/services/llm-test.ts` | 0 |
| 2.7 | 表单验证逻辑 | `src/utils/validation.ts` | 1 |
| 2.8 | ~~i18n key 扩展~~（当前版本仅支持中文，跳过） | - | - |

**验收**：
- [ ] 显示 6+1 个预设选项（DeepSeek 推荐），卡片式布局
- [ ] 切换预设自动填充 Base URL / Model
- [ ] 测试连接成功/失败有明确反馈（颜色 + 图标 + 文案）
- [ ] 整体视觉符合第 10 章 UI 设计规范（蓝色主色调、圆角卡片、步骤条）

### Phase 3：渠道集成（可跳过）（4-6 天）

| # | 任务 | 文件 | P |
|---|------|------|---|
| 3.1 | 定义渠道类型 `src/types/channels.ts` | `src/types/channels.ts` | 0 |
| 3.2 | 创建 `ChannelConfig.tsx` 组件（含跳过按钮） | `src/features/onboarding/components/` | 0 |
| 3.3 | 实现 `save_channel_config` Command | `src-tauri/src/main.rs` | 0 |
| 3.4 | 实现凭证加密 `crypto.rs` | `src-tauri/src/crypto.rs` | 0 |
| 3.5 | 渠道连通性测试 | `src/services/channel-test.ts` | 1 |
| 3.6 | 集成到 Onboarding 向导流程（作为独立步骤，可跳过） | `src/features/onboarding/Onboarding.tsx` | 1 |

**验收**：
- [ ] 可多选渠道，动态展示配置字段
- [ ] 「跳过渠道配置」按钮可见且功能正常
- [ ] 敏感信息加密存储
- [ ] 外部配置指南链接可跳转

### Phase 4：Skills 白名单（3-4 天）

| # | 任务 | 文件 | P |
|---|------|------|---|
| 4.1 | 创建 `enterprise-skills.json` | `src-tauri/capabilities/` | 0 |
| 4.2 | 实现 `get_enterprise_skills` Command | `src-tauri/src/main.rs` | 0 |
| 4.3 | 创建 `SkillSelector.tsx` 组件 | `src/features/onboarding/components/` | 0 |
| 4.4 | 必选/禁选状态逻辑 | `src/features/onboarding/components/SkillSelector.tsx` | 0 |
| 4.5 | 集成到 Onboarding 向导 | `src/features/onboarding/Onboarding.tsx` | 1 |
| 4.6 | Skills 校验工具 | `src/utils/skill-validator.ts` | 2 |

**验收**：
- [ ] 按 Core/Productivity/Communication 分类展示
- [ ] 必选 Skill 不可取消
- [ ] 黑名单 Skill 不出现
- [ ] 默认勾选推荐项

### Phase 5：构建与部署验证（2-3 天）

| # | 任务 | P |
|---|------|---|
| 5.1 | 执行 `npm run tauri:build` | 0 |
| 5.2 | 干净环境安装测试（无 Node.js） | 0 |
| 5.3 | 首次启动冒烟测试（含 UI 视觉检查） | 0 |
| 5.4 | 二次配置入口测试（菜单栏 → 验证浏览器模式默认 openclaw） | 1 |
| 5.5 | 性能基准采集 | 2 |

**验收**：
- [ ] 安装包 < 200MB
- [ ] 无 Node.js 环境可用
- [ ] 重启后配置持久化
- [ ] 浏览器自动化功能正常工作（默认 openclaw 模式）

---

## 9. 验收标准

### 9.1 功能测试矩阵

| 测试场景 | 输入 | 预期结果 |
|---------|------|---------|
| 空 API Key 提交 | `apiKey=""` | 阻止提交，提示"请输入 API Key" |
| 无效 Base URL | `baseUrl="abc"` | URL 格式校验失败提示 |
| 取消必选 Skill | 点击 coding-agent 复选框 | 无响应，tooltip 提示不可取消 |
| 多渠道选择 | 勾选飞书 + 钉钉 | 展示两组完整配置字段 |
| 跳过渠道配置 | 点击「跳过」按钮 | 直接进入 Skills 步骤，`channels._skipped=true` |
| 重复切换窗口 | 两次调用 `switchToOpenClawUi` | 第二次复用已有窗口 |
| 渠道凭证存储 | 保存飞书配置 | `channels.json` 中 `appSecret` 为加密值 |
| Skills 黑名单 | blacklist 含 `meme-maker` | 列表中不展示 meme-maker |
| 浏览器模式默认值 | 首次启动不手动切换 | `browserMode.mode === "openclaw"` |
| 自定义海外服务 | 选择"自定义端点"，填入 OpenAI 地址 | 正常保存和使用 |

### 9.2 性能指标

| 指标 | 目标值 | 测量方法 |
|------|-------|---------|
| 冷启动时间 | < 3s | 图标点击 → 配置窗口可见 |
| 窗口切换延迟 | < 500ms | 保存 → UI 窗口可见 |
| 内存空闲占用 | < 300MB | Activity Monitor |
| 安装包体积 | < 200MB | `du -sh *.dmg` |

### 9.3 安全检查项

- [ ] API Key / App Secret 不明文写入日志
- [ ] 渠道凭证使用加密存储（非纯 base64）
- [ ] 配置文件权限限制为当前用户读写
- [ ] 窗口切换过程中无凭证泄露到前端

### 9.4 错误码与异常场景映射

> 后端 Rust Command 返回的错误 → 前端用户可见的中文提示。所有错误文案硬编码在前端，后端仅返回 error string 或 structured code。

| 场景 | 后端返回 (示例) | 前端展示文案 | 用户可执行操作 |
|------|----------------|-------------|---------------|
| Gateway 未就绪 | `Gateway not ready: ...` | "OpenClaw 服务正在启动中，请稍候重试" | 重试按钮 |
| Gateway 启动超时 (>60s) | `timeout` | "OpenClaw 启动超时，请检查网络或查看诊断日志" | 查看日志 / 一键诊断 |
| API Key 连接失败 | HTTP 401 | "API Key 无效，请检查是否正确复制" | 重新输入 |
| API Key 连接失败 | HTTP 403 | "该 API Key 无权访问此模型，请确认套餐权限" | 切换模型 / 检查套餐 |
| API Key 连接失败 | 超时/网络不可达 | "无法连接到 LLM 服务商，请检查网络或 Base URL" | 检查网络 / 修改 URL |
| Base URL 格式无效 | URL parse error | "请输入有效的地址，如 https://api.example.com/v1" | 修正输入 |
| 加密存储失败 (keychain) | `keychain unavailable` | "系统安全存储不可用，将使用应用级加密（安全性降低）" | 继续（降级）/ 取消 |
| 渠道保存失败 | JSON write error | "渠道配置保存失败，请检查磁盘空间" | 重试 |
| Skills 白名单缺失 | file not found | "Skills 配置文件缺失，使用内置默认列表" | 自动继续（无需操作） |
| 窗口创建失败 | `Failed to open window` | "窗口创建失败，请重启应用" | 重启按钮 |

**降级策略**：

| 组件 | 正常路径 | 降级路径 |
|------|---------|---------|
| 凭证加密 | 系统 Keychain / Credential Manager | AES-GCM + 应用本地密钥文件（提示安全性降低） |
| Skills 白名单 | `enterprise-skills.json` 文件 | 内置硬编码默认值（自动回退） |
| 渠道配置 | 加密存储 `{app_config_dir}/channels.json` | 明文 + 文件权限 600（仅在加密完全不可用时） |

---

## 10. UI 设计规范

> 当前 UI 问题诊断（基于现有 `styles.css` + `Onboarding.tsx` + `Shell.tsx`）：
> - 三卡片模式选择器（OAuth/API Key/Ollama）视觉层级扁平，缺乏引导感
> - 表单面板（`.panel`）过于朴素，无视觉分组和呼吸感
> - 按钮 `.action-row` 排列拥挤，主次操作不分明
> - 颜色体系单一（仅绿色 `#0f6e5b` 作为主色），缺乏层次
> - 无图标系统，纯文字界面显得粗糙
> - Shell 页面 Tab 导航（帮助/官方本地页/设置/飞书）信息密度过高
> - 整体缺乏品牌感和专业度

### 10.1 设计原则

| 原则 | 说明 |
|------|------|
| 渐进式披露 | 向导式步骤条（Step 1 → Step 2 → Step 3），每步只关注一件事 |
| 视觉层级 | 主操作（保存/下一步）突出，辅助操作（跳过/测试连接）弱化 |
| 呼吸感 | 卡片间距 ≥ 16px，内边距 ≥ 20px，圆角统一 12px+ |
| 反馈即时 | 输入校验、连接测试、保存状态均有明确的成功/失败/加载态 |
| 一致性 | 输入框、按钮、选择器的尺寸和圆角全局统一 |

### 10.2 色彩体系

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 Primary | `#2563EB` (蓝 600) | 操作按钮、选中态、链接（从绿色改为蓝色，更中性专业） |
| 主色 Hover | `#1D4ED8` (蓝 700) | 按钮悬停 |
| 主色 Light | `#EFF6FF` (蓝 50) | 选中背景、标签底色 |
| 成功 Success | `#059669` (绿 600) | 连接成功、已保存 |
| 成功 Light | `#ECFDF5` (绿 50) | 成功状态背景 |
| 警告 Warning | `#D97706` (琥珀 600) | 注意事项 |
| 错误 Error | `#DC2626` (红 600) | 校验失败、连接失败 |
| 错误 Light | `#FEF2F2` (红 50) | 错误状态背景 |
| 文字主色 | `#1E293B` (Slate 800) | 标题、正文 |
| 文字次色 | `#64748B` (Slate 500) | 辅助说明、placeholder |
| 边框 | `#E2E8F0` (Slate 200) | 输入框、卡片边框 |
| 背景 | `#F8FAFC` (Slate 50) | 页面底色 |
| 卡面 | `#FFFFFF` | 卡片/面板背景 |

### 10.3 组件规范

#### 步骤条 (Wizard Steps)

```
① LLM 配置  →  ② 渠道集成  →  ③ Skills  →  ✓ 完成
   ●─────────────●─────────────●─────────────★
```

- 当前步骤：蓝色实心圆 + 蓝色文字 + 蓝色连线
- 已完成步骤：绿色勾 + 灰色文字 + 绿色连线
- 未来步骤：灰色空心圆 + 灰色文字 + 灰色虚线
- 宽度撑满容器，固定高度 40px

#### LLM 预设选择器

- 采用**大卡片网格**（2 列或 3 列），非下拉框
- 每张卡片包含：Logo/图标 + 服务商名称 + 一行描述词 + 推荐/默认标签
- 选中态：蓝色左边框(3px) + 浅蓝背景 + 阴影
- 自定义端点卡片放在最后，样式与其他卡片一致但带特殊图标

#### 表单面板

- 标签 + 输入框垂直排列，标签字号 13px，颜色 Slate 500
- 输入框高度 40px，圆角 8px，聚焦时蓝色外发光 ring
- 密码框带显示/隐藏切换按钮
- 必填项标签后带红色星号 `*`
- 错误提示在输入框下方，红色文字，12px

#### 按钮体系

| 类型 | 样式 | 用途 |
|------|------|------|
| Primary | 蓝色背景白字，高度 40px，圆角 8px，宽度 100% 或撑满 | 保存、下一步、启动 |
| Secondary | 白色背景蓝字蓝边框，同尺寸 | 测试连接、刷新 |
| Ghost | 透明背景灰字，无边框 | 跳过此步骤 |
| Danger | 红色背景白字 | 删除、重置 |

- 按钮组中 Primary 始终在最右侧或最突出位置
- Loading 态：按钮内显示旋转 spinner + 文案变为"处理中..."
- Disabled 态：透明度 0.5，cursor: not-allowed

#### 渠道配置

- 渠道列表采用**可折叠手风琴**或**步骤内 Tab**形式
- 每个渠道为一个独立区块，含渠道图标 + 名称 + "配置"/"跳过"操作
- 展开后显示表单字段
- 底部固定「跳过渠道配置」Ghost 按钮

#### Skills 选择器

- 分类标题用 h3，14px 加粗，Slate 800
- Skill 卡片：图标 + 名称 + 描述(可选) + 复选框
- 必选 Skill：锁定图标 overlay + tooltip + "必选"小标签
- 黑名单 Skill 不渲染
- 底部统计栏：「已选择 N 个技能（M 个必选自动启用）」

### 10.4 响应式

| 断点 | 行为 |
|------|------|
| ≥ 1024px | LLM 预设 3 列网格；双栏布局（左侧表单右侧预览） |
| 768px – 1023px | LLM 预设 2 列网格；单栏布局 |
| < 768px | 全部单列；步骤条可横向滚动 |

### 10.5 动效（最低要求）

- 步骤切换：淡入淡出（opacity 0→1, 200ms ease）
- 卡片选中：border-color + box-shadow 过渡（150ms ease）
- 按钮悬停：背景色过渡（100ms ease）
- Loading spinner：CSS 动画旋转
- 错误提示出现：向下滑动展开（translateY -8px → 0, 200ms）

### 10.6 样式实现策略

**采用覆盖层方式**，不直接修改原有 `styles.css`：

```
styles.css          ← 保持原样（上游兼容）
  └── @import ./styles/enterprise.css  ← 新增一行引入

styles/enterprise.css  ← 新建，所有企业版样式在此文件
```

`enterprise.css` 的选择器优先级规则：
- 使用与原样式相同的选择器 + 相同或更高特异性
- 对需要替换的属性直接重写（如 `.button.primary` 的 background-color）
- 新增组件的样式全部在 `enterprise.css` 中定义

---

## 附录

### A. Git 工作流

```bash
# 创建特性分支
git checkout -b feature/enterprise-v1

# 紧急修复分支
git checkout -b hotfix/<issue-name>

# 稳定版本标记
git tag v1.0.0-enterprise
```

### B. 开发环境准备

- [ ] Node.js >= 20
- [ ] Rust stable toolchain (`rustup default stable`)
- [ ] Tauri CLI v2（`npm install -g @tauri-apps/cli`）
- [ ] VS Code 扩展：`tauri-apps.tauri-vscode`、`rust-lang.rust-analyzer`
- [ ] 本地可运行 `npm run tauri:dev`

### C. 参考资源

| 资源 | 地址 |
|------|------|
| Tauri v2 文档 | https://v2.tauri.app/ |
| OpenClaw 仓库 | https://github.com/nicepkg/openclaw |
| React 19 文档 | https://react.dev |
| Tailwind CSS 色板参考 | https://tailwindcss.com/docs/customizing-colors |

---

> **维护规则**：每完成一个 Phase，更新对应章节的验收状态。Skills 白名单变更需同步更新 `enterprise-skills.json` 的 `version` 和 `lastUpdated` 字段。
