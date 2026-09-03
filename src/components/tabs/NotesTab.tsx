import React, { useState } from 'react';
import { NoteItem, AccentColor } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import {
  Search,
  Plus,
  Pin,
  Star,
  Tag,
  Calendar,
  Trash2,
  Edit3,
  X,
  Eye,
  FileDown,
  Copy,
  Check,
  Bold,
  Heading,
  List,
  Code,
  Quote,
  Sparkles,
  RefreshCw,
  Wand2,
  FileText,
  Brain,
  ChevronDown,
  ChevronUp,
  Square,
  AlertCircle,
  Bot,
  ExternalLink,
  Languages,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  generateAINote,
  GeneratedNoteOutput,
  streamChatCompletion,
  formatFriendlyAIError,
} from '../../utils/ai';

interface NotesTabProps {
  notes: NoteItem[];
  onUpdateNotes: (newNotes: NoteItem[]) => void;
  accentColor: AccentColor;
  onSwitchToAITab?: () => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  onUpdateNotes,
  accentColor,
  onSwitchToAITab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Editor Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('生活');
  const [formTags, setFormTags] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Model & Real AI State
  const activeProvider = db.getAIProviders().find(p => p.isActive) || db.getAIProviders()[0];
  const availableModels = activeProvider?.availableModels?.length
    ? activeProvider.availableModels
    : ['deepseek-v4-flash', 'glm-5.2', 'kimi-k3'];
  const [selectedNoteModel, setSelectedNoteModel] = useState<string>('deepseek-v4-flash');
  const [liveReasoning, setLiveReasoning] = useState('');
  const [showReasoningView, setShowReasoningView] = useState(false);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const [aiNoteError, setAiNoteError] = useState<string | null>(null);

