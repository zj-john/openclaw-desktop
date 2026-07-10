import { useState, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { openclawBridge } from "../../bridge/openclawBridge";
import LlmProviderSelect from "./components/LlmProviderSelect";
import type { LlmPreset } from "../../data/llm-presets";
import { findPresetById, isCompatiblePreset } from "../../data/llm-presets";
import { testConnection } from "../../services/llm-test";
import type { ConnectionTestResult } from "../../services/llm-test";
import { validateLlmConfig } from "../../utils/validation";

type Props = {
  onLoginSuccess: () => void;
};

export default function Onboarding({ onLoginSuccess }: Props) {
  // ===== 状态：LLM 配置 =====
  const [selectedPresetId, setSelectedPresetId] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState(findPresetById("deepseek")?.defaultBaseUrl ?? "");
  const [apiDefaultModel, setApiDefaultModel] = useState(findPresetById("deepseek")?.defaultModel ?? "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // ===== UI 状态 =====
  const [busy, setBusy] = useState(false);

  const selectedPreset = findPresetById(selectedPresetId);

  // ===== LLM 相关方法 =====
  const handlePresetSelect = useCallback((preset: LlmPreset) => {
    setSelectedPresetId(preset.id);
    setApiBaseUrl(preset.defaultBaseUrl);
    setApiDefaultModel(preset.defaultModel);
    setFieldErrors({});
    setConnectionTest(null);
  }, []);

  const handleTestConnection = async () => {
    if (!selectedPreset || !apiBaseUrl.trim() || !apiKey.trim()) {
      setFieldErrors({ _form: "请先填写完整的接口地址和 API Key" });
      return;
    }

    setTestingConnection(true);
    setConnectionTest(null);

    try {
      const result = await testConnection(
        selectedPreset.id,
        apiBaseUrl,
        apiKey,
        apiDefaultModel
      );
      setConnectionTest(result);
    } catch (error) {
      setConnectionTest({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAndStart = async () => {
    if (!selectedPreset) return;

    const errors = validateLlmConfig({
      presetId: selectedPreset.id,
      baseUrl: apiBaseUrl,
      apiKey,
      model: apiDefaultModel
    });

    if (errors) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setBusy(true);

    try {
      await openclawBridge.saveApiKey(
        selectedPreset.providerId,
        apiKey.trim(),
        apiBaseUrl.trim() || undefined,
        apiDefaultModel.trim() || undefined
      );

      // 标记 Onboarding 完成，下次启动不再重复初始化
      await openclawBridge.markOnboardingCompleted();

      const result = await openclawBridge.switchToOpenClawUi();
      if (result.switched || true) {
        onLoginSuccess();
      } else {
        onLoginSuccess();
      }
    } catch (error) {
      // error handled silently
    } finally {
      setBusy(false);
    }
  };

  const compatibleMode = selectedPreset ? isCompatiblePreset(selectedPreset) : false;

  return (
    <section className="onboarding-shell enterprise-onboarding">
      <div className="enterprise-form">
        {/* LLM 预设卡片 */}
        <LlmProviderSelect selectedId={selectedPresetId} onSelect={handlePresetSelect} />

        {/* 表单 */}
        <div className="panel">
          <label className="field">
            <span className={compatibleMode ? "required" : ""}>接口地址 (Base URL)</span>
            <input
              value={apiBaseUrl}
              onChange={(e) => {
                setApiBaseUrl(e.target.value);
                setFieldErrors((prev) => ({ ...prev, baseUrl: "" }));
                setConnectionTest(null);
              }}
              placeholder={
                selectedPreset?.placeholderBaseUrl ?? selectedPreset?.defaultBaseUrl ?? ""
              }
              disabled={busy}
            />
            {fieldErrors.baseUrl ? <p className="field-error">{fieldErrors.baseUrl}</p> : null}
          </label>

          <label className="field">
            <span className="required">API Key</span>
            <div className="field-password-wrapper">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, apiKey: "", _form: "" }));
                  setConnectionTest(null);
                }}
                placeholder="输入你的 API Key"
                disabled={busy}
              />
              <button
                type="button"
                className="field-password-toggle"
                onClick={() => setShowApiKey(!showApiKey)}
                tabIndex={-1}
                aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.apiKey ? <p className="field-error">{fieldErrors.apiKey}</p> : null}
          </label>

          <label className="field">
            <span className={compatibleMode ? "required" : ""}>默认模型</span>
            <input
              value={apiDefaultModel}
              onChange={(e) => {
                setApiDefaultModel(e.target.value);
                setFieldErrors((prev) => ({ ...prev, model: "" }));
                setConnectionTest(null);
              }}
              placeholder={
                selectedPreset?.placeholderModel ?? selectedPreset?.defaultModel ?? ""
              }
              disabled={busy}
            />
            {fieldErrors.model ? <p className="field-error">{fieldErrors.model}</p> : null}
          </label>

          {connectionTest ? (
            <div className={`connection-status ${connectionTest.status}`}>
              <span className="connection-dot" /> {connectionTest.message}
            </div>
          ) : null}

          {fieldErrors._form ? (
            <div className="connection-status error">
              <span className="connection-dot" /> {fieldErrors._form}
            </div>
          ) : null}

          <div className="action-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleTestConnection()}
              disabled={busy || testingConnection || !apiBaseUrl.trim() || !apiKey.trim()}
            >
              {testingConnection ? (
                <><Loader2 size={14} className="spin" /> 测试中...</>
              ) : (
                "测试连接"
              )}
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleSaveAndStart()} disabled={!apiKey.trim() || busy}>
              {busy ? <><Loader2 size={14} className="spin" /> 启动中...</> : "开始使用"}
            </button>
          </div>

          <p className="hint" style={{ marginTop: 12 }}>
            API Key 将安全存储在系统钥匙串中。
          </p>
        </div>
      </div>
    </section>
  );
}
