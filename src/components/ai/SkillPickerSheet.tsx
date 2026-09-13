import React, { useState, useMemo } from 'react';
import { AISkill } from '../../types';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import {
  X,
  Search,
  Check,
  Star,
  Compass,
  ChevronRight,
} from 'lucide-react';

interface SkillPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  skills: AISkill[];
  activeSkillId?: string;
  onSelectSkill: (skillId: string) => void;
  onGoToSkillsCatalog?: () => void;
}

export const SkillPickerSheet: React.FC<SkillPickerSheetProps> = ({
  isOpen,
  onClose,
  skills,
  activeSkillId,
  onSelectSkill,
  onGoToSkillsCatalog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter skills based on search input
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const q = searchQuery.toLowerCase().trim();
    return skills.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q)) ||
        s.author?.toLowerCase().includes(q)
    );
  }, [skills, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (skillId: string) => {
    sound.playTap();
    haptics.impactLight();
    onSelectSkill(skillId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop with frosted blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => {
          sound.playTap();
          onClose();
        }}
      />

      {/* Sheet Container */}
      <div
        className="relative w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] bg-surface rounded-t-[32px] sm:rounded-3xl border border-line shadow-2xl flex flex-col overflow-hidden z-10 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-ink-4/30" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-surface-2 border border-line text-ink-2 flex items-center justify-center shrink-0 font-bold text-xs">
              AI
            </div>
            <div className="min-w-0">
              <h3 className="text-body font-bold text-ink truncate leading-snug">
                选择 AI 智能体 / 技能
              </h3>
              <p className="text-caption text-ink-3 truncate">
                共 {skills.length} 个角色预设 · 切换即生效
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center active:scale-95 transition shrink-0"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar (when skills count > 3) */}
        {skills.length > 3 && (
          <div className="px-5 pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索技能名称、专业角色或标签..."
                className="w-full bg-surface-2 rounded-2xl pl-9 pr-8 py-2 text-sub text-ink placeholder:text-ink-3 outline-none border border-transparent focus:border-accent/40 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Skill Cards List */}
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-2.5">
          {filteredSkills.length === 0 ? (
            <div className="py-12 text-center text-ink-3 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sub font-medium">未找到匹配的智能体技能</p>
              <p className="text-caption">可以尝试更换关键词搜索</p>
            </div>
          ) : (
            filteredSkills.map(skill => {
              const isSelected = skill.id === activeSkillId;
              return (
                <div
                  key={skill.id}
                  onClick={() => handleSelect(skill.id)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none tactile-press ${
                    isSelected
                      ? 'border-accent bg-accent/8 shadow-sm ring-1 ring-accent/30'
                      : 'border-line hover:border-accent/40 bg-surface-2/60 hover:bg-surface-2'
                  }`}
                >
                  {/* Center Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-sub font-bold leading-tight truncate ${
                          isSelected ? 'text-accent' : 'text-ink'
                        }`}
                      >
                        {skill.name}
                      </span>
                      {skill.isBuiltin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-semibold shrink-0">
                          官方内置
                        </span>
                      )}
                      {skill.tags?.slice(0, 2).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-3 text-ink-3 font-medium shrink-0"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <p className="text-caption text-ink-3 line-clamp-2 mt-1 leading-relaxed">
                      {skill.description || '专为特定场景优化的系统级角色与提示词'}
                    </p>

                    {skill.author && (
                      <div className="text-[10px] text-ink-3/80 mt-1 flex items-center gap-1">
                        <span>贡献者：{skill.author}</span>
                        {skill.stars && (
                          <span className="text-amber-500 font-semibold inline-flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            <span>{skill.stars.replace('★', '').trim()}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Check / Radio Indicator */}
                  <div className="shrink-0 pt-1">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-xs animate-scale-in">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-line group-hover:border-accent/50 transition-colors" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Link to Skill Catalog / Market */}
        {onGoToSkillsCatalog && (
          <div className="p-3.5 bg-surface-2/70 border-t border-line flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-caption text-ink-3">
              <Compass className="w-4 h-4 text-accent shrink-0" />
              <span>想要更多专业技能与助手？</span>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onClose();
                onGoToSkillsCatalog();
              }}
              className="px-3 py-1.5 rounded-xl bg-accent text-white text-caption font-bold flex items-center gap-1 shadow-xs hover:opacity-90 active:scale-95 transition shrink-0"
            >
              <span>技能市场</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
