/**
 * llm-test.ts — LLM 连接测试服务
 *
 * 通过前端 fetch 直接测试 API Key 和端点的连通性。
 * 兼容 OpenAI 协议（/v1/models）和 Anthropic 协议（/v1/messages）。
 */

export type ConnectionTestResult =
  | { status: "success"; message: string; model?: string }
  | { status: "error"; message: string; code?: string };

/**
 * 测试 OpenAI 兼容协议的连通性
 *
 * 使用 GET /v1/models 端点验证 Key 是否有效。
 */
export async function testOpenAiConnection(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<ConnectionTestResult> {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/u, "");
  const url = `${trimmedBaseUrl}/models`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(10000) // 10s 超时
    });

    if (response.ok) {
      const data = (await response.json()) as { data?: Array<{ id?: string }> };
      const models = data.data ?? [];
      // 检查请求的模型是否在列表中
      const modelExists = model && models.some((m) => m.id === model);

      return {
        status: "success",
        message: modelExists
          ? `连接成功，模型 ${model} 可用（共 ${models.length} 个模型）`
          : `连接成功（共 ${models.length} 个模型可用）`,
        model: model || undefined
      };
    }

    if (response.status === 401) {
      return { status: "error", message: "API Key 无效或已过期", code: "UNAUTHORIZED" };
    }
    if (response.status === 403) {
      return { status: "error", message: "API Key 无权访问此端点", code: "FORBIDDEN" };
    }
    if (response.status === 404) {
      return { status: "error", message: "接口地址不正确（404），请检查 Base URL", code: "NOT_FOUND" };
    }

    const errorText = await response.text().catch(() => "");
    return {
      status: "error",
      message: `请求失败 (HTTP ${response.status}): ${errorText.slice(0, 100)}`,
      code: `HTTP_${response.status}`
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "error", message: "连接超时（10秒），请检查网络或地址是否正确", code: "TIMEOUT" };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "网络连接失败",
      code: "NETWORK_ERROR"
    };
  }
}

/**
 * 测试 Anthropic 兼容协议的连通性
 *
 * 使用 POST /v1/messages 发送极简请求验证 Key。
 */
export async function testAnthropicConnection(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<ConnectionTestResult> {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/u, "");

  try {
    const response = await fetch(`${trimmedBaseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-5",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (response.ok) {
      return { status: "success", message: `连接成功，模型 ${model} 可响应` };
    }

    if (response.status === 401) {
      return { status: "error", message: "API Key 无效或已过期", code: "UNAUTHORIZED" };
    }
    if (response.status === 404) {
      return { status: "error", message: "接口地址不正确（404）", code: "NOT_FOUND" };
    }

    const errorText = await response.text().catch(() => "");
    return {
      status: "error",
      message: `请求失败 (HTTP ${response.status}): ${errorText.slice(0, 100)}`,
      code: `HTTP_${response.status}`
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "error", message: "连接超时（15秒），请检查网络或地址是否正确", code: "TIMEOUT" };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "网络连接失败",
      code: "NETWORK_ERROR"
    };
  }
}

/**
 * 根据预设类型自动选择测试方法
 */
export async function testConnection(
  presetId: string,
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<ConnectionTestResult> {
  if (!baseUrl.trim() || !apiKey.trim()) {
    return { status: "error", message: "请先填写完整的接口地址和 API Key" };
  }

  if (presetId === "anthropic-compatible") {
    return testAnthropicConnection(baseUrl, apiKey, model);
  }

  // 默认使用 OpenAI 兼容协议（覆盖国内所有供应商 + openai-compatible）
  return testOpenAiConnection(baseUrl, apiKey, model);
}
