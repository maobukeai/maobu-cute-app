import React, { useState } from 'react';
import { BottomSheet } from '../common/BottomSheet';
import { Button, useToast } from '../ui';
import { generateAINote, GeneratedNoteOutput } from '../../utils/ai';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { MarkdownPreview } from '../MarkdownPreview';
import { Cpu, ExternalLink, PenLine, RefreshCw, Brain, Check, Pencil, ChevronDown } from 'lucide-react';

interface AINoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (result: GeneratedNoteOutput) => void;
  onOpenInEditor: (result: GeneratedNoteOutput) => void;
  onGoToAISettings: () => void;
}

const STYLES = [
  { id: 'guide', label: '结构化干货', desc: '条理分明 · 深度指南' },
  { id: 'essay', label: '灵感随笔', desc: '温润细腻 · 思维沉淀' },
  { id: 'xhs', label: '爆款小红书', desc: '吸睛钩子 · 生动排版' },
  { id: 'summary', label: '复盘与要点', desc: '核心精炼 · 行动导向' },
] as const;

const QUICK_TOPICS = [
  '猫咪新手科学养护全景指南',
  'React 19 核心架构实战演进',
  '爆款文案架构与吸睛公式',
  '《纳瓦尔宝典》心智模型',
  '极简治愈生活随笔',
];

