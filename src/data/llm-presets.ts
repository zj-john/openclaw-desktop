/**
 * llm-presets.ts — 企业版 LLM 供应商预设数据
 *
 * 规范来源：ENTERPRISE_CUSTOMIZATION_GUIDE.md 第 7 章（LLM 预设基线）
 *
 * 每个预设包含：
 * - id: 唯一标识符
 * - label: 显示名称
 * - providerId: 传给后端的供应商标识
 * - defaultBaseUrl: 默认接口地址
 * - defaultModel: 默认模型名称
 * - icon: 卡片图标 CSS 类名
 * - description: 一行描述词
 * - tag: 推荐标签 (recommended | default | null)
 */

export type LlmPreset = {
  id: string;
  label: string;
  providerId: string;
  defaultBaseUrl: string;
  defaultModel: string;
  placeholderBaseUrl?: string;
  placeholderModel?: string;
  icon: string; // CSS class for provider-card-icon
  tag?: "recommended" | "default";
};

/** 国内主流供应商 */
export const DOMESTIC_PRESETS: LlmPreset[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    providerId: "deepseek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    icon: "icon-deepseek",
    tag: "recommended"
  },
  {
    id: "qwen",
    label: "通义千问 (Qwen)",
    providerId: "qwen",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    icon: "icon-qwen"
  },
  {
    id: "zhipu",
    label: "智谱 AI (GLM)",
    providerId: "zhipu",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
    icon: "icon-zhipu"
  },
  {
    id: "minimax",
    label: "MiniMax",
    providerId: "minimax",
    defaultBaseUrl: "https://api.minimax.chat/v1",
    defaultModel: "abab6.5s-chat",
    icon: "icon-minimax"
  }
];

/** 协议兼容（通用） */
export const COMPATIBLE_PRESETS: LlmPreset[] = [
  {
    id: "openai-compatible",
    label: "OpenAI 兼容",
    providerId: "openai-compatible",
    defaultBaseUrl: "",
    defaultModel: "",
    placeholderBaseUrl: "https://your-openai-compatible-endpoint/v1",
    placeholderModel: "gpt-4o",
    icon: "icon-openai"
  },
  {
    id: "anthropic-compatible",
    label: "Anthropic 兼容",
    providerId: "anthropic-compatible",
    defaultBaseUrl: "",
    defaultModel: "",
    placeholderBaseUrl: "https://your-anthropic-endpoint",
    placeholderModel: "claude-sonnet-4-5",
    icon: "icon-anthropic"
  }
];

/** 全部预设（国内优先） */
export const ALL_LLM_PRESETS: LlmPreset[] = [...DOMESTIC_PRESETS, ...COMPATIBLE_PRESETS];

/** 根据 ID 查找预设 */
export function findPresetById(id: string): LlmPreset | undefined {
  return ALL_LLM_PRESETS.find((p) => p.id === id);
}

/** 判断是否为"兼容"类型（需要手动填写全部字段） */
export function isCompatiblePreset(preset: LlmPreset): boolean {
  return preset.id.includes("compatible");
}
