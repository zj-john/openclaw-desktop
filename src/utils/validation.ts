/**
 * validation.ts — 企业版表单验证工具
 *
 * 提供统一的字段校验逻辑和错误消息。
 */

export type FieldErrors = Record<string, string>;

/**
 * 验证 URL 格式（宽松模式，支持 http/https）
 */
export function isValidUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 验证非空
 */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * 验证 API Key 格式（基本长度检查）
 */
export function isValidApiKey(value: string): boolean {
  const trimmed = value.trim();
  // API Key 通常至少 20 个字符
  return trimmed.length >= 16;
}

/**
 * 验证模型名称非空
 */
export function isValidModel(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * LLM 配置表单完整验证
 *
 * @returns 验证通过返回 null，否则返回字段错误映射
 */
export function validateLlmConfig(params: {
  presetId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}): FieldErrors | null {
  const errors: FieldErrors = {};
  const { presetId, baseUrl, apiKey, model } = params;

  // 兼容类型要求所有字段必填
  const isCompatible = presetId.includes("compatible");

  if (isCompatible) {
    if (!isNonEmpty(baseUrl)) {
      errors.baseUrl = "接口地址为必填项";
    } else if (!isValidUrl(baseUrl)) {
      errors.baseUrl = "请输入有效的 URL（以 http:// 或 https:// 开头）";
    }

    if (!isNonEmpty(model)) {
      errors.model = "模型名称为必填项";
    }
  } else {
    // 非兼容类型：如果用户手动修改了默认值也做基本校验
    if (baseUrl.trim() && !isValidUrl(baseUrl)) {
      errors.baseUrl = "URL 格式不正确";
    }
  }

  if (!isNonEmpty(apiKey)) {
    errors.apiKey = "API Key 为必填项";
  } else if (!isValidApiKey(apiKey)) {
    errors.apiKey = "API Key 格式可能不正确（通常至少 16 个字符）";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
