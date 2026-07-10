import { useState, useMemo, useCallback } from "react";
import type {
  EnterpriseBlacklistItem,
  EnterpriseSkillCategory,
  EnterpriseSkillsConfig
} from "../../../bridge/types";

type Props = {
  config: EnterpriseSkillsConfig;
  /** 初始选中的 skill ID 集合 */
  initialSelected?: Set<string>;
  /** 选择变化回调 */
  onChange: (selected: Set<string>) => void;
};

/**
 * 从配置中提取黑名单 ID 集合
 */
function buildBlacklistSet(blacklist: EnterpriseBlacklistItem[]): Set<string> {
  return new Set(blacklist.map((item) => item.id));
}

/**
 * 提取所有必选 skill ID
 */
function buildRequiredSet(categories: EnterpriseSkillCategory[]): Set<string> {
  const required = new Set<string>();
  for (const cat of categories) {
    for (const skill of cat.skills) {
      if (skill.required) {
        required.add(skill.id);
      }
    }
  }
  return required;
}

export default function SkillSelector({ config, initialSelected, onChange }: Props) {
  const blacklistSet = useMemo(() => buildBlacklistSet(config.blacklist), [config.blacklist]);
  const requiredSet = useMemo(() => buildRequiredSet(config.categories), [config.categories]);

  // 初始化选中状态：必选 + defaultEnabled 的默认选中，其余不选
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initialSelected && initialSelected.size > 0) {
      return new Set(initialSelected);
    }

    const defaults = new Set<string>();
    for (const cat of config.categories) {
      for (const skill of cat.skills) {
        if (skill.required || skill.defaultEnabled) {
          defaults.add(skill.id);
        }
      }
    }
    return defaults;
  });

  const toggleSkill = useCallback(
    (skillId: string, isRequired: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (isRequired) {
          // 必选不可取消
          next.add(skillId);
        } else if (next.has(skillId)) {
          next.delete(skillId);
        } else {
          next.add(skillId);
        }
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  /** 统计信息 */
  const stats = useMemo(() => {
    let totalOptional = 0;
    let selectedOptional = 0;
    for (const cat of config.categories) {
      for (const skill of cat.skills) {
        if (!skill.required) {
          totalOptional++;
          if (selected.has(skill.id)) {
            selectedOptional++;
          }
        }
      }
    }
    return {
      totalRequired: requiredSet.size,
      totalOptional,
      selectedOptional,
      selectedTotal: selected.size
    };
  }, [config.categories, requiredSet, selected]);

  return (
    <div className="skill-selector">
      {/* 分类展示 */}
      {config.categories.map((category) => (
        <div key={category.id} className="skill-category">
          <h3 className="skill-category-title">{category.name}</h3>
          {category.description ? (
            <p className="skill-category-desc">{category.description}</p>
          ) : null}

          <div className="skill-grid">
            {category.skills
              .filter((skill) => !blacklistSet.has(skill.id)) // 黑名单不渲染
              .map((skill) => {
                const isRequired = skill.required === true;
                const isSelected = selected.has(skill.id);

                return (
                  <label
                    key={skill.id}
                    className={`skill-card ${isSelected ? "selected" : ""} ${isRequired ? "required" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isRequired}
                      onChange={() => toggleSkill(skill.id, isRequired)}
                      className="skill-checkbox"
                    />
                    <div className="skill-info">
                      <span className="skill-name">{skill.name}</span>
                      {skill.description ? (
                        <span className="skill-desc">{skill.description}</span>
                      ) : null}
                      {skill.platform ? (
                        <span className="skill-platform">{skill.platform}</span>
                      ) : null}
                    </div>
                    {isRequired ? (
                      <span className="skill-required-tag" title={skill.reason ?? "企业必备功能"}>
                        必选
                      </span>
                    ) : null}
                  </label>
                );
              })}
          </div>
        </div>
      ))}

      {/* 底部统计栏 */}
      <div className="skill-stats-bar">
        已选择 {stats.selectedTotal} 个技能
        （{stats.totalRequired} 个必选自动启用 + {stats.selectedOptional}/{stats.totalOptional} 个可选）
      </div>
    </div>
  );
}
