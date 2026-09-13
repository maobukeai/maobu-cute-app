import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NoteItem } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { streamChatCompletion, formatFriendlyAIError } from '../../utils/ai';
import { buildNoteAIPrompt, NoteAIAction, NOTE_AI_ACTION_META } from '../../utils/notesAI';
import { MarkdownPreview } from '../MarkdownPreview';
import { Button, useToast } from '../ui';
import {
  X,
  Eye,
  Pencil,
  FileDown,
  Copy,
  Check,
  Bold,
  Heading,
  List,
  ListChecks,
  Code,
  Quote,
  Brush,
  PenLine,
  RefreshCw,
  FileText,
  Tag,
  Languages,
  Square,
  Brain,
  ChevronDown,
  AlertCircle,
  Pin,
  Star,
  Plus,
} from 'lucide-react';

const CATEGORIES = ['生活', '工作', '学习', '灵感', '代码', '指南'];

interface NoteEditorProps {
  isOpen: boolean;
  editingNote: NoteItem | null;
  /** Optional draft seed (e.g. from the AI generator) when creating a new note */
  seed?: { title: string; content: string; category: string; tags: string[] } | null;
  onClose: () => void;
  onSave: (draft: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    isPinned: boolean;
    isFavorite: boolean;
  }) => void;
}

interface AIActionState {
  isOpen: boolean;
  action: NoteAIAction | null;
  status: 'idle' | 'reasoning' | 'generating' | 'completed' | 'error';
  reasoning: string;
  isReasoningExpanded: boolean;
  reasoningDurationSeconds?: number;
  output: string;
  errorMessage?: string;
}

const IDLE_AI_STATE: AIActionState = {
  isOpen: false,
  action: null,
  status: 'idle',
  reasoning: '',
  isReasoningExpanded: true,
  output: '',
};