export const AINoteSheet: React.FC<AINoteSheetProps> = ({
  isOpen,
  onClose,
  onAdopt,
  onOpenInEditor,
  onGoToAISettings,
}) => {
  const toast = useToast();
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<'guide' | 'essay' | 'xhs' | 'summary'>('guide');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedNoteOutput | null>(null);
  const [liveReasoning, setLiveReasoning] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [showReasoning, setShowReasoning] = useState(false);

  const activeProvider = db.getAIProviders().find(p => p.isActive) || db.getAIProviders()[0];
  const availableModels = activeProvider?.availableModels || [];
  const [selectedModel, setSelectedModel] = useState(activeProvider?.defaultModel || '');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedModel(activeProvider?.defaultModel || (availableModels[0] || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeProvider?.defaultModel]);

  const reset = () => {
    setTopic('');
    setResult(null);
    setLiveReasoning('');
    setShowReasoning(false);
  };

  const run = async (quickTopic?: string) => {
    const text = quickTopic || topic;
    if (!text.trim()) {
      toast.info('先输入你想记录的笔记主题或构思');
      return;
    }
    if (quickTopic) setTopic(quickTopic);

    if (!activeProvider?.apiKey?.trim() && !activeProvider?.baseUrl.includes('localhost')) {
      toast.warn('请先在「AI 助手 -> 模型配置」中配置 API Key');
      onClose();
      onGoToAISettings();
      return;
    }
    if (!selectedModel?.trim()) {
      toast.warn('未配置大模型，请前往「AI 助手 -> 模型配置」获取或输入你的模型名称');
      onClose();
      onGoToAISettings();
      return;
    }

    setIsGenerating(true);
    setLiveReasoning('');
    setResult(null);
    setShowReasoning(false);
    setElapsed(0);
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);

    // Coalesce reasoning deltas into one state commit per animation frame.
    let reasoningBuf = '';
    let rafId = 0;
    const flushBuffer = () => {
      rafId = 0;
      if (!reasoningBuf) return;
      const delta = reasoningBuf;
      reasoningBuf = '';
      setLiveReasoning(prev => prev + delta);
    };
    const scheduleFlush = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        flushBuffer();
      });
    };

    try {
      const res = await generateAINote({
        topic: text,
        style,
        provider: activeProvider,
        model: selectedModel,
        onReasoningChunk: delta => {
          reasoningBuf += delta;
          scheduleFlush();
        },
      });
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      flushBuffer();
      setResult(res);
      sound.playSuccess();
    } catch (err: any) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      flushBuffer();
      toast.error(err.message || '大模型生成笔记失败，请检查 API 配置');
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        onClose();
        reset();
      }}
      title="灵感成文"
      subtitle="输入主题，AI 生成优美的 Markdown 笔记"
    >
      <div className="space-y-4 pb-2">
        {/* Model bar */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-2/70 text-caption">
          <div className="flex items-center gap-1.5 min-w-0">
            <Cpu className="w-4 h-4 text-accent shrink-0" />
            <span className="text-ink-2 font-medium shrink-0">模型</span>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="bg-transparent font-semibold text-accent outline-none cursor-pointer truncate max-w-[180px]"
            >
              {availableModels.length === 0 ? (
                <option value="">未配置模型 (请前往配置)</option>
              ) : (
                availableModels.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
          </div>
          {activeProvider?.apiKey?.trim() ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-ok/10 text-ok font-semibold shrink-0">
              API 已就绪
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToAISettings();
              }}
              className="text-warn hover:underline flex items-center gap-0.5 font-medium shrink-0"
            >
              <span>未配置密钥，去配置</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Topic */}
        <div>
          <label className="block text-caption font-semibold text-ink-2 mb-1.5">笔记主题或灵感构思</label>
          <textarea
            rows={3}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="例如：猫咪新手科学养护指南、React 19 架构演进…"
            className="w-full px-3.5 py-2.5 text-sub rounded-2xl bg-surface-2 border-none outline-none focus:ring-2 ring-accent/40 text-ink placeholder:text-ink-3 transition leading-relaxed resize-none"
          />
        </div>

        {/* Style */}
        <div>
          <label className="block text-caption font-semibold text-ink-2 mb-1.5">创作风格</label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`p-2.5 rounded-xl text-left border transition tactile-press ${
                  style === s.id
                    ? 'border-accent bg-accent/[0.06]'
                    : 'border-line hover:bg-surface-2/60'
                }`}
              >
                <div className={`text-caption font-bold ${style === s.id ? 'text-accent' : 'text-ink'}`}>
                  {s.label}
                </div>
                <div className="text-[11px] text-ink-3 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick topics */}
        <div>
          <p className="text-caption text-ink-3 font-medium mb-1.5">热门灵感</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOPICS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => run(chip)}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-full bg-accent/[0.08] text-accent hover:bg-accent/15 text-caption font-medium transition text-left disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Run */}
        {!result && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => run()}
            disabled={isGenerating || !topic.trim()}
            haptic="medium"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>创作中… ({elapsed}s)</span>
              </>
            ) : (
              <>
                <PenLine className="w-4 h-4" />
                <span>开始创作</span>
              </>
            )}
          </Button>
        )}

        {/* Live reasoning */}
        {isGenerating && liveReasoning && (
          <div className="p-3 rounded-2xl bg-accent/[0.05] border border-accent/15 space-y-1.5">
            <div className="flex items-center justify-between text-caption font-bold text-accent">
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                <span>模型思考中（{liveReasoning.length} 字）…</span>
              </div>
              <span className="font-mono text-[11px]">{elapsed}s</span>
            </div>
            <div className="max-h-28 overflow-y-auto text-[11px] font-mono leading-relaxed text-ink-2 bg-surface p-2.5 rounded-xl whitespace-pre-wrap select-text">
              {liveReasoning}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-bold text-sub text-ink">{result.title}</span>
                <span className="text-[11px] font-mono text-ink-3 bg-surface-2 px-1.5 py-0.5 rounded-md">
                  {result.modelUsed} · {result.durationSeconds}s
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                  {result.category}
                </span>
                {Array.from(new Set(result.tags)).map((t, idx) => (
                  <span key={`${t}-${idx}`} className="text-[11px] text-ink-3">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {result.reasoningContent && (
              <div className="rounded-xl border border-line bg-surface-2/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowReasoning(prev => !prev)}
                  className="w-full px-2.5 py-1.5 flex items-center justify-between text-left"
                >
                  <span className="flex items-center gap-1.5 text-caption text-ink-2 font-medium">
                    <Brain className="w-3 h-3 text-accent" />
                    <span>完整思维推导（{result.reasoningContent.length} 字）</span>
                  </span>
                  <ChevronDown className={`w-3 h-3 text-ink-3 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
                </button>
                {showReasoning && (
                  <div className="p-2.5 border-t border-line font-mono text-[11px] leading-relaxed text-ink-3 max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                    {result.reasoningContent}
                  </div>
                )}
              </div>
            )}

            <div className="max-h-56 overflow-y-auto p-3 rounded-xl bg-surface-2/60 border border-line text-caption leading-relaxed select-text">
              <MarkdownPreview content={result.content} />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button variant="neutral" size="md" onClick={() => onOpenInEditor(result)}>
                <Pencil className="w-4 h-4" />
                <span>编辑润色</span>
              </Button>
              <Button variant="primary" size="md" haptic="medium" onClick={() => onAdopt(result)}>
                <Check className="w-4 h-4" />
                <span>存入笔记</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