  // AI Note Generator State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopicInput, setAiTopicInput] = useState('');
  const [aiNoteStyle, setAiNoteStyle] = useState<'guide' | 'essay' | 'xhs' | 'summary'>('guide');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiNoteResult, setAiNoteResult] = useState<GeneratedNoteOutput | null>(null);
  const [isToolbarAIPolishing, setIsToolbarAIPolishing] = useState(false);

  // AI Live Action Dock State
  const [aiActionState, setAiActionState] = useState<{
    isOpen: boolean;
    action: 'continue' | 'polish' | 'summary' | 'tags' | 'translate' | null;
    status: 'idle' | 'reasoning' | 'generating' | 'completed' | 'error';
    reasoning: string;
    isReasoningExpanded: boolean;
    reasoningDurationSeconds?: number;
    output: string;
    errorMessage?: string;
  }>({
    isOpen: false,
    action: null,
    status: 'idle',
    reasoning: '',
    isReasoningExpanded: true,
    output: '',
  });
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [copiedActionText, setCopiedActionText] = useState(false);

  // Open AI Note modal
  const handleOpenAINoteModal = () => {
    sound.playTap();
    setAiTopicInput('');
    setAiNoteResult(null);
    setLiveReasoning('');
    setAiNoteError(null);
    setShowReasoningView(false);
    if (activeProvider?.defaultModel) {
      setSelectedNoteModel(activeProvider.defaultModel);
    }
    setShowAIModal(true);
  };

  // Run AI Note generation with Real LLM API & Thinking
  const handleRunAINote = async (quickTopic?: string, customStyle?: 'guide' | 'essay' | 'xhs' | 'summary') => {
    const topicToUse = quickTopic || aiTopicInput;
    if (!topicToUse.trim()) {
      alert('请输入你想记录的笔记主题或构思');
      return;
    }
    if (quickTopic) setAiTopicInput(quickTopic);
    const styleToUse = customStyle || aiNoteStyle;

    sound.playTap();
    setIsAIGenerating(true);
    setLiveReasoning('');
    setAiNoteError(null);
    setAiNoteResult(null);
    setShowReasoningView(false);
    setLiveElapsedSeconds(0);

    const timerInterval = setInterval(() => {
      setLiveElapsedSeconds(prev => prev + 1);
    }, 1000);

    try {
      const res = await generateAINote({
        topic: topicToUse,
        style: styleToUse,
        provider: activeProvider,
        model: selectedNoteModel,
        onReasoningChunk: reasoningDelta => {
          setLiveReasoning(prev => prev + reasoningDelta);
        },
      });
      setAiNoteResult(res);
      sound.playSuccess();
    } catch (err: any) {
      setAiNoteError(err.message || '大模型生成笔记失败，请检查 API 配置后重试');
      sound.playTap();
    } finally {
      clearInterval(timerInterval);
      setIsAIGenerating(false);
    }
  };

  // One-click Adopt into notes list
  const handleAdoptAINote = () => {
    if (!aiNoteResult) return;
    sound.playSuccess();

    const newNote: NoteItem = {
      id: 'n_' + Date.now(),
      title: aiNoteResult.title,
      content: aiNoteResult.content,
      category: aiNoteResult.category,
      tags: aiNoteResult.tags,
      isPinned: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    onUpdateNotes(updated);
    db.saveNotes(updated);
    setShowAIModal(false);
    setAiNoteResult(null);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#AF52DE', '#FF6B8B', '#07C160'],
    });
  };

  // Open in editor for fine-tuning
  const handleOpenAIInEditor = () => {
    if (!aiNoteResult) return;
    sound.playTap();
    setEditingNote(null);
    setFormTitle(aiNoteResult.title);
    setFormContent(aiNoteResult.content);
    setFormCategory(aiNoteResult.category);
    setFormTags(aiNoteResult.tags.join(', '));
    setFormIsPinned(false);
    setFormIsFavorite(false);
    setPreviewMode('edit');
    setShowAIModal(false);
    setShowEditor(true);
  };

  // Stop live AI generation
  const handleStopAIGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAiActionState(prev => ({
      ...prev,
      status: prev.output ? 'completed' : 'idle',
    }));
    sound.playTap();
  };

  // Toolbar AI polish / continue writing / summary / tags / translate with Live Streaming & Thinking
  const handleToolbarAIPolish = async (action: 'continue' | 'polish' | 'summary' | 'tags' | 'translate') => {
    if (!formContent.trim()) {
      alert('请先在正文中输入一段内容，AI 才能为你续写、润色、打标签或提炼要点');
      return;
    }
    sound.playTap();

    if (!activeProvider || !activeProvider.apiKey) {
      alert('未检测到有效的大模型配置，请先在【AI伴侣 ➔ 模型配置】中配置有效的 API Key');
      return;
    }

    setAiActionState({
      isOpen: true,
      action,
      status: 'reasoning',
      reasoning: '',
      isReasoningExpanded: true,
      output: '',
      errorMessage: undefined,
    });

    abortControllerRef.current = new AbortController();
    const startTime = Date.now();
    let hasOutputStarted = false;

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'continue') {
      systemPrompt = `你是一位高水平资深知识博主与严谨思考者。请根据用户提供的笔记标题与已有正文，进行深度连贯、逻辑缜密、文字优美的 Markdown 续写与细节延展。直接输出续写的 Markdown 正文，切勿包含任何寒暄或客套说明。`;
      userPrompt = `请基于以下已有笔记内容进行自然深入的续写与拓展：\n\n【笔记标题】：${formTitle || '未命名笔记'}\n【已有正文】：\n${formContent}`;
    } else if (action === 'polish') {
      systemPrompt = `你是一位顶级中文编辑与 Markdown 排版美学大师。请对用户提供的笔记进行文笔打磨、行文结构梳理、段落节奏优化与排版美化，提升专业度与可读性。保留原文全部核心论据与要点，直接输出润色后的全新完整 Markdown 文本，切勿包含多余寒暄。`;
      userPrompt = `请对以下笔记进行全面文笔润色与优美排版：\n\n【笔记标题】：${formTitle || '未命名笔记'}\n【原始正文】：\n${formContent}`;
    } else if (action === 'summary') {
      systemPrompt = `你是一位敏锐高效的思维导图与速读专家。请提炼出用户笔记的核心要点摘要，整理为 3~5 条条理分明、高度浓缩的 Markdown 关键 Takeaways 列表，附带简明行动启示。直接输出列表文本，切勿包含多余寒暄。`;
      userPrompt = `请从以下笔记正文中提取核心精髓与关键要点：\n\n【笔记标题】：${formTitle || '未命名笔记'}\n【笔记正文】：\n${formContent}`;
    } else if (action === 'tags') {
      systemPrompt = `你是一位专业的内容分类与标签专家。请根据用户的笔记标题与正文，提炼出 3~5 个最精准、简明、高价值的标签词，用逗号隔开输出，例如：“React19, 前端架构, 并发模式, 性能优化”。不要输出任何多余的解释。`;
      userPrompt = `请为以下笔记提取最合适的标签关键词：\n\n【笔记标题】：${formTitle || '未命名笔记'}\n【笔记正文】：\n${formContent}`;
    } else {
      systemPrompt = `你是一位精通中英双语的专业翻译专家。若用户笔记主要为中文，请将其精准翻译为专业、优雅的英文 Markdown；若为英文则翻译为地道流利的中文 Markdown。直接输出翻译后的正文，保留所有原始排版标记。`;
      userPrompt = `请对以下笔记进行高质量互译：\n\n【笔记正文】：\n${formContent}`;
    }

    try {
      await streamChatCompletion({
        provider: activeProvider,
        model: selectedNoteModel || activeProvider.defaultModel || 'deepseek-v4-flash',
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        signal: abortControllerRef.current.signal,
        onReasoningChunk: reasoningDelta => {
          setAiActionState(prev => ({
            ...prev,
            status: 'reasoning',
            reasoning: prev.reasoning + reasoningDelta,
          }));
        },
        onChunk: delta => {
          if (!hasOutputStarted) {
            hasOutputStarted = true;
            const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000));
            setAiActionState(prev => ({
              ...prev,
              status: 'generating',
              reasoningDurationSeconds: prev.reasoning ? duration : undefined,
              isReasoningExpanded: false,
              output: prev.output + delta,
            }));
          } else {
            setAiActionState(prev => ({
              ...prev,
              output: prev.output + delta,
            }));
          }
        },
      });

      setAiActionState(prev => ({
        ...prev,
        status: 'completed',
      }));
      sound.playSuccess();
    } catch (err: any) {
      if (abortControllerRef.current?.signal.aborted) {
        setAiActionState(prev => ({ ...prev, status: 'idle' }));
        return;
      }
      setAiActionState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: formatFriendlyAIError(err.message || String(err)),
      }));
      sound.playTap();
    }
  };

  // Categories list
  const categories = ['all', '指南', '工作', '学习', '生活', '灵感', '代码'];

  // Filter notes: Pinned first, then sorted by updatedAt descending
  const filteredNotes = notes
    .filter(note => {
      const matchCat = selectedCategory === 'all' || note.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some(t => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  // Open Create
  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('生活');
    setFormTags('');
    setFormIsPinned(false);
    setFormIsFavorite(false);
    setPreviewMode('edit');
    setShowEditor(true);
    sound.playTap();
  };

  // Open Edit
  const handleOpenEdit = (note: NoteItem) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormTags(note.tags.join(', '));
    setFormIsPinned(note.isPinned);
    setFormIsFavorite(note.isFavorite);
    setPreviewMode('edit');
    setShowEditor(true);
    sound.playTap();
  };

  // Toggle Favorite
  const handleToggleFavorite = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    const updated = notes.map(n =>
      n.id === noteId ? { ...n, isFavorite: !n.isFavorite, updatedAt: new Date().toISOString() } : n
    );
    onUpdateNotes(updated);
    db.saveNotes(updated);
  };

  // Toggle Pin
  const handleTogglePin = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    const updated = notes.map(n =>
      n.id === noteId ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
    );
    onUpdateNotes(updated);
    db.saveNotes(updated);
  };

  // Delete note
  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    const updated = notes.filter(n => n.id !== noteId);
    onUpdateNotes(updated);
    db.saveNotes(updated);
  };

  // Save note
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    sound.playSuccess();
    const tagArray = formTags
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(Boolean);

    let updated: NoteItem[];
    if (editingNote) {
      updated = notes.map(n => {
        if (n.id === editingNote.id) {
          return {
            ...n,
            title: formTitle.trim(),
            content: formContent,
            category: formCategory,
            tags: tagArray,
            isPinned: formIsPinned,
            isFavorite: formIsFavorite,
            updatedAt: new Date().toISOString(),
          };
        }
        return n;
      });
    } else {
      const newNote: NoteItem = {
        id: 'n_' + Date.now(),
        title: formTitle.trim(),
        content: formContent,
        category: formCategory,
        tags: tagArray,
        isPinned: formIsPinned,
        isFavorite: formIsFavorite,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newNote, ...notes];
    }

    onUpdateNotes(updated);
    db.saveNotes(updated);
    setShowEditor(false);
  };

  // Insert markdown snippet into editor
  const insertMarkdown = (prefix: string, suffix = '') => {
    sound.playTap();
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formContent.substring(start, end);
    const replacement = prefix + (selected || '文本') + suffix;

    const newContent = formContent.substring(0, start) + replacement + formContent.substring(end);
    setFormContent(newContent);
  };

  // Export note to file
  const handleExportNote = (note: NoteItem, format: 'md' | 'txt') => {
    sound.playTap();
    const blob = new Blob([note.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[\\/:*?"<>|]/g, '_')}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy note content
  const handleCopyNote = (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
    sound.playTap();
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#EDEDED] dark:bg-[#111111]">
      {/* Search & Top Action Bar */}
      <div className="p-3 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 space-y-2 shrink-0">
        <div className="flex items-center space-x-2">
          {/* WeChat style soft search box */}
          <div className="flex-1 flex items-center px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200">
            <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="搜索标题、正文、标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full placeholder-zinc-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-zinc-400 text-xs hover:text-zinc-600">
                ✕
              </button>
            )}
          </div>

          {/* AI Note Creator */}
          <button
            onClick={handleOpenAINoteModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 hover:from-purple-600 hover:to-rose-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition shrink-0"
            title="AI 智能创想生成笔记"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI 写笔记</span>
          </button>

          {/* Manual Create Note */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#07C160] text-white text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>记笔记</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                sound.playTap();
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium ${
                selectedCategory === cat
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {cat === 'all' ? '全部' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 pb-20">
        {filteredNotes.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-center space-y-2 select-none">
            <div className="w-14 h-14 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 flex items-center justify-center text-2xl">
              📝
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">未找到相关笔记</p>
            <button
              onClick={handleOpenCreate}
              className="text-xs text-[#07C160] font-semibold hover:underline"
            >
              + 记录第一条灵感火花
            </button>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => handleOpenEdit(note)}
              className={`glass-card p-3.5 rounded-2xl shadow-ios border border-white/80 dark:border-zinc-800/80 hover:shadow-ios-hover cursor-pointer transition-all duration-200 relative group`}
            >
              {/* Top Row: Title & Badges */}
              <div className="flex items-start justify-between space-x-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  {note.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {note.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {/* Favorite button */}
                  <button
                    onClick={e => handleToggleFavorite(note.id, e)}
                    className="p-1 text-zinc-400 hover:text-amber-500 transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        note.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                      }`}
                    />
                  </button>

                  {/* Pin button */}
                  <button
                    onClick={e => handleTogglePin(note.id, e)}
                    className="p-1 text-zinc-400 hover:text-amber-500 transition-colors"
                  >
                    <Pin
                      className={`w-3.5 h-3.5 ${note.isPinned ? 'text-amber-500' : ''}`}
                    />
                  </button>

                  {/* Copy button */}
                  <button
                    onClick={e => handleCopyNote(note, e)}
                    className="p-1 text-zinc-400 hover:text-[#07C160] transition-colors"
                    title="复制全文"
                  >
                    {copiedNoteId === note.id ? (
                      <Check className="w-3.5 h-3.5 text-[#07C160]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={e => handleDeleteNote(note.id, e)}
                    className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Snippet preview */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                {note.content.replace(/[#*`~>-]/g, '').trim()}
              </p>

              {/* Meta: Category, Tags, Time */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                    {note.category}
                  </span>
                  {Array.from(new Set(note.tags)).map((t, idx) => (
                    <span
                      key={`${t}-${idx}`}
                      className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span>{note.content.length} 字</span>
                  <span>{note.updatedAt.split('T')[0]}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Note Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-3xl flex flex-col shadow-ios-modal border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="h-12 px-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {editingNote ? '编辑笔记' : '新灵感笔记'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {formContent.length} 字 · 约 {Math.max(1, Math.round(formContent.length / 300))} 分钟阅读
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Edit / Preview toggle */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('edit')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      previewMode === 'edit'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-semibold shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('preview')}
                    className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                      previewMode === 'preview'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-semibold shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    <span>预览</span>
                  </button>
                </div>

                {editingNote && (
                  <button
                    type="button"
                    onClick={() => handleExportNote(editingNote, 'md')}
                    className="p-1.5 text-zinc-500 hover:text-[#07C160] rounded-lg transition"
                    title="导出 Markdown"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="p-1.5 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Note Editor Body */}
            <form onSubmit={handleSaveNote} className="flex-1 flex flex-col overflow-hidden">
              {/* Title & Metadata row */}
              <div className="p-3 space-y-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="请输入笔记标题..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full text-base font-bold text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none placeholder-zinc-400"
                />

                <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-none outline-none font-medium"
                  >
                    <option value="生活">🌸 生活</option>
                    <option value="工作">💼 工作</option>
                    <option value="学习">📚 学习</option>
                    <option value="灵感">💡 灵感</option>
                    <option value="代码">💻 代码</option>
                    <option value="指南">📖 指南</option>
                  </select>

                  <div className="flex-1 flex items-center px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <Tag className="w-3 h-3 text-zinc-400 mr-1 shrink-0" />
                    <input
                      type="text"
                      placeholder="标签（逗号分隔，如：随想, 待办）"
                      value={formTags}
                      onChange={e => setFormTags(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-xs text-zinc-800 dark:text-zinc-200"
                    />
                  </div>

                  <label className="flex items-center space-x-1 cursor-pointer select-none text-zinc-600 dark:text-zinc-400 text-xs">
                    <input
                      type="checkbox"
                      checked={formIsPinned}
                      onChange={e => setFormIsPinned(e.target.checked)}
                      className="rounded text-[#07C160] focus:ring-0"
                    />
                    <span>置顶</span>
                  </label>

                  <label className="flex items-center space-x-1 cursor-pointer select-none text-zinc-600 dark:text-zinc-400 text-xs">
                    <input
                      type="checkbox"
                      checked={formIsFavorite}
                      onChange={e => setFormIsFavorite(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>收藏</span>
                  </label>
                </div>
              </div>

              {/* Markdown Toolbar (Only in Edit mode) */}
              {previewMode === 'edit' && (
                <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center space-x-1 shrink-0 overflow-x-auto text-xs">
                  <button
                    type="button"
                    onClick={() => insertMarkdown('**', '**')}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title="粗体"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('### ')}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title="标题"
                  >
                    <Heading className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('- ')}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title="无序列表"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('- [ ] ')}
                    className="p-1 text-[11px] font-mono rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title="待办勾选"
                  >
                    ☑️
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('`', '`')}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title="行内代码"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('> ')}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title="引用"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1"></div>

                  {/* AI Writing Assist Quick Actions */}
                  <button
                    type="button"
                    onClick={() => handleToolbarAIPolish('continue')}
                    disabled={aiActionState.status === 'reasoning' || aiActionState.status === 'generating'}
                    className="px-2 py-0.5 rounded text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center space-x-1 font-semibold transition disabled:opacity-50"
                    title="AI 智能续写内容"
                  >
                    {aiActionState.isOpen && aiActionState.action === 'continue' && (aiActionState.status === 'reasoning' || aiActionState.status === 'generating') ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>AI 续写</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAIPolish('polish')}
                    disabled={aiActionState.status === 'reasoning' || aiActionState.status === 'generating'}
                    className="px-2 py-0.5 rounded text-[11px] bg-pink-50 hover:bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 flex items-center space-x-1 font-semibold transition disabled:opacity-50"
                    title="AI 润色与排版美化"
                  >
                    {aiActionState.isOpen && aiActionState.action === 'polish' && (aiActionState.status === 'reasoning' || aiActionState.status === 'generating') ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    <span>AI 润色</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAIPolish('summary')}
                    disabled={aiActionState.status === 'reasoning' || aiActionState.status === 'generating'}
                    className="px-2 py-0.5 rounded text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center space-x-1 font-semibold transition disabled:opacity-50"
                    title="AI 提炼核心要点"
                  >
                    {aiActionState.isOpen && aiActionState.action === 'summary' && (aiActionState.status === 'reasoning' || aiActionState.status === 'generating') ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                    <span>提炼要点</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAIPolish('tags')}
                    disabled={aiActionState.status === 'reasoning' || aiActionState.status === 'generating'}
                    className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center space-x-1 font-semibold transition disabled:opacity-50"
                    title="AI 智能提取并填充标签"
                  >
                    {aiActionState.isOpen && aiActionState.action === 'tags' && (aiActionState.status === 'reasoning' || aiActionState.status === 'generating') ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Tag className="w-3 h-3" />
                    )}
                    <span>AI 标签</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAIPolish('translate')}
                    disabled={aiActionState.status === 'reasoning' || aiActionState.status === 'generating'}
                    className="px-2 py-0.5 rounded text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 flex items-center space-x-1 font-semibold transition disabled:opacity-50"
                    title="AI 中英双语互译"
                  >
                    {aiActionState.isOpen && aiActionState.action === 'translate' && (aiActionState.status === 'reasoning' || aiActionState.status === 'generating') ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Languages className="w-3 h-3" />
                    )}
                    <span>AI 翻译</span>
                  </button>
                </div>
              )}

              {/* AI Live Action Dock (AI 实时干活动态看板) */}
              {aiActionState.isOpen && (
                <div className="mx-3 my-2 p-3 rounded-2xl border border-purple-200/90 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/80 via-white dark:from-purple-950/40 dark:via-zinc-900 shadow-sm space-y-2.5 transition-all shrink-0">
                  {/* Header & Status Indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`p-1.5 rounded-xl text-white shadow-xs ${
                          aiActionState.action === 'polish'
                            ? 'bg-gradient-to-tr from-pink-500 to-rose-400'
                            : aiActionState.action === 'summary'
                            ? 'bg-gradient-to-tr from-blue-500 to-indigo-400'
                            : 'bg-gradient-to-tr from-purple-500 to-violet-400'
                        }`}
                      >
                        {aiActionState.action === 'polish' ? (
                          <Wand2 className="w-3.5 h-3.5" />
                        ) : aiActionState.action === 'summary' ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {aiActionState.action === 'polish'
                              ? 'AI 智能润色'
                              : aiActionState.action === 'summary'
                              ? 'AI 核心提炼'
                              : 'AI 深度续写'}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {db.getAIProviders().find(p => p.isActive)?.defaultModel || '大模型'}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center space-x-1 mt-0.5">
                          {aiActionState.status === 'reasoning' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center space-x-1">
                              <Sparkles className="w-3 h-3 animate-spin" />
                              <span>正在深度思考推导与行文构思...</span>
                            </span>
                          ) : aiActionState.status === 'generating' ? (
                            <span className="text-[#07C160] font-medium flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#07C160] animate-pulse"></span>
                              <span>正在实时打字输出 ({aiActionState.output.length} 字)...</span>
                            </span>
                          ) : aiActionState.status === 'completed' ? (
                            <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center space-x-1">
                              <Check className="w-3 h-3 text-[#07C160]" />
                              <span>生成完毕！共 {aiActionState.output.length} 字</span>
                            </span>
                          ) : aiActionState.status === 'error' ? (
                            <span className="text-red-500 font-medium">生成遇到异常</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {aiActionState.status === 'reasoning' || aiActionState.status === 'generating' ? (
                        <button
                          type="button"
                          onClick={handleStopAIGeneration}
                          className="px-2.5 py-1 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium flex items-center space-x-1 shadow-xs transition"
                        >
                          <Square className="w-3 h-3 fill-white" />
                          <span>停止生成</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAiActionState(prev => ({ ...prev, isOpen: false }))}
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live Reasoning Chain Box (思维推导链) */}
                  {aiActionState.reasoning && (
                    <div className="rounded-xl border border-purple-200/60 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setAiActionState(prev => ({
                            ...prev,
                            isReasoningExpanded: !prev.isReasoningExpanded,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-purple-100/30 transition select-none"
                      >
                        <div className="flex items-center space-x-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                          <Brain className="w-3 h-3 text-purple-600" />
                          <span>
                            思维推导链{' '}
                            {aiActionState.reasoningDurationSeconds
                              ? `(用时 ${aiActionState.reasoningDurationSeconds} 秒)`
                              : '(深度思考中...)'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-zinc-400 text-[10px]">
                          <span>{aiActionState.isReasoningExpanded ? '收起' : '展开查看'}</span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              aiActionState.isReasoningExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {aiActionState.isReasoningExpanded && (
                        <div className="px-2.5 pb-2 pt-1 border-t border-purple-100 dark:border-purple-900/30 font-mono text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-400 max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                          {aiActionState.reasoning}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Streaming Content Window */}
                  {aiActionState.output ? (
                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 max-h-48 overflow-y-auto font-sans text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 select-text whitespace-pre-wrap shadow-inner relative">
                      {aiActionState.output}
                      {aiActionState.status === 'generating' && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#07C160] animate-pulse align-middle"></span>
                      )}
                    </div>
                  ) : aiActionState.status === 'error' ? (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 leading-relaxed flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{aiActionState.errorMessage || '生成遇到异常，请检查模型与网络'}</p>
                    </div>
                  ) : null}

                  {/* Action Control Bar when completed */}
                  {aiActionState.status === 'completed' && aiActionState.output && (
                    <div className="pt-1 flex items-center justify-between flex-wrap gap-2 border-t border-zinc-200/60 dark:border-zinc-700/50">
                      <div className="flex items-center space-x-2">
                        {aiActionState.action === 'polish' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setFormContent(aiActionState.output);
                                sound.playSuccess();
                                setAiActionState(prev => ({ ...prev, isOpen: false }));
                              }}
                              className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs shadow-xs active:scale-95 transition flex items-center space-x-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>采纳并替换原文</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormContent(prev => prev.trim() + '\n\n---\n### ✨ 润色版本\n' + aiActionState.output);
                                sound.playSuccess();
                                setAiActionState(prev => ({ ...prev, isOpen: false }));
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition"
                            >
                              追加到文末
                            </button>
                          </>
                        ) : aiActionState.action === 'summary' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFormContent(prev => prev.trim() + '\n\n---\n### 💡 AI 核心要点提炼\n' + aiActionState.output);
                              sound.playSuccess();
                              setAiActionState(prev => ({ ...prev, isOpen: false }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs shadow-xs active:scale-95 transition flex items-center space-x-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>插入文末为【核心要点】</span>
                          </button>
                        ) : aiActionState.action === 'tags' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const cleanTags = aiActionState.output.replace(/[#]/g, '').trim();
                              setFormTags(prev => prev ? `${prev}, ${cleanTags}` : cleanTags);
                              sound.playSuccess();
                              setAiActionState(prev => ({ ...prev, isOpen: false }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition flex items-center space-x-1"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>一键填入标签栏</span>
                          </button>
                        ) : aiActionState.action === 'translate' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setFormContent(aiActionState.output);
                                sound.playSuccess();
                                setAiActionState(prev => ({ ...prev, isOpen: false }));
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs active:scale-95 transition flex items-center space-x-1"
                            >
                              <Languages className="w-3.5 h-3.5" />
                              <span>采纳并替换为译文</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormContent(prev => prev.trim() + '\n\n---\n### 🌐 双语对照译文\n' + aiActionState.output);
                                sound.playSuccess();
                                setAiActionState(prev => ({ ...prev, isOpen: false }));
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition"
                            >
                              追加译文到文末
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setFormContent(prev => prev.trim() + '\n\n' + aiActionState.output);
                              sound.playSuccess();
                              setAiActionState(prev => ({ ...prev, isOpen: false }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#07C160] hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs active:scale-95 transition flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>一键追加到笔记文末</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(aiActionState.output);
                            sound.playTap();
                            setCopiedActionText(true);
                            setTimeout(() => setCopiedActionText(false), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center space-x-1 transition"
                        >
                          {copiedActionText ? <Check className="w-3 h-3 text-[#07C160]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedActionText ? '已复制' : '复制结果'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiActionState(prev => ({ ...prev, isOpen: false }))}
                          className="px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs transition"
                        >
                          放弃
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main Content (Editor or Preview) */}
              <div className="flex-1 overflow-y-auto p-4">
                {previewMode === 'edit' ? (
                  <textarea
                    id="note-textarea"
                    placeholder="在此撰写你的笔记与 Markdown 内容..."
                    value={formContent}
                    onChange={e => setFormContent(e.target.value)}
                    className="w-full h-full bg-transparent border-none outline-none resize-none font-sans text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 leading-relaxed font-normal"
                  />
                ) : (
                  <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-2 select-text">
                    {formContent ? (
                      <div className="whitespace-pre-wrap font-sans text-zinc-800 dark:text-zinc-200">
                        {formContent}
                      </div>
                    ) : (
                      <p className="text-zinc-400 italic">暂无内容预览</p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="h-12 px-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end space-x-2 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 text-xs font-semibold rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white shadow-md transition"
                >
                  保存笔记
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Smart Note Creation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 w-full max-w-lg shadow-2xl border border-white/80 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-400 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    猫步 AI 灵感写笔记
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  输入任意构思或主题，AI 将自动为你撰写排版优美、扎实丰富的 Markdown 笔记
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setAiNoteResult(null);
                }}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model Selector & API Status Banner */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60 text-xs">
              <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">创作模型:</span>
                <select
                  value={selectedNoteModel}
                  onChange={e => setSelectedNoteModel(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl px-2.5 py-1 outline-none truncate shadow-2xs"
                >
                  {availableModels.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {activeProvider?.apiKey?.trim() ? (
                <span className="shrink-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  API 已就绪
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowAIModal(false);
                    if (onSwitchToAITab) onSwitchToAITab();
                  }}
                  className="shrink-0 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full hover:underline flex items-center space-x-0.5"
                >
                  <span>未配置密钥，去配置</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Error Notification Banner */}
            {aiNoteError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 space-y-1.5 animate-fade-in">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="flex-1 font-medium leading-relaxed">{aiNoteError}</p>
                </div>
                {!activeProvider?.apiKey?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAIModal(false);
                      if (onSwitchToAITab) onSwitchToAITab();
                    }}
                    className="ml-6 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 transition"
                  >
                    前往「AI 伴侣」配置 API Key ➔
                  </button>
                )}
              </div>
            )}

            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                笔记主题或灵感构思
              </label>
              <textarea
                rows={3}
                value={aiTopicInput}
                onChange={e => setAiTopicInput(e.target.value)}
                placeholder="例如：猫咪新手科学养护全景指南、React 19 核心全栈架构演进、小红书爆款文案吸睛公式、《纳瓦尔宝典》心智模型..."
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-purple-500 text-zinc-900 dark:text-zinc-100 transition leading-relaxed"
              />
            </div>

            {/* Tone / Style Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                选择创作风格
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'guide', label: '📖 结构化干货', desc: '条理分明·深度指南' },
                  { id: 'essay', label: '🌸 灵感随笔', desc: '温润细腻·思维沉淀' },
                  { id: 'xhs', label: '🎨 爆款小红书', desc: '吸睛钩子·生动排版' },
                  { id: 'summary', label: '📋 复盘与要点', desc: '核心精炼·行动导向' },
                ].map(style => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setAiNoteStyle(style.id as any)}
                    className={`p-2 rounded-xl text-left border transition ${
                      aiNoteStyle === style.id
                        ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{style.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-medium">✨ 热门灵感推荐：</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🐾 猫咪新手科学养护全景指南',
                  '💻 React 19 核心架构实战演进',
                  '🎨 爆款文案架构与吸睛公式',
                  '📚 《纳瓦尔宝典》心智模型与认知跃迁',
                  '🌸 极简治愈生活随笔与心流复盘',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRunAINote(chip)}
                    className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[11px] transition font-medium text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={() => handleRunAINote()}
              disabled={isAIGenerating || !aiTopicInput.trim()}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 hover:from-purple-700 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md active:scale-98 transition disabled:opacity-50"
            >
              {isAIGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在调用 [{selectedNoteModel}] 深度创作中... ({liveElapsedSeconds}s)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>开始 AI 创作笔记</span>
                </>
              )}
            </button>

            {/* Live Streaming Reasoning Preview during Generation */}
            {isAIGenerating && liveReasoning && (
              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                  <div className="flex items-center space-x-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                    <span>模型深度思考推导中 ({liveReasoning.length} 字)...</span>
                  </div>
                  <span className="font-mono text-[10px] text-purple-500">{liveElapsedSeconds}s</span>
                </div>
                <div className="max-h-28 overflow-y-auto text-[11px] font-mono leading-relaxed text-zinc-600 dark:text-zinc-400 bg-white/70 dark:bg-zinc-900/60 p-2.5 rounded-xl whitespace-pre-wrap select-text">
                  {liveReasoning}
                </div>
              </div>
            )}

            {/* Result Preview Card */}
            {aiNoteResult && (
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-3 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {aiNoteResult.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-200/80 dark:bg-purple-800 text-purple-800 dark:text-purple-200 font-semibold">
                        {aiNoteResult.category}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] text-purple-700 dark:text-purple-300 font-mono bg-white/80 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-900">
                      <Bot className="w-3 h-3 text-purple-600" />
                      <span>{aiNoteResult.modelUsed}</span>
                      <span>·</span>
                      <span>{aiNoteResult.durationSeconds}s</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-wrap gap-1">
                    {Array.from(new Set(aiNoteResult.tags)).map((t, idx) => (
                      <span key={`${t}-${idx}`} className="text-[10px] text-purple-600 dark:text-purple-400 bg-white/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Collapsible Model Reasoning Drawer */}
                {aiNoteResult.reasoningContent && (
                  <div className="rounded-xl border border-purple-200/60 dark:border-purple-900/50 bg-white/60 dark:bg-zinc-900/60 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setShowReasoningView(prev => !prev)}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-purple-100/30 transition select-none"
                    >
                      <div className="flex items-center space-x-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                        <Brain className="w-3 h-3 text-purple-600" />
                        <span>完整思维推导过程 ({aiNoteResult.reasoningContent.length} 字)</span>
                      </div>
                      <div className="flex items-center space-x-1 text-zinc-400 text-[10px]">
                        <span>{showReasoningView ? '收起' : '展开查看'}</span>
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${showReasoningView ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>
                    {showReasoningView && (
                      <div className="p-2.5 border-t border-purple-100 dark:border-purple-900/30 font-mono text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-400 max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                        {aiNoteResult.reasoningContent}
                      </div>
                    )}
                  </div>
                )}

                {/* Markdown content preview box */}
                <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-white dark:bg-zinc-800/80 text-xs leading-relaxed border border-purple-100 dark:border-purple-900 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-text font-sans">
                  {aiNoteResult.content}
                </div>

                {/* Dual Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenAIInEditor}
                    className="py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1 border border-zinc-200 dark:border-zinc-700 transition active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>在编辑器深度润色</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAdoptAINote}
                    className="py-2.5 px-3 rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-md transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>一键存入笔记</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
