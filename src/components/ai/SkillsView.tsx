import React, { useState } from 'react';
import { AISkill, AISession } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { fetchSkillFromGitHubUrl, GITHUB_HOT_SKILLS_CATALOG } from '../../utils/ai';
import {
  Plus,
  Trash2,
  Star,
  Check,
  ExternalLink,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { Button, Field, Input, Textarea, Screen, useToast } from '../ui';

interface SkillsViewProps {
  skills: AISkill[];
  onUpdateSkills: (skills: AISkill[]) => void;
  sessions: AISession[];
  onUpdateSessions: React.Dispatch<React.SetStateAction<AISession[]>>;
  currentSessionId: string;
  onGoToChat: () => void;
}

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const SkillsView: React.FC<SkillsViewProps> = ({
  skills,
  onUpdateSkills,
  sessions,
  onUpdateSessions,
  currentSessionId,
  onGoToChat,
}) => {
  const toast = useToast();

  // -------------------------------------------------------------
  // Custom Skill Form
  // -------------------------------------------------------------
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillPrompt, setNewSkillPrompt] = useState('');
  const [newSkillTags, setNewSkillTags] = useState('');

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillPrompt.trim()) return;

    sound.playSuccess();
    const created: AISkill = {
      id: 'skill_' + Date.now(),
      name: newSkillName.trim(),
      icon: '',
      description: newSkillDesc.trim() || '自定义专业技能',
      systemPrompt: newSkillPrompt.trim(),
      isBuiltin: false,
      tags: newSkillTags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    };

    const updated = [...skills, created];
    onUpdateSkills(updated);
    db.saveAISkills(updated);
    setShowNewSkillModal(false);
    toast.success(`技能「${created.name}」已创建`);
  };

  const handleDeleteSkill = (id: string) => {
    sound.playTap();
    const updated = skills.filter(s => s.id !== id);
    onUpdateSkills(updated);
    db.saveAISkills(updated);
  };

  /** Bind a skill to the current chat session and jump to the conversation. */
  const handleApplySkillToChat = (skillId: string) => {
    sound.playTap();
    const updated = sessions.map(s =>
      s.id === currentSessionId ? { ...s, activeSkillId: skillId, updatedAt: new Date().toISOString() } : s
    );
    onUpdateSessions(updated);
    db.saveAISessions(updated);
    onGoToChat();
  };

  // -------------------------------------------------------------
  // GitHub Real Skills Hub
  // -------------------------------------------------------------
  const [showGitHubMarketModal, setShowGitHubMarketModal] = useState(false);
  const [gitHubUrlInput, setGitHubUrlInput] = useState('');
  const [isFetchingGitHub, setIsFetchingGitHub] = useState(false);

  const handleInstallGitHubSkill = (skillTemplate: AISkill) => {
    const isAlreadyInstalled = skills.some(
      s => s.id === skillTemplate.id || (s.name === skillTemplate.name && s.repo === skillTemplate.repo)
    );
    if (isAlreadyInstalled) {
      toast.info(`「${skillTemplate.name}」已在你的技能市场中`);
      return;
    }
    sound.playSuccess();
    const newSkill: AISkill = {
      ...skillTemplate,
      id: 'skill_gh_' + Date.now() + Math.random().toString(36).slice(2, 6),
      isBuiltin: false,
    };
    const updated = [...skills, newSkill];
    onUpdateSkills(updated);
    db.saveAISkills(updated);
    toast.success(`成功安装「${newSkill.name}」，已收录 GitHub 开源仓库：${newSkill.repo}`);
  };

  const handleFetchFromGitHubUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitHubUrlInput.trim() || isFetchingGitHub) return;
    setIsFetchingGitHub(true);
    sound.playTap();
    try {
      const parsed = await fetchSkillFromGitHubUrl(gitHubUrlInput.trim());
      const newSkill: AISkill = {
        id: 'skill_gh_' + Date.now(),
        name: parsed.name || 'GitHub 开源技能',
        icon: '',
        description: parsed.description || '从 GitHub 导入的开源技能',
        systemPrompt: parsed.systemPrompt || '',
        isBuiltin: false,
        tags: parsed.tags || ['GitHub导入'],
        repo: parsed.repo,
        repoUrl: parsed.repoUrl,
        author: parsed.author,
        stars: parsed.stars,
        license: parsed.license,
      };
      const updated = [...skills, newSkill];
      onUpdateSkills(updated);
      db.saveAISkills(updated);
      sound.playSuccess();
      setGitHubUrlInput('');
      setShowGitHubMarketModal(false);
      toast.success(`成功从 GitHub 导入技能「${newSkill.name}」`);
    } catch (err: any) {
      toast.error(`从 GitHub 导入失败：${err.message}`);
    } finally {
      setIsFetchingGitHub(false);
    }
  };

  return (
    <Screen className="max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-headline font-bold text-ink flex items-center gap-1.5 flex-wrap">
            <span>技能插件市场</span>
            <span className="text-caption font-semibold text-ink-3">({skills.length})</span>
          </h4>
          <p className="text-caption text-ink-2 mt-0.5">GitHub 权威开源专家技能与系统提示词库</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="neutral"
            size="sm"
            onClick={() => setShowGitHubMarketModal(true)}
            title="探索并一键安装 GitHub 开源热门技能"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub 集市</span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => setShowNewSkillModal(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>新建</span>
          </Button>
        </div>
      </div>

      {/* Skill Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {skills.map(skill => (
          <div
            key={skill.id}
            className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 space-y-2.5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sub font-bold text-ink truncate">{skill.name}</h5>
                  {skill.isBuiltin && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium shrink-0">
                      内置
                    </span>
                  )}
                </div>
                {skill.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {skill.tags.map(t => (
                      <span
                        key={t}
                        className="text-caption px-1.5 py-0.5 rounded-md bg-surface-2 text-ink-3 leading-none font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {!skill.isBuiltin && (
                <button
                  onClick={() => handleDeleteSkill(skill.id)}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-danger hover:bg-danger/10 transition shrink-0 tactile-press"
                  title="删除自定义技能"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* GitHub Repo Pill Badge */}
            {skill.repo && (
              <div className="flex items-center gap-1.5 text-caption bg-surface-2/80 border border-line/60 px-2 py-1 rounded-lg w-fit max-w-full">
                <GithubIcon className="w-3 h-3 text-ink-2 shrink-0" />
                <a
                  href={skill.repoUrl || `https://github.com/${skill.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="font-mono font-medium hover:underline text-accent truncate max-w-[150px]"
                  title="在 GitHub 查看开源仓库"
                >
                  {skill.repo}
                </a>
                {skill.stars && (
                  <span className="flex items-center gap-0.5 text-warn font-bold shrink-0">
                    <Star className="w-3 h-3 fill-warn" />
                    <span>{skill.stars.replace('★', '').trim()}</span>
                  </span>
                )}
                {skill.license && (
                  <span className="text-ink-3 border-l border-line pl-1.5 shrink-0">{skill.license}</span>
                )}
              </div>
            )}

            <p className="text-caption text-ink-2 leading-relaxed flex-1">{skill.description}</p>

            <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-line/70">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-caption text-ink-3 shrink-0">
                  {skill.isBuiltin ? '内置开源技能' : '用户导入'}
                </span>
                {skill.repoUrl && (
                  <a
                    href={skill.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-caption text-accent hover:underline flex items-center gap-0.5"
                    title="在浏览器中打开 GitHub 仓库"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>GitHub 源码</span>
                  </a>
                )}
              </div>
              <button
                onClick={() => handleApplySkillToChat(skill.id)}
                className="text-caption text-accent font-semibold hover:underline flex items-center gap-0.5 tactile-press shrink-0"
              >
                <span>应用至对话</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Skill BottomSheet */}
      <BottomSheet
        isOpen={showNewSkillModal}
        onClose={() => setShowNewSkillModal(false)}
        title="创建自定义技能"
      >
        <form onSubmit={handleCreateSkill} className="space-y-3.5 pb-2">
          <Field label="技能名称" required>
            <Input
              type="text"
              required
              placeholder="例如：财务分析顾问"
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
            />
          </Field>

          <Field label="简短说明">
            <Input
              type="text"
              placeholder="描述该技能的使用场景…"
              value={newSkillDesc}
              onChange={e => setNewSkillDesc(e.target.value)}
            />
          </Field>

          <Field label="系统提示词 (System Prompt)" required>
            <Textarea
              rows={4}
              required
              placeholder="你是一位经验丰富的专业人士，请遵循以下准则回应…"
              value={newSkillPrompt}
              onChange={e => setNewSkillPrompt(e.target.value)}
            />
          </Field>

          <Field label="标签分类" hint="多个标签用逗号分隔">
            <Input
              type="text"
              placeholder="效率, 商业, 助手"
              value={newSkillTags}
              onChange={e => setNewSkillTags(e.target.value)}
            />
          </Field>

          <div className="pt-1 flex items-center justify-end gap-2.5">
            <Button type="button" variant="ghost" size="md" onClick={() => setShowNewSkillModal(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary" size="md" className="min-w-[108px]">
              创建技能
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* GitHub Market Explorer BottomSheet */}
      <BottomSheet
        isOpen={showGitHubMarketModal}
        onClose={() => setShowGitHubMarketModal(false)}
        title="GitHub 开源技能集市"
        subtitle="收录 f/awesome-chatgpt-prompts、Fabric 等权威高星技能"
        maxHeight="max-h-[90dvh]"
      >
        <div className="space-y-3 pb-2">
          {/* URL Live Fetcher Box */}
          <form
            onSubmit={handleFetchFromGitHubUrl}
            className="shrink-0 p-3.5 bg-surface-2/60 rounded-2xl border border-line/60 space-y-2"
          >
            <label className="text-caption font-bold text-ink-2 flex items-center gap-1 select-none">
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>从任意 GitHub URL 或 Raw Markdown 导入</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="url"
                placeholder="例如：https://github.com/f/awesome-chatgpt-prompts"
                value={gitHubUrlInput}
                onChange={e => setGitHubUrlInput(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!gitHubUrlInput.trim() || isFetchingGitHub}
                className="shrink-0"
              >
                {isFetchingGitHub ? '解析中…' : '拉取导入'}
              </Button>
            </div>
          </form>

          {/* Curated Hot Skills List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-ink-2">
                GitHub 精选高星开源技能 ({GITHUB_HOT_SKILLS_CATALOG.length})
              </span>
              <span className="text-caption text-ink-3">100% 真实源码来源</span>
            </div>

            {GITHUB_HOT_SKILLS_CATALOG.map(ghSkill => {
              const isInstalled = skills.some(
                s => s.id === ghSkill.id || (s.name === ghSkill.name && s.repo === ghSkill.repo)
              );
              return (
                <div
                  key={ghSkill.id}
                  className="p-3.5 rounded-2xl border border-line bg-surface shadow-elev-1 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sub font-bold text-ink truncate">{ghSkill.name}</h5>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-caption text-accent font-mono truncate max-w-[140px]">
                          {ghSkill.repo}
                        </span>
                        <span className="text-caption px-1.5 py-0.5 rounded-md bg-warn/10 text-warn font-bold flex items-center gap-0.5 shrink-0">
                          <Star className="w-3 h-3 fill-warn" />
                          <span>{ghSkill.stars}</span>
                        </span>
                        <span className="text-caption text-ink-3 shrink-0">{ghSkill.license}</span>
                      </div>
                    </div>

                    <Button
                      variant={isInstalled ? 'neutral' : 'primary'}
                      size="sm"
                      onClick={() => handleInstallGitHubSkill(ghSkill)}
                      disabled={isInstalled}
                      className="shrink-0"
                    >
                      {isInstalled ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-ok" />
                          <span>已安装</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>一键安装</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-caption text-ink-2 leading-relaxed">{ghSkill.description}</p>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/70">
                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                      {ghSkill.tags.map(t => (
                        <span
                          key={t}
                          className="text-caption px-1.5 py-0.5 rounded-md bg-surface-2 text-ink-3"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <a
                      href={ghSkill.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-caption text-accent hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>查看原仓</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </Screen>
  );
};
