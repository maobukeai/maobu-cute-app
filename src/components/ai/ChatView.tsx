import React, { useEffect, useRef, useState } from 'react';
import {
  AIProvider,
  AISession,
  AIMessage,
  AISkill,
} from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { MarkdownPreview } from '../MarkdownPreview';
import { streamChatCompletion, formatFriendlyAIError } from '../../utils/ai';
import {
  PenLine,
  Send,
  Square,
  Copy,
  Check,
  Plus,
  ChevronDown,
  AlertCircle,
  Sliders,
  Brain,
  User,
  CalendarCheck,
  Lightbulb,
  Code2,
} from 'lucide-react';
import { Button, Chip, Textarea, useToast } from '../ui';
import { SkillPickerSheet } from './SkillPickerSheet';

interface ChatViewProps {
  providers: AIProvider[];
  sessions: AISession[];
  onUpdateSessions: React.Dispatch<React.SetStateAction<AISession[]>>;
  skills: AISkill[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onGoToProviders: () => void;
  onGoToSkills?: () => void;
}

/** Empty-state starter cards (lucide icons, accent emphasis). */
const QUICK_STARTERS = [
  {
    icon: CalendarCheck,
    title: '今日规划',
    desc: '制定高效日程与作息',
    prompt: '请帮我梳理今天的重点任务，按四象限法制定一份高效日程规划。',
  },
  {
    icon: Lightbulb,
    title: '灵感创意',
    desc: '头脑风暴与文案生成',
    prompt: '请给我 5 个针对当下热门科技趋势的创新项目点子。',
  },
  {
    icon: Code2,
    title: '代码优化',
    desc: '重构与审查代码片段',
    prompt: '请作为资深架构师，帮我审查并优化一段 React + TypeScript 代码。',
  },
  {
    icon: PenLine,
    title: '种草文案',
    desc: '生成高赞爆款文案',
    prompt: '请以生动真诚的博主口吻，写一篇吸引人的小红书数码好物种草笔记。',
  },
];

/** Quick prompt pills above the input bar. */
const QUICK_PROMPTS = ['今日备忘规划', '写一段温暖问候', 'Python 代码优化', '小红书种草文案'];

/** Collapsible chain-of-thought card attached to an assistant bubble. */
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
    <div className="mb-2 rounded-2xl border border-line bg-surface-2/60 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left select-none"
      >
        <div className="flex items-center gap-1.5">
          {isReasoning ? (
            <div className="flex items-center gap-1.5 text-accent font-semibold text-caption">
              <Brain className="w-3.5 h-3.5 animate-pulse" />
              <span>正在思考中…</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-ink-2 font-medium text-caption">
              <Brain className="w-3.5 h-3.5 text-accent" />
              <span>已完成深度思考{durationSeconds ? `（用时 ${durationSeconds} 秒）` : ''}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-ink-3">
          <span className="text-caption">{isExpanded ? '收起' : '展开'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-2.5 pt-2 border-t border-line/70 text-caption leading-relaxed text-ink-2 font-mono select-text whitespace-pre-wrap max-h-52 overflow-y-auto">
          {reasoning}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="text-caption text-ink-3 hover:text-ink flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3 h-3 text-ok" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '已复制' : '复制思考过程'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Compact centered timestamp shown when there is a conversation gap. */
const TimeDivider: React.FC<{ ts?: string }> = ({ ts }) => {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const dayLabel =
    d.toDateString() === now.toDateString()
      ? '今天'
      : d.toDateString() === yesterday.toDateString()
      ? '昨天'
      : `${d.getMonth() + 1}月${d.getDate()}日`;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return (
    <div className="flex justify-center py-1.5 select-none">
      <span className="text-caption text-ink-3 bg-surface-2/60 px-2.5 py-0.5 rounded-full">
        {dayLabel} {hh}:{mm}
      </span>
    </div>
  );
};

/** Insert a divider when the conversation has been idle for 30+ minutes. */
function needsTimeDivider(prev: AIMessage | undefined, current: AIMessage): boolean {
  if (!prev?.timestamp || !current?.timestamp) return false;
  return new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime() > 30 * 60 * 1000;
}

/**
 * Single chat row. Memoized so that streaming updates to one message
 * never re-render the rest of the transcript.
 * While a message is still streaming it renders as plain text — full
 * Markdown layout runs only once, when the stream completes.
 */
const MessageRow = React.memo<{
  msg: AIMessage;
  copied: boolean;
  isLiveStream: boolean;
  onCopy: (text: string, id: string) => void;
  onGoToProviders: () => void;
}>(function MessageRow({ msg, copied, isLiveStream, onCopy, onGoToProviders }) {
  const isUser = msg.role === 'user';
  const isStreamingMsg = !!msg.isStreaming;
  const showCursor = isStreamingMsg && !msg.isReasoning;

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-xl bg-surface-2 text-ink-2 flex items-center justify-center shrink-0 border border-line select-none">
          <User className="w-4 h-4" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-surface-2 text-ink-2 border border-line flex items-center justify-center shrink-0 select-none text-[11px] font-bold tracking-tight">
          AI
        </div>
      )}

      {/* Message Bubble */}
      <div className="max-w-[82%] space-y-1">
        {/* Thinking Process Accordion (深度思考链) */}
        {!isUser && msg.reasoningContent && (
          <ThinkingProcessCard
            reasoning={msg.reasoningContent}
            isReasoning={msg.isReasoning || (isStreamingMsg && !msg.content)}
            durationSeconds={msg.reasoningDurationSeconds}
          />
        )}

        <div
          className={`p-3 text-sub leading-relaxed ${isUser ? 'bubble-self' : 'bubble-other'}`}
        >
          {msg.content ? (
            isUser ? (
              <div className="whitespace-pre-wrap break-words select-text">{msg.content}</div>
            ) : showCursor ? (
              // Streaming: plain text keeps per-chunk cost to a bare minimum
              <div className="whitespace-pre-wrap break-words select-text">
                {msg.content}
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-accent animate-pulse align-text-bottom" />
              </div>
            ) : (
              <MarkdownPreview content={msg.content} className="text-sub select-text" />
            )
          ) : isStreamingMsg ? (
            msg.isReasoning ? (
              <div className="text-ink-3 italic text-caption flex items-center gap-1.5 py-0.5">
                <Brain className="w-3 h-3 text-accent animate-pulse" />
                <span>正在思考并组织回复…</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-ink-3 py-1">
                <span className="w-2 h-2 rounded-full bg-ink-3 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-ink-3 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-ink-3 animate-bounce [animation-delay:0.4s]" />
              </div>
            )
          ) : msg.error ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">{formatFriendlyAIError(msg.error)}</p>
              </div>
              <Button variant="soft" size="sm" onClick={onGoToProviders}>
                <Sliders className="w-3.5 h-3.5" />
                <span>前往模型配置更新密钥或切换端点</span>
              </Button>
            </div>
          ) : (
            <span className="text-ink-3 italic">空消息</span>
          )}
        </div>

        {/* Message Actions */}
        {!isUser && msg.content && (!isStreamingMsg || !isLiveStream) && (
          <div className="flex items-center gap-2 px-1 text-caption text-ink-3">
            <button
              onClick={() => onCopy(msg.content, msg.id)}
              className="hover:text-ink flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-ok" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
            <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export const ChatView: React.FC<ChatViewProps> = ({
  providers,
  sessions,
  onUpdateSessions,
  skills,
  currentSessionId,
  onSelectSession,
  onGoToProviders,
  onGoToSkills,
}) => {
  const toast = useToast();

  const activeProvider = providers.find(p => p.isActive) || providers[0];
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  // Active Skill for chat
  const activeSkill = skills.find(s => s.id === currentSession?.activeSkillId) || skills[0];

  // Custom Skill Picker Bottom Sheet State
  const [isSkillPickerOpen, setIsSkillPickerOpen] = useState(false);

  // Chat input and streaming state
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize chat textarea dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 120)}px`;
    }
  }, [inputMessage]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isStreaming]);

  const handleCopyFeedback = React.useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    sound.playTap();
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }, []);

  const handleGoToProviders = React.useCallback(() => {
    onGoToProviders();
  }, [onGoToProviders]);

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
          content: `你好，我是${activeSkill?.name || '猫步智能助理'}。想聊点什么，或者有什么需要帮忙的？`,
          timestamp: new Date().toISOString(),
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newSession, ...sessions];
    onUpdateSessions(updated);
    db.saveAISessions(updated);
    onSelectSession(newSession.id);
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
      toast.warn('当前大模型服务商未配置 API Key，请前往「模型配置」填写并保存你的 API Key');
      onGoToProviders();
      return;
    }

    if (!activeProvider?.defaultModel?.trim()) {
      toast.warn('尚未配置大模型，请前往「模型配置」获取或输入你的模型名称');
      onGoToProviders();
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

    // Coalesce streaming deltas: chunks land in a buffer and are applied
    // to session state at most once per animation frame, so a fast token
    // stream costs one commit per frame instead of one per token.
    const streamBuf = { reasoning: '', content: '' };
    let rafId = 0;

    const applyStreamBuffer = () => {
      rafId = 0;
      const reasoning = streamBuf.reasoning;
      const content = streamBuf.content;
      if (!reasoning && !content) return;
      streamBuf.reasoning = '';
      streamBuf.content = '';
      const duration = Math.max(1, Math.round((Date.now() - reasoningStartTime) / 1000));
      onUpdateSessions(prev =>
        prev.map(s => {
          if (s.id !== currentSessionId) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    reasoningContent: reasoning ? (m.reasoningContent || '') + reasoning : m.reasoningContent,
                    content: content ? m.content + content : m.content,
                    isReasoning: content ? false : m.isReasoning,
                    reasoningDurationSeconds:
                      m.reasoningContent && !m.reasoningDurationSeconds ? duration : m.reasoningDurationSeconds,
                  }
                : m
            ),
          };
        })
      );
    };

    const scheduleStreamFlush = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(applyStreamBuffer);
    };

    const cancelStreamBuffer = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      applyStreamBuffer();
    };

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
          streamBuf.reasoning += reasoningDelta;
          scheduleStreamFlush();
        },
        onChunk: delta => {
          if (!hasEndedReasoning) {
            hasEndedReasoning = true;
          }
          streamBuf.content += delta;
          scheduleStreamFlush();
        },
      });

      // Flush any tail buffered by rAF before finalizing the message
      cancelStreamBuffer();

      // Finish streaming successfully: clear isStreaming on message and persist latest state to DB
      onUpdateSessions(prev => {
        const nextSessions = prev.map(s => {
          if (s.id === currentSessionId) {
            const nextMsgs = s.messages.map(m =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    isReasoning: false,
                  }
                : m
            );
            return { ...s, messages: nextMsgs, updatedAt: new Date().toISOString() };
          }
          return s;
        });
        db.saveAISessions(nextSessions);
        return nextSessions;
      });
      setIsStreaming(false);
      sound.playTap();
    } catch (err: any) {
      // Preserve any tail still sitting in the animation-frame buffer
      cancelStreamBuffer();
      if (err.name === 'AbortError') {
        console.log('User aborted generation');
        onUpdateSessions(prev => {
          const nextSessions = prev.map(s => {
            if (s.id === currentSessionId) {
              const nextMsgs = s.messages.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      isStreaming: false,
                      isReasoning: false,
                    }
                  : m
              );
              return { ...s, messages: nextMsgs, updatedAt: new Date().toISOString() };
            }
            return s;
          });
          db.saveAISessions(nextSessions);
          return nextSessions;
        });
      } else {
        console.error('Chat error:', err);
        const friendlyError = formatFriendlyAIError(err.message);
        onUpdateSessions(prev => {
          const nextSessions = prev.map(s => {
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
              return { ...s, messages: nextMsgs, updatedAt: new Date().toISOString() };
            }
            return s;
          });
          db.saveAISessions(nextSessions);
          return nextSessions;
        });
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Session & Active Skill Banner */}
      <div className="px-3 py-2 bg-surface/85 backdrop-blur-xl border-b border-line flex items-center justify-between gap-2 shrink-0">
        {/* Skill quick selector button */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              haptics.impactLight();
              setIsSkillPickerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2/80 hover:bg-surface-2 active:scale-95 border border-line hover:border-accent/40 text-ink text-caption font-semibold min-w-0 max-w-[210px] sm:max-w-[260px] transition-all cursor-pointer select-none group shadow-2xs"
            title="点击切换当前对话 AI 角色与专业技能"
          >
            <span className="truncate flex-1 text-left font-bold text-ink">
              {activeSkill?.name || '猫步智能助理'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 group-hover:text-accent transition-colors shrink-0" />
          </button>
        </div>

        {/* Session Controls: Provider badge & New Session */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onGoToProviders}
            className="px-2.5 py-1.5 rounded-full bg-accent/10 text-accent text-caption font-mono font-semibold flex items-center gap-1.5 tactile-press max-w-[150px]"
            title="点击进入模型配置切换端点或模型"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeProvider?.defaultModel ? 'bg-accent animate-pulse' : 'bg-ink-3'} shrink-0`} />
            <span className="truncate">{activeProvider?.defaultModel || '未配置模型'}</span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>

          <Button variant="soft" size="icon-sm" onClick={handleNewSession} title="新建对话">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages List (WeChat Style Bubbles) */}
      <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-4 space-y-4">
        {(!currentSession || currentSession.messages.length === 0) ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-4 py-6">
            {/* Assistant Emblem */}
            <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line text-ink-2 flex items-center justify-center select-none mb-1 font-bold text-sm tracking-wider">
              AI
            </div>

            {/* Title & Greeting */}
            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-headline font-bold text-ink">
                {activeSkill?.name ? `你好！我是${activeSkill.name}` : '你好！我是猫步智能助理'}
              </h3>
              <p className="text-caption text-ink-2 leading-relaxed">
                {activeSkill?.systemPrompt
                  ? (activeSkill.systemPrompt.length > 70 ? activeSkill.systemPrompt.slice(0, 68) + '…' : activeSkill.systemPrompt)
                  : '随时为你解答疑问、撰写文案、编写代码或整理备忘，开启全新的灵感之旅。'}
              </p>
            </div>

            {/* Quick Prompt Starter Cards */}
            <div className="w-full max-w-sm grid grid-cols-2 gap-2 pt-1 text-left">
              {QUICK_STARTERS.map(item => {
                const StarterIcon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      setInputMessage(item.prompt);
                      sound.playTap();
                      haptics.selection();
                      textareaRef.current?.focus();
                    }}
                    className="p-3 rounded-2xl bg-surface border border-line shadow-elev-1 transition-all tactile-press text-left space-y-1 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <StarterIcon className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-caption font-bold text-ink">{item.title}</span>
                    </div>
                    <p className="text-caption text-ink-3 line-clamp-1">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          currentSession.messages.map((msg, idx) => {
            const prev = idx > 0 ? currentSession.messages[idx - 1] : undefined;
            return (
              <React.Fragment key={msg.id || msg.timestamp}>
                {needsTimeDivider(prev, msg) && <TimeDivider ts={msg.timestamp} />}
                <MessageRow
                  msg={msg}
                  copied={copiedMsgId === msg.id}
                  isLiveStream={isStreaming}
                  onCopy={handleCopyFeedback}
                  onGoToProviders={handleGoToProviders}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Bar (WeChat Bottom Textarea) */}
      <div className="p-3 bg-surface/85 backdrop-blur-xl border-t border-line shrink-0 space-y-2">
        {/* Quick Prompts */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pr-6">
          {QUICK_PROMPTS.map(p => (
            <Chip key={p} onClick={() => setInputMessage(p)}>
              {p}
            </Chip>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            rows={1}
            placeholder={`向【${activeSkill?.name ? (activeSkill.name.length > 7 ? activeSkill.name.slice(0, 6) + '…' : activeSkill.name) : '猫步'}】发消息…`}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 min-h-[40px] max-h-[120px] py-2.5 no-scrollbar"
          />

          {isStreaming ? (
            <Button
              variant="danger"
              size="icon"
              onClick={handleStopStreaming}
              title="停止生成"
              className="shrink-0"
            >
              <Square className="w-4 h-4 fill-white" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              title="发送"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Custom Skill Picker Modal / Bottom Sheet */}
      <SkillPickerSheet
        isOpen={isSkillPickerOpen}
        onClose={() => setIsSkillPickerOpen(false)}
        skills={skills}
        activeSkillId={currentSession?.activeSkillId || skills[0]?.id}
        onSelectSkill={handleSelectSkillForSession}
        onGoToSkillsCatalog={onGoToSkills}
      />
    </div>
  );
};
