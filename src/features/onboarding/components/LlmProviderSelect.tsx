import { useMemo } from "react";
import type { LlmPreset } from "../../../data/llm-presets";
import { ALL_LLM_PRESETS, isCompatiblePreset } from "../../../data/llm-presets";

type Props = {
  selectedId: string;
  onSelect: (preset: LlmPreset) => void;
};

/** 取首字或前两字母作为图标文字 */
function getIconLabel(label: string): string {
  // 英文取首字母
  if (/^[a-zA-Z]/u.test(label)) {
    return label.charAt(0).toUpperCase();
  }
  // 中文取第一个字符
  return label.charAt(0);
}

export default function LlmProviderSelect({ selectedId, onSelect }: Props) {
  const presets = useMemo(() => ALL_LLM_PRESETS, []);

  return (
    <div className="provider-grid">
      {presets.map((preset) => {
        const isSelected = preset.id === selectedId;
        const compatible = isCompatiblePreset(preset);

        return (
          <button
            key={preset.id}
            type="button"
            className={`provider-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(preset)}
          >
            <div className="provider-card-header">
              <div className={`provider-card-icon ${preset.icon}`}>
                {getIconLabel(preset.label)}
              </div>
              <span className="provider-card-name">{preset.label}</span>
            </div>
            {preset.tag ? (
              <span className={`provider-card-tag ${preset.tag}`}>
                {preset.tag === "recommended" ? "推荐" : "默认"}
              </span>
            ) : compatible ? (
              <span className="provider-card-tag default">自定义</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
