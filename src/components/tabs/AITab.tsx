import React, { useState, useRef, useEffect } from 'react';
import {
  AIProvider,
  AISession,
  AIMessage,
  AISkill,
  AIImageGeneration,
  AccentColor,
} from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import {
  streamChatCompletion,
  generateAIImage,
  testProviderLatency,
  fetchModelsFromProvider,
  formatFriendlyAIError,
  DEFAULT_CUSTOM_PROVIDER,
  SECOND_CUSTOM_PROVIDER,
  BUILTIN_SKILLS,
  GITHUB_HOT_SKILLS_CATALOG,
  fetchSkillFromGitHubUrl,
} from '../../utils/ai';
import {
  Bot,
  Sparkles,
  Send,
  Square,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  Settings,
  Puzzle,
  ChevronDown,
  ExternalLink,
  Download,
  AlertCircle,
  Zap,
  Sliders,
  X,
  Star,
  Globe,
  Eye,
  EyeOff,
  Brain,
} from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const ThinkingProcessCard: React.FC<{
  reasoning: string;
  isReasoning?: boolean;
  durationSeconds?: number;
}> = ({ reasoning, isReasoning, durationSeconds }) => {
  const [isExpanded, setIsExpanded] = useState(isReasoning ?? false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isReasoning) {
      setIsExpanded(true);
    }
  }, [isReasoning]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(reasoning);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-2 rounded-2xl border border-purple-200/60 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden transition-all shadow-xs">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-purple-100/40 dark:hover:bg-purple-900/30 transition select-none"
      >
        <div className="flex items-center space-x-1.5 text-xs">
          {isReasoning ? (
            <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>正在深度思考中...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-purple-700 dark:text-purple-300 font-medium">
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span>已完成深度思考 {durationSeconds ? `(用时 ${durationSeconds} 秒)` : ''}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 text-zinc-400">
          <span className="text-[10px] text-zinc-400">{isExpanded ? '收起' : '展开'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-2.5 pt-1 border-t border-purple-100/80 dark:border-purple-900/30 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 font-mono select-text whitespace-pre-wrap max-h-52 overflow-y-auto">
          {reasoning}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center space-x-1"
            >
              {copied ? <Check className="w-3 h-3 text-[#07C160]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '已复制' : '复制思考过程'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface AITabProps {
  providers: AIProvider[];
  onUpdateProviders: (providers: AIProvider[]) => void;
  sessions: AISession[];
  onUpdateSessions: React.Dispatch<React.SetStateAction<AISession[]>>;
  skills: AISkill[];
  onUpdateSkills: (skills: AISkill[]) => void;
  images: AIImageGeneration[];
  onUpdateImages: (images: AIImageGeneration[]) => void;
  accentColor: AccentColor;
}

export const AITab: React.FC<AITabProps> = ({
  providers,
  onUpdateProviders,
  sessions,
  onUpdateSessions,
  skills,
  onUpdateSkills,
  images,
  onUpdateImages,
  accentColor,
}) => {
  const [subTab, setSubTab] = useState<'chat' | 'images' | 'skills' | 'providers'>('chat');

  // Active Provider & Session
  const activeProvider = providers.find(p => p.isActive) || providers[0];
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    sessions[0]?.id || 'sess_default'
  );
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  // Active Skill for chat
  const activeSkill = skills.find(s => s.id === currentSession?.activeSkillId) || skills[0];

  // Chat input and streaming state
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isStreaming]);

  const copyWithFeedback = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    sound.playTap();
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // -------------------------------------------------------------
  // Chat Actions
  // -------------------------------------------------------------
  const handleNewSession = () => {
    sound.playTap();
    const newSession: AISession = {
      id: 'sess_' + Date.now(),
      title: '新对话 ' + (sessions.length + 1),
      activeSkillId: activeSkill?.id || 'skill_cat',
      messages: [
        {
          id: 'msg_welcome_' + Date.now(),
          role: 'assistant',
          content: `${activeSkill?.icon || '🐱'} 你好呀！我是【${activeSkill?.name || '猫步伴侣'}】，今天有什么想跟我聊聊或者需要我协助的吗？喵~`,
          timestamp: new Date().toISOString(),
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newSession, ...sessions];
    onUpdateSessions(updated);
    db.saveAISessions(updated);
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    if (sessions.length <= 1) {
      alert('请保留至少一个会话');
      return;
    }
    const updated = sessions.filter(s => s.id !== id);
    onUpdateSessions(updated);
    db.saveAISessions(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(updated[0].id);
    }
  };

  const handleSelectSkillForSession = (skillId: string) => {
    sound.playTap();
    const updated = sessions.map(s =>
      s.id === currentSessionId ? { ...s, activeSkillId: skillId, updatedAt: new Date().toISOString() } : s
    );
    onUpdateSessions(updated);
    db.saveAISessions(updated);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    if (!activeProvider?.apiKey && !activeProvider?.baseUrl.includes('localhost')) {
      alert('提示：当前大模型服务商未配置 API Key，请前往「模型配置」选项卡填写并保存你的 API Key。');
      setSubTab('providers');
      return;
    }

    sound.playTap();
    const userText = inputMessage.trim();
    setInputMessage('');

    const userMsg: AIMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = 'msg_ai_' + (Date.now() + 1);
    const initialAssistantMsg: AIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    const updatedSession = {
      ...currentSession,
      title: currentSession.messages.length <= 1 ? userText.slice(0, 16) : currentSession.title,
      messages: [...currentSession.messages, userMsg, initialAssistantMsg],
      updatedAt: new Date().toISOString(),
    };

    const nextSessions = sessions.map(s => (s.id === currentSessionId ? updatedSession : s));
    onUpdateSessions(nextSessions);
    db.saveAISessions(nextSessions);

    // Start Streaming
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    const reasoningStartTime = Date.now();
    let hasEndedReasoning = false;

    try {
      const historyForApi = updatedSession.messages
        .slice(0, -1) // omit the empty placeholder
        .slice(-10)   // send last 10 messages for context
        .map(m => ({ role: m.role, content: m.content }));

      await streamChatCompletion({
        provider: activeProvider,
        messages: historyForApi,
        systemPrompt: activeSkill?.systemPrompt,
        signal: abortControllerRef.current.signal,
        onReasoningChunk: reasoningDelta => {
          onUpdateSessions(prev =>
            prev.map(s => {
              if (s.id === currentSessionId) {
                const nextMsgs = s.messages.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        reasoningContent: (m.reasoningContent || '') + reasoningDelta,
                        isReasoning: true,
                      }
                    : m
                );
                return { ...s, messages: nextMsgs };
              }
              return s;
            })
          );
        },
        onChunk: delta => {
          if (!hasEndedReasoning) {
            hasEndedReasoning = true;
          }
          const duration = Math.max(1, Math.round((Date.now() - reasoningStartTime) / 1000));
          onUpdateSessions(prev =>
            prev.map(s => {
              if (s.id === currentSessionId) {
                const nextMsgs = s.messages.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: m.content + delta,
                        isReasoning: false,
                        reasoningDurationSeconds: m.reasoningContent
                          ? m.reasoningDurationSeconds || duration
                          : undefined,
                      }
                    : m
                );
                return { ...s, messages: nextMsgs };
              }
              return s;
            })
          );
        },
      });

      // Finish streaming successfully
      setIsStreaming(false);
      sound.playTap();
      // Sync final to DB
      setTimeout(() => {
        db.saveAISessions(sessions);
      }, 500);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('User aborted generation');
      } else {
        console.error('Chat error:', err);
        const friendlyError = formatFriendlyAIError(err.message);
        onUpdateSessions(prev =>
          prev.map(s => {
            if (s.id === currentSessionId) {
              const nextMsgs = s.messages.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: m.content || friendlyError,
                      isStreaming: false,
                      isReasoning: false,
                      error: err.message,
                    }
                  : m
              );
              return { ...s, messages: nextMsgs };
            }
            return s;
          })
        );
      }
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      sound.playTap();
    }
  };

  // -------------------------------------------------------------
  // Image Generation Actions
  // -------------------------------------------------------------
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageStyle, setImageStyle] = useState('vivid');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [selectedImgLightbox, setSelectedImgLightbox] = useState<AIImageGeneration | null>(null);

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImg) return;
    if (!activeProvider?.apiKey) {
      alert('请先在「模型配置」中配置 OpenAI 或兼容厂商的 API Key');
      setSubTab('providers');
      return;
    }

    setIsGeneratingImg(true);
    sound.playTap();

    try {
      const generated = await generateAIImage({
        provider: activeProvider,
        prompt: imagePrompt.trim(),
        size: imageSize,
        style: imageStyle,
      });

      const updated = [generated, ...images];
      onUpdateImages(updated);
      db.saveAIImages(updated);
      sound.playSuccess();
      setImagePrompt('');
    } catch (err: any) {
      alert(`生图失败: ${err.message}`);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // -------------------------------------------------------------
  // Skills Hub Actions
  // -------------------------------------------------------------
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillIcon, setNewSkillIcon] = useState('🐱');
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
      icon: newSkillIcon.trim() || '✨',
      description: newSkillDesc.trim() || '自定义专业技能',
      systemPrompt: newSkillPrompt.trim(),
      isBuiltin: false,
      tags: newSkillTags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    };

    const updated = [...skills, created];
    onUpdateSkills(updated);
    db.saveAISkills(updated);
    setShowNewSkillModal(false);
  };

  const handleDeleteSkill = (id: string) => {
    sound.playTap();
    const updated = skills.filter(s => s.id !== id);
    onUpdateSkills(updated);
    db.saveAISkills(updated);
  };

  // -------------------------------------------------------------
  // GitHub Real Skills Hub Actions
  // -------------------------------------------------------------
  const [showGitHubMarketModal, setShowGitHubMarketModal] = useState(false);
  const [gitHubUrlInput, setGitHubUrlInput] = useState('');
  const [isFetchingGitHub, setIsFetchingGitHub] = useState(false);
  const [gitHubFilter, setGitHubFilter] = useState<'all' | 'awesome' | 'fabric' | 'anthropic'>('all');

  const handleInstallGitHubSkill = (skillTemplate: AISkill) => {
    sound.playSuccess();
    const isAlreadyInstalled = skills.some(
      s => s.id === skillTemplate.id || (s.name === skillTemplate.name && s.repo === skillTemplate.repo)
    );
    if (isAlreadyInstalled) {
      alert(`「${skillTemplate.name}」已在你的技能市场中！`);
      return;
    }
    const newSkill: AISkill = {
      ...skillTemplate,
      id: 'skill_gh_' + Date.now() + Math.random().toString(36).slice(2, 6),
      isBuiltin: false,
    };
    const updated = [...skills, newSkill];
    onUpdateSkills(updated);
    db.saveAISkills(updated);
    alert(`🎉 成功安装「${newSkill.name}」！\n已收录来自 GitHub 真实开源仓库: ${newSkill.repo}`);
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
        icon: parsed.icon || '🐙',
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
      alert(`🎉 成功从 GitHub 导入技能「${newSkill.name}」！`);
    } catch (err: any) {
      alert(`从 GitHub 导入失败: ${err.message}`);
    } finally {
      setIsFetchingGitHub(false);
    }
  };

  // -------------------------------------------------------------
  // Custom Endpoint / API Console Actions
  // -------------------------------------------------------------
  const currentCustomProvider =
    providers.find(p => p.isActive) || providers[0] || DEFAULT_CUSTOM_PROVIDER;
  const [showApiKey, setShowApiKey] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [customModelInputMode, setCustomModelInputMode] = useState(false);

  const [activeBaseUrl, setActiveBaseUrl] = useState(currentCustomProvider?.baseUrl || '');
  const [activeApiKey, setActiveApiKey] = useState(currentCustomProvider?.apiKey || '');
  const [activeModel, setActiveModel] = useState(currentCustomProvider?.defaultModel || '');
  const [availableModelsList, setAvailableModelsList] = useState<string[]>(
    currentCustomProvider?.availableModels || []
  );
  const [customModelManualName, setCustomModelManualName] = useState('');

  // Keep in sync when active provider changes
  useEffect(() => {
    if (currentCustomProvider) {
      setActiveBaseUrl(currentCustomProvider.baseUrl);
      setActiveApiKey(currentCustomProvider.apiKey);
      setActiveModel(currentCustomProvider.defaultModel);
      setAvailableModelsList(currentCustomProvider.availableModels || []);
    }
  }, [currentCustomProvider?.id]);

  // Fetch models from /models endpoint
  const handleFetchModels = async () => {
    if (!activeBaseUrl.trim()) {
      alert('请先输入 API 接口地址 (Base URL)');
      return;
    }
    setIsFetchingModels(true);
    sound.playTap();
    try {
      const models = await fetchModelsFromProvider(activeBaseUrl.trim(), activeApiKey.trim());
      setAvailableModelsList(models);
      if (models.length > 0 && (!activeModel || !models.includes(activeModel))) {
        setActiveModel(models[0]);
      }
      sound.playSuccess();
      alert(`🎉 成功获取到 ${models.length} 个可用大模型！\n已更新至模型选择列表。`);

      // Auto persist fetched models
      const updated = providers.map(p =>
        p.id === currentCustomProvider.id
          ? {
              ...p,
              availableModels: models,
              defaultModel: models.includes(activeModel) ? activeModel : models[0],
            }
          : p
      );
      onUpdateProviders(updated);
      db.saveAIProviders(updated);
    } catch (err: any) {
      alert(`获取模型失败: ${err.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Quick switch between user's two test endpoints
  const handleQuickLoadPreset = (preset: AIProvider) => {
    sound.playTap();
    setActiveBaseUrl(preset.baseUrl);
    setActiveApiKey(preset.apiKey);
    setActiveModel(preset.defaultModel);
    setAvailableModelsList(preset.availableModels);

    const updated = providers.some(p => p.id === preset.id)
      ? providers.map(p => ({ ...p, isActive: p.id === preset.id }))
      : [{ ...preset, isActive: true }, ...providers.map(p => ({ ...p, isActive: false }))];

    onUpdateProviders(updated);
    db.saveAIProviders(updated);
  };

  // Save custom config
  const handleSaveCustomConfig = () => {
    sound.playSuccess();
    const modelToUse =
      customModelInputMode && customModelManualName.trim()
        ? customModelManualName.trim()
        : activeModel.trim() || 'deepseek-v4-flash';

    const updatedList = Array.from(new Set([modelToUse, ...availableModelsList]));

    const updatedProvider: AIProvider = {
      ...currentCustomProvider,
      baseUrl: activeBaseUrl.trim(),
      apiKey: activeApiKey.trim(),
      defaultModel: modelToUse,
      availableModels: updatedList,
      isActive: true,
    };

    const nextProviders = providers.map(p =>
      p.id === currentCustomProvider.id ? updatedProvider : { ...p, isActive: false }
    );
    if (!nextProviders.some(p => p.id === updatedProvider.id)) {
      nextProviders.push(updatedProvider);
    }

    onUpdateProviders(nextProviders);
    db.saveAIProviders(nextProviders);
    setCustomModelInputMode(false);
    alert('🎉 自定义兼容大模型配置已保存并激活！当前生效模型：' + modelToUse);
  };

  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTestLatency = async (prov: AIProvider) => {
    sound.playTap();
    setTestingId(prov.id);
    const res = await testProviderLatency(prov);
    const updated = providers.map(p =>
      p.id === prov.id
        ? {
            ...p,
            latency: res.ok ? res.latency : undefined,
            lastTestedAt: new Date().toISOString(),
          }
        : p
    );
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    setTestingId(null);
    alert(`${prov.name} ${res.message}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#EDEDED] dark:bg-[#111111]">
      {/* AI Sub-navigation Segmented Bar */}
      <div className="p-3 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 shrink-0">
        <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800/80 p-1 rounded-2xl text-xs select-none">
          <button
            onClick={() => {
              sound.playTap();
              setSubTab('chat');
            }}
            className={`flex-1 py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center space-x-1 ${
              subTab === 'chat'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-[#07C160]" />
            <span>智能对话</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setSubTab('images');
            }}
            className={`flex-1 py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center space-x-1 ${
              subTab === 'images'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#FF6B8B]" />
            <span>AI 生图</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setSubTab('skills');
            }}
            className={`flex-1 py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center space-x-1 ${
              subTab === 'skills'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5 text-blue-500" />
            <span>技能插件</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setSubTab('providers');
            }}
            className={`flex-1 py-1.5 rounded-xl font-semibold transition-all flex items-center justify-center space-x-1 ${
              subTab === 'providers'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>模型配置</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ========================================================= */}
        {/* SUBTAB 1: AI CHAT (WECHAT BUBBLE STYLE)                    */}
        {/* ========================================================= */}
        {subTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Session & Active Skill Banner */}
            <div className="px-3.5 py-2 bg-white/50 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between shrink-0 text-xs">
              {/* Skill quick selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-sm">{activeSkill?.icon || '🐱'}</span>
                <select
                  value={currentSession?.activeSkillId || skills[0]?.id}
                  onChange={e => handleSelectSkillForSession(e.target.value)}
                  className="bg-transparent font-bold text-zinc-800 dark:text-zinc-200 border-none outline-none cursor-pointer"
                >
                  {skills.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Controls: New Session & Provider badge */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    setSubTab('providers');
                  }}
                  className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-emerald-700 dark:text-emerald-300 font-mono font-semibold hover:opacity-80 flex items-center space-x-1.5 transition shadow-xs"
                  title="点击进入模型配置切换端点或模型"
                >
                  <span className="w-2 h-2 rounded-full bg-[#07C160] animate-pulse"></span>
                  <span className="truncate max-w-[130px]">{activeProvider?.defaultModel || '模型配置'}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                <button
                  onClick={handleNewSession}
                  className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                  title="新建对话"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages List (WeChat Style Bubbles) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {currentSession?.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex items-start space-x-2.5 ${
                      isUser ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 shadow-xs select-none">
                      {isUser ? (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">
                          我
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-300 to-amber-200 flex items-center justify-center text-sm ring-1 ring-white">
                          {activeSkill?.icon || '🐱'}
                        </div>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className="max-w-[82%] space-y-1">
                      {/* Thinking Process Accordion (深度思考链) */}
                      {!isUser && msg.reasoningContent && (
                        <ThinkingProcessCard
                          reasoning={msg.reasoningContent}
                          isReasoning={msg.isReasoning || (msg.isStreaming && !msg.content)}
                          durationSeconds={msg.reasoningDurationSeconds}
                        />
                      )}

                      <div
                        className={`p-3 text-xs sm:text-sm leading-relaxed ${
                          isUser ? 'bubble-self' : 'bubble-other'
                        }`}
                      >
                        {msg.content ? (
                          <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                        ) : msg.isStreaming ? (
                          msg.isReasoning ? (
                            <div className="text-zinc-400 italic text-xs flex items-center space-x-1.5 py-0.5">
                              <Sparkles className="w-3 h-3 text-amber-500 animate-spin" />
                              <span>正在深度思考并组织回复...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5 text-zinc-400 py-1">
                              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"></span>
                              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]"></span>
                              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                          )
                        ) : msg.error ? (
                          <div className="space-y-2 text-amber-800 dark:text-amber-200">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="leading-relaxed">
                                <p className="font-semibold">{formatFriendlyAIError(msg.error)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                sound.playTap();
                                setSubTab('providers');
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium text-[11px] flex items-center space-x-1 shadow-xs"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>前往【模型配置】更新密钥或切换端点</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">空消息</span>
                        )}
                      </div>

                      {/* Message Actions */}
                      {!isUser && msg.content && !msg.isStreaming && (
                        <div className="flex items-center space-x-2 px-1 text-[10px] text-zinc-400">
                          <button
                            onClick={() => copyWithFeedback(msg.content, msg.id)}
                            className="hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center space-x-1"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-3 h-3 text-[#07C160]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedMsgId === msg.id ? '已复制' : '复制'}</span>
                          </button>
                          <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar (WeChat Bottom Textarea) */}
            <div className="p-3 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              {/* Quick Prompts */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 no-scrollbar text-xs">
                {['今日备忘规划', '写一段温暖问候', 'Python 代码优化', '小红书种草文案'].map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      setInputMessage(p);
                      sound.playTap();
                    }}
                    className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 whitespace-nowrap text-[11px] hover:bg-zinc-200"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex items-end space-x-2">
                <textarea
                  rows={1}
                  placeholder={`与【${activeSkill?.name || '猫步伴侣'}】对话，Enter 发送...`}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 max-h-24 p-2.5 text-xs sm:text-sm rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none resize-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 leading-normal"
                />

                {isStreaming ? (
                  <button
                    onClick={handleStopStreaming}
                    className="p-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-sm active:scale-95 transition"
                    title="停止生成"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className={`p-2.5 rounded-2xl transition ${
                      inputMessage.trim()
                        ? 'bg-[#07C160] hover:bg-[#06AD56] text-white shadow-sm active:scale-95'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: AI IMAGE STUDIO (生图工作室)                    */}
        {/* ========================================================= */}
        {subTab === 'images' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
            {/* Prompt Generator Box */}
            <div className="glass-card p-4 rounded-3xl shadow-ios border border-white/80 dark:border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF6B8B]" />
                  <span>DALL-E 3 高清画卷生图</span>
                </h4>
                <span className="text-[10px] text-zinc-400">1024×1024 / 超高清渲染</span>
              </div>

              <textarea
                rows={3}
                placeholder="描述你想要的画面，例如：一只戴着苹果耳机的毛茸茸小猫咪坐在桌前写代码，窗外是阳光，柔和的3D皮克斯动画风格..."
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                className="w-full p-3 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none leading-relaxed"
              />

              {/* Style & Size Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <select
                    value={imageSize}
                    onChange={e => setImageSize(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-none outline-none font-medium"
                  >
                    <option value="1024x1024">方图 1024×1024 (1:1)</option>
                    <option value="1024x1792">竖屏 1024×1792 (9:16)</option>
                    <option value="1792x1024">横屏 1792×1024 (16:9)</option>
                  </select>

                  <select
                    value={imageStyle}
                    onChange={e => setImageStyle(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-none outline-none font-medium"
                  >
                    <option value="vivid">生动艺术 (Vivid)</option>
                    <option value="natural">自然写实 (Natural)</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImg || !imagePrompt.trim()}
                  className={`px-5 py-2 rounded-2xl text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 transition ${
                    isGeneratingImg || !imagePrompt.trim()
                      ? 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#FF6B8B] to-[#FA5276] hover:opacity-90 active:scale-95'
                  }`}
                >
                  {isGeneratingImg ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在绘制灵感...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>开始生图</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Gallery */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                生成画廊 ({images.length})
              </h5>

              {images.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800 mx-auto flex items-center justify-center text-2xl">
                    🖼️
                  </div>
                  <p className="text-xs text-zinc-500">画廊暂时还是空白，快用灵感生成你的第一张大作吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {images.map(img => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImgLightbox(img)}
                      className="group relative rounded-2xl overflow-hidden shadow-ios cursor-pointer bg-zinc-100 dark:bg-zinc-800 aspect-square"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white text-xs">
                        <p className="line-clamp-2 text-[11px] leading-tight">{img.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lightbox Modal */}
            {selectedImgLightbox && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-zinc-900 rounded-3xl overflow-hidden p-4 space-y-3 animate-scale-in">
                  <div className="flex items-center justify-between text-white text-xs">
                    <span className="font-semibold">大图预览</span>
                    <button
                      onClick={() => setSelectedImgLightbox(null)}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="w-full max-h-[60vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
                    <img
                      src={selectedImgLightbox.imageUrl}
                      alt={selectedImgLightbox.prompt}
                      className="max-h-[60vh] object-contain"
                    />
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed max-h-20 overflow-y-auto">
                    {selectedImgLightbox.prompt}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        setImagePrompt(selectedImgLightbox.prompt);
                        setSelectedImgLightbox(null);
                        sound.playTap();
                      }}
                      className="text-xs text-[#FF6B8B] hover:underline font-semibold"
                    >
                      复用此提示词
                    </button>

                    <a
                      href={selectedImgLightbox.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>查看/下载原图</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 3: SKILLS HUB (技能插件中心)                       */}
        {/* ========================================================= */}
        {subTab === 'skills' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                  <span>技能插件市场 ({skills.length})</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold flex items-center space-x-0.5">
                    <GithubIcon className="w-2.5 h-2.5 mr-0.5" />
                    <span>GitHub 真实开源</span>
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-500">
                  真实 GitHub 权威开源专家技能与系统提示词库
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    setShowGitHubMarketModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-semibold shadow-xs hover:opacity-90 flex items-center space-x-1"
                  title="探索并一键安装真实 GitHub 开源热门技能"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  <span>GitHub 集市</span>
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    setShowNewSkillModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-[#07C160] text-white rounded-xl text-xs font-semibold shadow-xs hover:opacity-90 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skills.map(skill => (
                <div
                  key={skill.id}
                  className="glass-card p-3.5 rounded-2xl shadow-ios border border-white/80 dark:border-zinc-800/80 space-y-2 relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0">
                        {skill.icon}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {skill.name}
                        </h5>
                        <div className="flex items-center space-x-1 mt-0.5">
                          {skill.tags.map(t => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {!skill.isBuiltin && (
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-1 text-zinc-400 hover:text-red-500"
                        title="删除自定义技能"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* GitHub Repo Pill Badge */}
                  {skill.repo && (
                    <div className="flex items-center space-x-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-100/90 dark:bg-zinc-800/90 px-2 py-0.5 rounded-lg w-fit border border-zinc-200/50 dark:border-zinc-700/50">
                      <GithubIcon className="w-3 h-3 text-zinc-700 dark:text-zinc-300 shrink-0" />
                      <a
                        href={skill.repoUrl || `https://github.com/${skill.repo}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="font-medium hover:underline text-blue-600 dark:text-blue-400 truncate max-w-[150px]"
                        title="点击在 GitHub 查看真实开源仓库"
                      >
                        {skill.repo}
                      </a>
                      {skill.stars && (
                        <span className="flex items-center space-x-0.5 text-amber-600 dark:text-amber-400 font-bold ml-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 mr-0.5" />
                          <span>{skill.stars}</span>
                        </span>
                      )}
                      {skill.license && (
                        <span className="text-zinc-400 text-[9px] border-l border-zinc-300 dark:border-zinc-700 pl-1.5">
                          {skill.license}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {skill.description}
                  </p>

                  <div className="pt-1 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-zinc-400">
                        {skill.isBuiltin ? '内置开源技能' : '用户导入'}
                      </span>
                      {skill.repoUrl && (
                        <a
                          href={skill.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline flex items-center space-x-0.5"
                          title="在浏览器中打开 GitHub 仓库"
                        >
                          <ExternalLink className="w-2.5 h-2.5 mr-0.5" />
                          <span>GitHub 源码</span>
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        handleSelectSkillForSession(skill.id);
                        setSubTab('chat');
                      }}
                      className="text-xs text-[#07C160] font-semibold hover:underline"
                    >
                      应用至对话 →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* New Skill Modal */}
            {showNewSkillModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      创建自定义 Skill 技能插件
                    </h4>
                    <button onClick={() => setShowNewSkillModal(false)} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateSkill} className="space-y-2.5">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1">
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">图标</label>
                        <input
                          type="text"
                          required
                          value={newSkillIcon}
                          onChange={e => setNewSkillIcon(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-center text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">技能名称 *</label>
                        <input
                          type="text"
                          required
                          placeholder="例如: 财务分析顾问"
                          value={newSkillName}
                          onChange={e => setNewSkillName(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">简短说明</label>
                      <input
                        type="text"
                        placeholder="描述该技能的使用场景..."
                        value={newSkillDesc}
                        onChange={e => setNewSkillDesc(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">系统提示词 (System Prompt) *</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="你是一位经验丰富的专业人士，请遵循以下准则回应..."
                        value={newSkillPrompt}
                        onChange={e => setNewSkillPrompt(e.target.value)}
                        className="w-full mt-1 p-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 leading-relaxed resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">标签分类 (逗号分隔)</label>
                      <input
                        type="text"
                        placeholder="效率, 商业, 助手"
                        value={newSkillTags}
                        onChange={e => setNewSkillTags(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                      />
                    </div>

                    <div className="pt-2 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowNewSkillModal(false)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#07C160] text-white shadow-sm"
                      >
                        创建技能
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* GitHub Market Explorer Modal */}
            {showGitHubMarketModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3 max-h-[85vh] flex flex-col">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
                        <GithubIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          GitHub 真实开源技能集市
                        </h4>
                        <p className="text-[10px] text-zinc-400">
                          收录 f/awesome-chatgpt-prompts、Fabric 等权威高星技能
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowGitHubMarketModal(false)}
                      className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* URL Live Fetcher Box */}
                  <form
                    onSubmit={handleFetchFromGitHubUrl}
                    className="shrink-0 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-1.5"
                  >
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1">
                      <Globe className="w-3 h-3 text-blue-500" />
                      <span>从任意 GitHub URL 或 Raw Markdown 导入</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        placeholder="例如: https://github.com/f/awesome-chatgpt-prompts 或 raw URL"
                        value={gitHubUrlInput}
                        onChange={e => setGitHubUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!gitHubUrlInput.trim() || isFetchingGitHub}
                        className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 shrink-0"
                      >
                        {isFetchingGitHub ? '解析中...' : '拉取导入'}
                      </button>
                    </div>
                  </form>

                  {/* Curated Hot Skills List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      <span>GitHub 精选高星开源技能 ({GITHUB_HOT_SKILLS_CATALOG.length})</span>
                      <span className="text-[10px] text-zinc-400">100% 真实源码来源</span>
                    </div>

                    {GITHUB_HOT_SKILLS_CATALOG.map(ghSkill => {
                      const isInstalled = skills.some(
                        s => s.id === ghSkill.id || (s.name === ghSkill.name && s.repo === ghSkill.repo)
                      );
                      return (
                        <div
                          key={ghSkill.id}
                          className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-2 transition hover:border-zinc-300"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="text-2xl p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0">
                                {ghSkill.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {ghSkill.name}
                                  </h5>
                                </div>
                                <div className="flex items-center space-x-1.5 mt-0.5">
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate max-w-[130px]">
                                    {ghSkill.repo}
                                  </span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center">
                                    <Star className="w-2.5 h-2.5 fill-amber-500 mr-0.5" />
                                    {ghSkill.stars}
                                  </span>
                                  <span className="text-[9px] text-zinc-400">
                                    {ghSkill.license}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleInstallGitHubSkill(ghSkill)}
                              disabled={isInstalled}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
                                isInstalled
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                                  : 'bg-[#07C160] text-white hover:opacity-90 shadow-xs'
                              }`}
                            >
                              {isInstalled ? (
                                <>
                                  <Check className="w-3 h-3 text-[#07C160]" />
                                  <span>已安装</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>一键安装</span>
                                </>
                              )}
                            </button>
                          </div>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {ghSkill.description}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px]">
                            <div className="flex items-center space-x-1">
                              {ghSkill.tags.map(t => (
                                <span key={t} className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <a
                              href={ghSkill.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-500 hover:underline flex items-center"
                            >
                              <ExternalLink className="w-2.5 h-2.5 mr-0.5" />
                              <span>查看 GitHub 原仓</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 4: MODEL PROVIDERS (大模型自定义兼容接口控制台)     */}
        {/* ========================================================= */}
        {subTab === 'providers' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* Header Description */}
            <div className="bg-white/80 dark:bg-zinc-800/80 p-3.5 rounded-2xl shadow-ios space-y-1 border border-white/60 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span>自定义兼容大模型接口 (Custom Endpoint)</span>
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  OpenAI 协议兼容
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                支持任意 OpenAI 格式的兼容端点。可一键拉取远端全部可用模型，无需繁杂厂商预设，统一极简管理。
              </p>
            </div>

            {/* Quick Test Switcher for user's test models */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-zinc-500 px-1 flex items-center justify-between">
                <span>快速载入测试端点：</span>
                <span className="text-[10px] text-zinc-400 font-normal">点击自动填入配置</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLoadPreset(DEFAULT_CUSTOM_PROVIDER)}
                  className={`p-2.5 rounded-2xl border text-xs font-medium text-left transition flex items-center justify-between ${
                    currentCustomProvider.baseUrl.includes('sensenova.cn')
                      ? 'border-[#07C160] bg-green-50/80 dark:bg-green-950/30 text-green-800 dark:text-green-300 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-800/60 hover:border-zinc-300'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="font-bold truncate text-[11px]">商汤日日新 (SenseNova)</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">deepseek-v4-flash</div>
                  </div>
                  {currentCustomProvider.baseUrl.includes('sensenova.cn') && (
                    <Check className="w-4 h-4 text-[#07C160] shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLoadPreset(SECOND_CUSTOM_PROVIDER)}
                  className={`p-2.5 rounded-2xl border text-xs font-medium text-left transition flex items-center justify-between ${
                    currentCustomProvider.baseUrl.includes('cloudflare.com')
                      ? 'border-[#07C160] bg-green-50/80 dark:bg-green-950/30 text-green-800 dark:text-green-300 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-800/60 hover:border-zinc-300'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="font-bold truncate text-[11px]">Cloudflare Gemini 代理</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">gemini-3.5-flash-lite</div>
                  </div>
                  {currentCustomProvider.baseUrl.includes('cloudflare.com') && (
                    <Check className="w-4 h-4 text-[#07C160] shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Main Configuration Card */}
            <div className="glass-card p-4 rounded-3xl shadow-ios border border-white/80 dark:border-zinc-800/80 space-y-3.5 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md">
              {/* Field 1: 服务提供商 */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                  服务提供商
                </label>
                <div className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                  <span>自定义兼容接口 (Custom Endpoint)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">/v1/chat/completions</span>
                </div>
              </div>

              {/* Field 2: API 接口地址 (Base URL) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    API 接口地址 (Base URL) *
                  </label>
                  <span className="text-[10px] text-zinc-400">支持 /v1 或兼容网关</span>
                </div>
                <input
                  type="text"
                  required
                  value={activeBaseUrl}
                  onChange={e => setActiveBaseUrl(e.target.value)}
                  placeholder="例如: https://token.sensenova.cn/v1"
                  className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#07C160]/30 transition"
                />
              </div>

              {/* Field 3: API 密钥 (API Key) 带眼睛显隐切换 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    API 密钥 (API Key)
                  </label>
                  <span className="text-[10px] text-zinc-400">本地安全加密存储</span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={activeApiKey}
                    onChange={e => setActiveApiKey(e.target.value)}
                    placeholder="sk-... 或 API Key"
                    className="w-full pl-3 pr-10 py-2 font-mono text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#07C160]/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg transition"
                    title={showApiKey ? '隐藏密钥' : '显示密钥'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 4: 模型名称 (Model Identifier) + 🔄 获取模型按钮 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1.5">
                    <span>模型名称 (Model Identifier) *</span>
                    {availableModelsList.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-normal">
                        已获取 {availableModelsList.length} 个可用模型
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomModelInputMode(!customModelInputMode)}
                    className="text-[11px] text-blue-500 hover:underline font-semibold"
                  >
                    {customModelInputMode ? '从已发现模型选择' : '手动自由输入'}
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {customModelInputMode ? (
                    <input
                      type="text"
                      value={customModelManualName || activeModel}
                      onChange={e => {
                        setCustomModelManualName(e.target.value);
                        setActiveModel(e.target.value);
                      }}
                      placeholder="例如: deepseek-v4-flash 或 gemini-3.5-flash-lite"
                      className="flex-1 px-3 py-2 font-mono text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#07C160]/30"
                    />
                  ) : (
                    <select
                      value={activeModel}
                      onChange={e => setActiveModel(e.target.value)}
                      className="flex-1 px-3 py-2 font-mono text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
                    >
                      {availableModelsList.length === 0 ? (
                        <option value={activeModel}>{activeModel || '请点击右侧「获取模型」'}</option>
                      ) : (
                        availableModelsList.map(m => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))
                      )}
                    </select>
                  )}

                  {/* 🔄 获取模型按钮 */}
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels || !activeBaseUrl.trim()}
                    className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-semibold shrink-0 flex items-center space-x-1.5 transition disabled:opacity-50 active:scale-95 shadow-sm"
                    title="发送请求至 /models 自动获取全部可用模型"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingModels ? 'animate-spin' : ''}`} />
                    <span>{isFetchingModels ? '获取中...' : '获取模型'}</span>
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() =>
                    handleTestLatency({
                      ...currentCustomProvider,
                      baseUrl: activeBaseUrl,
                      apiKey: activeApiKey,
                      defaultModel: activeModel,
                    })
                  }
                  disabled={testingId !== null}
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-500 ${testingId !== null ? 'animate-spin' : ''}`} />
                  <span>{testingId !== null ? '测通中...' : '测通 (Ping)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustomConfig}
                  className="px-5 py-2 bg-[#07C160] hover:bg-[#06ad56] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存并立即生效</span>
                </button>
              </div>
            </div>

            {/* Current Active Status Pill Card */}
            <div className="bg-white/60 dark:bg-zinc-800/60 p-3.5 rounded-2xl shadow-ios border border-white/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#07C160] animate-pulse"></span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">当前对话生效模型</span>
                </div>
                <div className="font-mono text-zinc-500 text-[11px] truncate max-w-xs">
                  {currentCustomProvider.defaultModel}
                </div>
              </div>
              {currentCustomProvider.latency && (
                <div className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-mono font-bold">
                  ⚡ {currentCustomProvider.latency}ms
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
