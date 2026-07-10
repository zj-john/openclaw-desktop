import { useState, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import type { ChannelConfigValues } from "../../../types/channels";
import { CHANNEL_DEFINITIONS, findChannelDef } from "../../../types/channels";

type Props = {
  /** 当用户完成渠道配置或跳过时回调 */
  onComplete: (result: { skipped: boolean; channels: Record<string, ChannelConfigValues | null> }) => void;
  /** 返回上一步回调 */
  onBack?: () => void;
};

export default function ChannelConfig({ onComplete, onBack }: Props) {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [channelValues, setChannelValues] = useState<Record<string, ChannelConfigValues | null>>(() => {
    // 初始化所有渠道为 null
    const init: Record<string, ChannelConfigValues | null> = {};
    for (const ch of CHANNEL_DEFINITIONS) {
      init[ch.id] = null;
    }
    return init;
  });

  const toggleExpand = useCallback((channelId: string) => {
    setExpandedChannel((prev) => (prev === channelId ? null : channelId));
  }, []);

  const updateFieldValue = useCallback((channelId: string, fieldKey: string, value: string) => {
    setChannelValues((prev) => {
      const current = prev[channelId] ?? {};
      return { ...prev, [channelId]: { ...current, [fieldKey]: value } };
    });
  }, []);

  const handleSaveChannel = (channelId: string) => {
    const def = findChannelDef(channelId);
    if (!def) return;

    const values = channelValues[channelId];
    if (!values) return;

    // 基本校验：必填字段
    for (const field of def.fields) {
      if (field.required && !values[field.key]?.trim()) {
        return;
      }
    }
  };

  const handleDone = () => {
    // 渠道配置均为可选，直接提交当前状态
    onComplete({ skipped: false, channels: channelValues });
  };

  return (
    <div className="channel-wizard">
      {/* 渠道列表 */}
      <div className="channel-list">
        {CHANNEL_DEFINITIONS.map((channel) => {
          const isExpanded = expandedChannel === channel.id;
          const values = channelValues[channel.id];
          const hasValues = values && Object.values(values).some((v) => v?.trim());

          return (
            <div key={channel.id} className={`channel-item ${isExpanded ? "expanded" : ""}`}>
              {/* 渠道头部 */}
              <button
                type="button"
                className="channel-header"
                onClick={() => toggleExpand(channel.id)}
              >
                <span className="channel-icon">{channel.icon}</span>
                <span className="channel-name">{channel.name}</span>
                <span className="channel-desc">{channel.description}</span>
                {hasValues ? (
                  <span className="channel-badge configured">已配置</span>
                ) : (
                  <span className="channel-badge">可选</span>
                )}
                <span className="channel-expand-icon">{isExpanded ? "▾" : "▸"}</span>
              </button>

              {/* 展开的表单 */}
              {isExpanded ? (
                <div className="channel-form">
                  {channel.helpUrl ? (
                    <p className="hint">
                      <a href={channel.helpUrl} target="_blank" rel="noopener noreferrer">
                        查看配置指南 →
                      </a>
                    </p>
                  ) : null}

                  {channel.fields.map((field) => (
                    <label key={field.key} className="field">
                      <span className={field.required ? "required" : ""}>
                        {field.label}
                      </span>
                      <input
                        type={field.type}
                        value={values?.[field.key] ?? ""}
                        onChange={(e) => updateFieldValue(channel.id, field.key, e.target.value)}
                        placeholder={field.placeholder ?? ""}
                      />
                      {field.hint ? <p className="hint">{field.hint}</p> : null}
                    </label>
                  ))}

                  <div className="action-row">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleSaveChannel(channel.id)}
                    >
                      保存此渠道
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* 底部操作栏 */}
      <div className="channel-actions">
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            <ChevronLeft size={16} /> 上一步
          </button>
        ) : null}
        <button type="button" className="btn-primary" onClick={handleDone}>
          下一步
        </button>
      </div>
    </div>
  );
}
