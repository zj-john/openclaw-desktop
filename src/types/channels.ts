/**
 * channels.ts — 渠道类型定义
 *
 * 企业版支持的可集成渠道（IM/通知平台）。
 * 渠道配置为可选步骤，用户可跳过。
 */

/** 单个渠道定义（元数据） */
export type ChannelDefinition = {
  id: string;
  name: string;
  icon: string; // emoji 或图标标识
  description: string;
  /** 配置字段定义 */
  fields: ChannelField[];
  /** 是否需要安装插件 */
  requiresPlugin?: boolean;
  /** 帮助文档链接 */
  helpUrl?: string;
};

/** 渠道配置字段 */
export type ChannelField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
  hint?: string;
};

/** 用户填写的渠道配置值 */
export type ChannelConfigValues = Record<string, string>;

/** 已保存的渠道状态 */
export type ChannelSavedStatus = {
  channelId: string;
  enabled: boolean;
  configured: boolean;
  configuredAt?: string;
};

/** 渠道向导整体状态 */
export type ChannelsWizardState = {
  skipped: boolean;
  channels: Record<string, ChannelConfigValues | null>; // null = 未配置
};

/** 支持的渠道列表 */
export const CHANNEL_DEFINITIONS: ChannelDefinition[] = [
  {
    id: "feishu",
    name: "飞书",
    icon: "🚀",
    description: "飞书机器人消息推送",
    fields: [
      { key: "appId", label: "App ID", type: "text", placeholder: "cli_xxxxxxxx", required: true, hint: "在飞书开放平台创建应用获取" },
      { key: "appSecret", label: "App Secret", type: "password", placeholder: "输入 App Secret", required: true }
    ],
    requiresPlugin: true,
    helpUrl: "https://open.feishu.cn/document/server-docs/enterprise-bot-group/create-application"
  },
  {
    id: "dingtalk",
    name: "钉钉",
    icon: "💬",
    description: "钉钉群机器人通知",
    fields: [
      { key: "webhookUrl", label: "Webhook 地址", type: "url", placeholder: "https://oapi.dingtalk.com/robot/send?access_token=xxx", required: true, hint: "钉钉群 → 智能群助手 → 自定义机器人" },
      { key: "secret", label: "签名密钥 (可选)", type: "password", placeholder: "SEC xxxxx..." }
    ]
  },
  {
    id: "wechat-work",
    name: "企业微信",
    icon: "📱",
    description: "企业微信应用消息",
    fields: [
      { key: "corpId", label: "企业 ID", type: "text", placeholder: "wwxxxxxxxx", required: true },
      { key: "agentId", label: "应用 ID", type: "text", placeholder: "1000002", required: true },
      { key: "secret", label: "应用 Secret", type: "password", placeholder: "输入应用 Secret", required: true }
    ],
    helpUrl: "https://developer.work.weixin.qq.com/document/path/90480"
  }
];

/** 根据 ID 查找渠道定义 */
export function findChannelDef(id: string): ChannelDefinition | undefined {
  return CHANNEL_DEFINITIONS.find((ch) => ch.id === id);
}