export const NoteEditor: React.FC<NoteEditorProps> = ({ isOpen, editingNote, seed, onClose, onSave }) => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('生活');
  const [tags, setTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  // AI
  const [aiState, setAiState] = useState<AIActionState>(IDLE_AI_STATE);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    if (editingNote) {
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setCategory(editingNote.category);
      setTags(editingNote.tags.join(', '));
      setIsPinned(editingNote.isPinned);
      setIsFavorite(editingNote.isFavorite);
    } else if (seed) {
      setTitle(seed.title);
      setContent(seed.content);
      setCategory(seed.category);
      setTags(seed.tags.join(', '));
      setIsPinned(false);
      setIsFavorite(false);
    } else {
      setTitle('');
      setContent('');
      setCategory('生活');
      setTags('');
      setIsPinned(false);
      setIsFavorite(false);
    }
    setPreviewMode('edit');
    setAiState(IDLE_AI_STATE);
  }, [isOpen, editingNote, seed]);

  if (!isOpen) return null;

  const activeProvider = db.getAIProviders().find(p => p.isActive) || db.getAIProviders()[0];
  const isAIRunning = aiState.status === 'reasoning' || aiState.status === 'generating';

  /** Insert markdown snippet around the current selection. */
  const insertMarkdown = (prefix: string, suffix = '') => {
    sound.playTap();
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      setContent(prev => prev + prefix + suffix);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + (selected || '文本') + suffix;
    setContent(content.substring(0, start) + replacement + content.substring(end));
  };

  const handleToggleTodoInPreview = (lineIndex: number) => {
    const lines = content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const targetLine = lines[lineIndex];
    if (/^[-*]\s+\[ \]\s+/.test(targetLine)) {
      lines[lineIndex] = targetLine.replace(/^([-*]\s+)\[ \]/, '$1[x]');
      sound.playSuccess();
    } else if (/^[-*]\s+\[[xX]\]\s+/.test(targetLine)) {
      lines[lineIndex] = targetLine.replace(/^([-*]\s+)\[[xX]\]/, '$1[ ]');
      sound.playTap();
    }
    setContent(lines.join('\n'));
  };

  const stopAI = () => {
    abortRef.current?.abort();
    setAiState(prev => ({ ...prev, status: prev.output ? 'completed' : 'idle' }));
    sound.playTap();
  };

  const runAIAction = async (action: NoteAIAction) => {
    if (!content.trim()) {
      toast.info('先写一段正文，AI 才能帮你续写、润色或提炼');
      return;
    }
    if (!activeProvider?.apiKey) {
      toast.warn('未检测到大模型配置，请先在「AI 伴侣 → 模型配置」中配置');
      return;
    }
    sound.playTap();
    setAiState({ isOpen: true, action, status: 'reasoning', reasoning: '', isReasoningExpanded: true, output: '' });

    abortRef.current = new AbortController();
    const startTime = Date.now();
    let hasOutputStarted = false;
    const { systemPrompt, userPrompt } = buildNoteAIPrompt(action, title, content);

    // Coalesce streaming deltas into one state commit per animation frame.
    const streamBuf = { reasoning: '', output: '' };
    let rafId = 0;
    const applyBuffer = () => {
      rafId = 0;
      const reasoning = streamBuf.reasoning;
      const output = streamBuf.output;
      if (!reasoning && !output) return;
      streamBuf.reasoning = '';
      streamBuf.output = '';
      const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      setAiState(prev => ({
        ...prev,
        status: output ? 'generating' : 'reasoning',
        reasoning: reasoning ? prev.reasoning + reasoning : prev.reasoning,
        output: output ? prev.output + output : prev.output,
        reasoningDurationSeconds:
          prev.reasoning && !prev.reasoningDurationSeconds ? duration : prev.reasoningDurationSeconds,
        isReasoningExpanded: output ? false : prev.isReasoningExpanded,
      }));
    };
    const scheduleFlush = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(applyBuffer);
    };
    const flushBufferNow = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      applyBuffer();
    };

    if (!activeProvider?.apiKey?.trim() && !activeProvider?.baseUrl.includes('localhost')) {
      toast.warn('请先在「AI 助手 -> 模型配置」中配置 API Key');
      setAiState(prev => ({ ...prev, status: 'idle' }));
      return;
    }
    if (!activeProvider?.defaultModel?.trim()) {
      toast.warn('未配置大模型，请前往「AI 助手 -> 模型配置」获取或输入你的模型名称');
      setAiState(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    try {
      await streamChatCompletion({
        provider: activeProvider,
        model: activeProvider.defaultModel,
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        signal: abortRef.current.signal,
        onReasoningChunk: delta => {
          streamBuf.reasoning += delta;
          scheduleFlush();
        },
        onChunk: delta => {
          if (!hasOutputStarted) {
            hasOutputStarted = true;
          }
          streamBuf.output += delta;
          scheduleFlush();
        },
      });
      flushBufferNow();
      setAiState(prev => ({ ...prev, status: 'completed' }));
      sound.playSuccess();
    } catch (err: any) {
      flushBufferNow();
      if (abortRef.current?.signal.aborted) {
        setAiState(prev => ({ ...prev, status: 'idle' }));
        return;
      }
      setAiState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: formatFriendlyAIError(err.message || String(err)),
      }));
    }
  };

  /** Apply the finished AI output depending on the action type. */
  const applyAIOutput = (mode: 'replace' | 'append' | 'appendSummary' | 'fillTags') => {
    if (!aiState.output) return;
    sound.playSuccess();
    if (mode === 'replace') {
      setContent(aiState.output);
    } else if (mode === 'append') {
      setContent(prev => prev.trim() + '\n\n' + aiState.output);
    } else if (mode === 'appendSummary') {
      setContent(prev => prev.trim() + '\n\n---\n### 核心要点\n' + aiState.output);
    } else {
      const cleanTags = aiState.output.replace(/[#]/g, '').trim();
      setTags(prev => (prev ? `${prev}, ${cleanTags}` : cleanTags));
    }
    setAiState(IDLE_AI_STATE);
  };

  const handleExport = () => {
    sound.playTap();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(title || '未命名笔记').replace(/[\\/:*?"<>|]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.info('给笔记起个标题吧');
      return;
    }
    onSave({
      title: title.trim(),
      content,
      category,
      tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      isPinned,
      isFavorite,
    });
  };

  const toolBtn = 'p-1.5 rounded-lg hover:bg-surface-2 text-ink-2 hover:text-ink transition tactile-press shrink-0';

  return (
    <AnimatePresence>
      <motion.div
        key="note-editor"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="fixed inset-0 z-[90] bg-canvas flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Header */}
        <div className="h-[52px] px-3 py-2.5 border-b border-line flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-3 hover:bg-surface-2 tactile-press"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sub font-semibold text-ink truncate">
              {editingNote ? '编辑笔记' : '新笔记'}
            </span>
            <span className="text-caption text-ink-3 whitespace-nowrap">{content.length} 字</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-surface-2 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('edit')}
                className={`px-2.5 py-1 rounded-full text-caption font-semibold transition flex items-center gap-1 ${
                  previewMode === 'edit' ? 'bg-surface text-ink shadow-elev-1' : 'text-ink-3'
                }`}
              >
                <Pencil className="w-3 h-3" />
                <span>编辑</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('preview')}
                className={`px-2.5 py-1 rounded-full text-caption font-semibold transition flex items-center gap-1 ${
                  previewMode === 'preview' ? 'bg-surface text-ink shadow-elev-1' : 'text-ink-3'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>预览</span>
              </button>
            </div>
            {editingNote && (
              <button type="button" onClick={handleExport} className={toolBtn} title="导出 Markdown">
                <FileDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Title + meta */}
          <div className="px-4 pt-3 pb-2.5 space-y-2 border-b border-line shrink-0 bg-surface">
            <input
              type="text"
              required
              placeholder="笔记标题…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-title font-bold text-ink bg-transparent border-none outline-none placeholder:text-ink-3"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-full bg-surface-2 text-caption text-ink-2 border-none outline-none font-medium"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="flex-1 min-w-[140px] flex items-center px-3 py-1.5 bg-surface-2 rounded-full">
                <Tag className="w-3 h-3 text-ink-3 mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="标签，逗号分隔"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-caption text-ink placeholder:text-ink-3"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIsPinned(v => !v);
                }}
                className={`px-2.5 py-1.5 rounded-full text-caption font-semibold flex items-center gap-1 transition tactile-press ${
                  isPinned ? 'bg-warn/10 text-warn' : 'bg-surface-2 text-ink-3'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>置顶</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIsFavorite(v => !v);
                }}
                className={`px-2.5 py-1.5 rounded-full text-caption font-semibold flex items-center gap-1 transition tactile-press ${
                  isFavorite ? 'bg-warn/10 text-warn' : 'bg-surface-2 text-ink-3'
                }`}
              >
                <Star className={`w-3 h-3 ${isFavorite ? 'fill-warn' : ''}`} />
                <span>收藏</span>
              </button>
            </div>
          </div>

          {/* Markdown + AI toolbar */}
          {previewMode === 'edit' && (
            <div className="px-2 py-1.5 bg-surface border-b border-line flex items-center gap-0.5 shrink-0 overflow-x-auto no-scrollbar">
              <button type="button" onClick={() => insertMarkdown('**', '**')} className={toolBtn} title="粗体">
                <Bold className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => insertMarkdown('### ')} className={toolBtn} title="标题">
                <Heading className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => insertMarkdown('- ')} className={toolBtn} title="列表">
                <List className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => insertMarkdown('- [ ] ')} className={toolBtn} title="待办">
                <ListChecks className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => insertMarkdown('`', '`')} className={toolBtn} title="行内代码">
                <Code className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => insertMarkdown('> ')} className={toolBtn} title="引用">
                <Quote className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-line mx-1 shrink-0" />

              {(['continue', 'polish', 'summary', 'tags', 'translate'] as NoteAIAction[]).map(action => {
                const meta = NOTE_AI_ACTION_META[action];
                const runningThis = isAIRunning && aiState.action === action;
                const Icon =
                  action === 'summary' ? FileText : action === 'tags' ? Tag : action === 'translate' ? Languages : action === 'polish' ? Brush : PenLine;
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => runAIAction(action)}
                    disabled={isAIRunning}
                    className="px-2.5 py-1 rounded-full text-caption bg-accent/[0.08] text-accent font-semibold flex items-center gap-1 shrink-0 transition disabled:opacity-40 tactile-press"
                  >
                    {runningThis ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* AI live action dock */}
          <AnimatePresence>
            {aiState.isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="shrink-0 overflow-hidden"
              >
                <div className="mx-3 my-2 p-3 rounded-2xl border border-accent/20 bg-accent/[0.04] space-y-2.5">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-xl bg-accent text-white shrink-0">
                        <PenLine className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-caption font-bold text-ink truncate">
                          {aiState.action ? NOTE_AI_ACTION_META[aiState.action].label : 'AI 助手'}
                        </div>
                        <div className="text-[11px] mt-0.5">
                          {aiState.status === 'reasoning' && (
                            <span className="text-warn font-medium flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              <span>思考推导中…</span>
                            </span>
                          )}
                          {aiState.status === 'generating' && (
                            <span className="text-accent font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                              <span>输出中（{aiState.output.length} 字）</span>
                            </span>
                          )}
                          {aiState.status === 'completed' && (
                            <span className="text-ok font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>完成，共 {aiState.output.length} 字</span>
                            </span>
                          )}
                          {aiState.status === 'error' && (
                            <span className="text-danger font-medium">生成异常</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAIRunning ? (
                      <Button type="button" variant="danger" size="sm" onClick={stopAI}>
                        <Square className="w-3 h-3 fill-current" />
                        <span>停止</span>
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAiState(IDLE_AI_STATE)}
                        className="p-1 text-ink-3 rounded-lg hover:bg-surface-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Reasoning */}
                  {aiState.reasoning && (
                    <div className="rounded-xl border border-line bg-surface overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setAiState(prev => ({ ...prev, isReasoningExpanded: !prev.isReasoningExpanded }))}
                        className="w-full px-2.5 py-1.5 flex items-center justify-between text-left"
                      >
                        <span className="flex items-center gap-1.5 text-caption text-ink-2 font-medium">
                          <Brain className="w-3 h-3 text-accent" />
                          <span>思维推导{aiState.reasoningDurationSeconds ? `（${aiState.reasoningDurationSeconds}s）` : '中…'}</span>
                        </span>
                        <ChevronDown
                          className={`w-3 h-3 text-ink-3 transition-transform ${
                            aiState.isReasoningExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {aiState.isReasoningExpanded && (
                        <div className="px-2.5 pb-2 pt-1 border-t border-line font-mono text-[11px] leading-relaxed text-ink-3 max-h-32 overflow-y-auto whitespace-pre-wrap select-text">
                          {aiState.reasoning}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Output / error */}
                  {aiState.output ? (
                    <div className="p-3 rounded-xl bg-surface border border-line max-h-44 overflow-y-auto text-caption leading-relaxed text-ink select-text whitespace-pre-wrap">
                      {aiState.output}
                      {aiState.status === 'generating' && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-accent animate-pulse align-middle" />
                      )}
                    </div>
                  ) : aiState.status === 'error' ? (
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-caption text-danger leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{aiState.errorMessage || '生成遇到异常，请检查模型与网络'}</p>
                    </div>
                  ) : null}

                  {/* Completed actions */}
                  {aiState.status === 'completed' && aiState.output && (
                    <div className="pt-1 flex items-center justify-between flex-wrap gap-2 border-t border-line">
                      <div className="flex items-center gap-2 flex-wrap">
                        {aiState.action === 'polish' && (
                          <>
                            <Button type="button" variant="primary" size="sm" onClick={() => applyAIOutput('replace')}>
                              替换原文
                            </Button>
                            <Button type="button" variant="neutral" size="sm" onClick={() => applyAIOutput('append')}>
                              追加到文末
                            </Button>
                          </>
                        )}
                        {aiState.action === 'continue' && (
                          <Button type="button" variant="primary" size="sm" onClick={() => applyAIOutput('append')}>
                            <Plus className="w-3 h-3" />
                            追加到文末
                          </Button>
                        )}
                        {aiState.action === 'summary' && (
                          <Button type="button" variant="primary" size="sm" onClick={() => applyAIOutput('appendSummary')}>
                            插入核心要点
                          </Button>
                        )}
                        {aiState.action === 'tags' && (
                          <Button type="button" variant="primary" size="sm" onClick={() => applyAIOutput('fillTags')}>
                            填入标签栏
                          </Button>
                        )}
                        {aiState.action === 'translate' && (
                          <>
                            <Button type="button" variant="primary" size="sm" onClick={() => applyAIOutput('replace')}>
                              替换为译文
                            </Button>
                            <Button type="button" variant="neutral" size="sm" onClick={() => applyAIOutput('append')}>
                              追加译文
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          mute
                          onClick={() => {
                            navigator.clipboard.writeText(aiState.output);
                            sound.playTap();
                            setCopiedOutput(true);
                            setTimeout(() => setCopiedOutput(false), 2000);
                          }}
                        >
                          {copiedOutput ? <Check className="w-3 h-3 text-ok" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedOutput ? '已复制' : '复制'}</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => setAiState(IDLE_AI_STATE)}
                          className="text-caption text-ink-3 hover:text-ink px-2 py-1 transition"
                        >
                          放弃
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {previewMode === 'edit' ? (
              <textarea
                id="note-textarea"
                placeholder="在此撰写你的笔记与 Markdown 内容…"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none resize-none text-body text-ink placeholder:text-ink-3 leading-relaxed"
              />
            ) : (
              <div className="max-w-none select-text">
                <MarkdownPreview content={content} onToggleTodo={handleToggleTodoInPreview} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="h-14 px-4 border-t border-line flex items-center justify-end gap-2.5 shrink-0 bg-surface">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary" size="md" className="min-w-[104px]">
              保存
            </Button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};
