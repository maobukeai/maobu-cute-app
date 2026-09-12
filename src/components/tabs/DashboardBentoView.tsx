import React, { useState, useEffect } from 'react';
import {
  PlanItem,
  NoteItem,
  TwoFactorToken,
  AccentColor,
} from '../../types';
import {
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  StickyNote,
  Plus,
} from 'lucide-react';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { generateTOTP } from '../../utils/crypto';
import { db } from '../../utils/storage';

interface DashboardBentoViewProps {
  plans: PlanItem[];
  onUpdatePlans: (plans: PlanItem[]) => void;
  notes: NoteItem[];
  onUpdateNotes: (notes: NoteItem[]) => void;
  tokens: TwoFactorToken[];
  accentColor: AccentColor;
  onOpenPlansTab: () => void;
  onOpenNotesTab: () => void;
  onOpenVaultTab: () => void;
  onOpenAITab: () => void;
}

export const DashboardBentoView: React.FC<DashboardBentoViewProps> = ({
  plans,
  onUpdatePlans,
  notes,
  onUpdateNotes,
  tokens,
  accentColor,
  onOpenPlansTab,
  onOpenNotesTab,
  onOpenVaultTab,
  onOpenAITab,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [totpCodes, setTotpCodes] = useState<Record<string, string>>({});
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiInsightText, setAiInsightText] = useState(
    '🐾 猫步全景助手已就绪：正在结合你的待办进展与最新笔记，为你自动提炼今日行动重点与专注节奏...'
  );

  // Real 2FA TOTP Generation & Countdown Timer
  useEffect(() => {
    let isMounted = true;

    const updateTotp = async () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      if (isMounted) setSecondsLeft(remaining);

      if (tokens && tokens.length > 0) {
        const newCodes: Record<string, string> = {};
        for (const token of tokens) {
          try {
            const res = await generateTOTP(token.secret, token.period || 30, token.digits || 6);
            // Format 6 digits with space (e.g. "123 456")
            const code = res.code.length === 6 ? `${res.code.slice(0, 3)} ${res.code.slice(3)}` : res.code;
            newCodes[token.id] = code;
          } catch {
            newCodes[token.id] = '------';
          }
        }
        if (isMounted) setTotpCodes(newCodes);
      }
    };

    updateTotp();
    const interval = setInterval(updateTotp, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tokens]);

  const handleCopyCode = (code: string, tokenId: string) => {
    const raw = code.replace(/\s+/g, '');
    if (!raw || raw === '------') return;
    haptics.impactMedium();
    sound.playTap();
    navigator.clipboard.writeText(raw);
    setCopiedTokenId(tokenId);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handleToggleTask = (id: string) => {
    haptics.impactLight();
    sound.playSuccess();
    const updated = plans.map(p => {
      if (p.id === id) {
        return { ...p, isCompleted: !p.isCompleted, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    onUpdatePlans(updated);
    db.savePlans(updated);
  };

  const handleAiAction = (action: 'enhance' | 'suggest') => {
    haptics.impactMedium();
    sound.playTap();
    setAiGenerating(true);

    const pendingCount = plans.filter(p => !p.isCompleted).length;
    const completedCount = plans.filter(p => p.isCompleted).length;
    const latestNoteTitle = notes.length > 0 ? `「${notes[0].title}」` : '最新灵感';

    setTimeout(() => {
      if (action === 'enhance') {
        setAiInsightText(
          `💡 智能洞察：基于当前 ${latestNoteTitle} 与待办进度，已为你提炼核心行动链。建议优先攻克首要任务，并做好本地安全凭据归档。`
        );
      } else {
        if (pendingCount === 0) {
          setAiInsightText('🎉 太棒了！今日所有待办均已达成，可以泡一杯红茶、摸摸猫猫享受惬意时光喵~');
        } else {
          setAiInsightText(
            `🐾 建议节奏：今日已达成 ${completedCount} 项，尚有 ${pendingCount} 项待办。保持敏捷专注，完成后记得在安全箱核对 2FA 凭据！`
          );
        }
      }
      setAiGenerating(false);
    }, 600);
  };

  // Real Plans Statistics Calculation
  const totalCount = plans.length;
  const completedCount = plans.filter(p => p.isCompleted).length;
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const allSubtasks = plans.flatMap(p => p.subtasks || []);
  const completedSubtasks = allSubtasks.filter(s => s.isDone).length;
  const totalSubtasks = allSubtasks.length;
  const subtasksRatioStr = totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks}` : `${completedCount}/${totalCount}`;
  const subtasksPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : overallPercent;

  // Real Active Note
  const activeNote = notes.length > 0 ? notes[0] : null;
  const noteLines = activeNote
    ? activeNote.content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'))
        .slice(0, 4)
    : [];

  return (
    <div className="w-full h-full p-3 sm:p-4 lg:p-6 overflow-y-auto flex flex-col justify-start gap-4 select-none max-w-7xl mx-auto">
      {/* Top Header Tag */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center space-x-2.5">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>🐾 灵动流体全景看板</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
              Bento Grid
            </span>
          </span>
          <span className="text-xs text-zinc-400 hidden md:inline">
            macOS Sequoia & iOS 18 灵感 · 三栏沉浸式生产力中心
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={onOpenPlansTab}
            className="text-zinc-600 dark:text-zinc-300 hover:text-rose-500 flex items-center gap-1 px-3 py-1 rounded-full bg-white/70 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs transition-colors tactile-press"
          >
            <span>进入清单详情</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3-Column Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 flex-1 items-stretch">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: Daily Checklist (今日待办清单)                                  */}
        {/* ========================================================================= */}
        <div className="bg-white/80 dark:bg-[#151520]/80 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between space-y-4 transition-all">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Daily Checklist
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                  <span>Today, {new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                </p>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={onOpenPlansTab}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs tactile-press"
                  title="管理计划"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm ml-1">🐾</span>
              </div>
            </div>

            {/* Checklist Items: Real Data */}
            <div className="space-y-2.5 pt-3.5">
              {plans.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-2xl">📝</span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    暂无待办事项，开启全新的一天
                  </p>
                  <button
                    onClick={onOpenPlansTab}
                    className="px-3 py-1 text-xs rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors font-medium"
                  >
                    新建计划 🐾
                  </button>
                </div>
              ) : (
                plans.slice(0, 5).map(plan => {
                  const subDone = (plan.subtasks || []).filter(s => s.isDone).length;
                  const subTotal = (plan.subtasks || []).length;
                  const progressStr = subTotal > 0 ? `${Math.round((subDone / subTotal) * 100)}%` : null;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleToggleTask(plan.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer tactile-press ${
                        plan.isCompleted
                          ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-50/80 dark:bg-white/[0.03] border-black/[0.04] dark:border-white/[0.06] hover:bg-zinc-100/70 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button className="shrink-0 text-emerald-500">
                          {plan.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${plan.isCompleted ? 'line-through opacity-70' : ''}`}>
                            {plan.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {plan.dueDate ? `截止: ${plan.dueDate}` : '今日待办'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center space-x-1.5 ml-2">
                        {progressStr && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            {progressStr}
                          </span>
                        )}
                        <span className="text-xs opacity-60">🐾</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Progress Rings Trio: Computed with Accurate Math */}
          <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.08] grid grid-cols-3 gap-2">
            {/* Ring 1: Overall completion */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-50 dark:bg-white/[0.02]">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-zinc-200 dark:text-zinc-700" strokeWidth="3.2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path strokeWidth="3.2" strokeDasharray={`${overallPercent}, 100`} strokeLinecap="round" stroke="#FF6080" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-rose-500">{overallPercent}%</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">总达成度</span>
            </div>

            {/* Ring 2: Subtasks ratio */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-50 dark:bg-white/[0.02]">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-zinc-200 dark:text-zinc-700" strokeWidth="3.2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path strokeWidth="3.2" strokeDasharray={`${subtasksPercent}, 100`} strokeLinecap="round" stroke="#00C781" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-emerald-500">{subtasksRatioStr}</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">微步完成</span>
            </div>

            {/* Ring 3: Plans done count */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-50 dark:bg-white/[0.02]">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-zinc-200 dark:text-zinc-700" strokeWidth="3.2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path strokeWidth="3.2" strokeDasharray={`${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}, 100`} strokeLinecap="round" stroke="#0A84FF" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-blue-500">{completedCount}/{totalCount}</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">计划进度</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: Markdown Note & Translucent AI Floating Island                   */}
        {/* ========================================================================= */}
        <div className="bg-[#12131C] text-zinc-100 rounded-3xl p-4 sm:p-5 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between relative overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-44 h-44 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <StickyNote className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Markdown Note
                </span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-400">
                <button
                  onClick={onOpenNotesTab}
                  className="p-1 hover:text-white transition-colors"
                  title="全屏编辑笔记"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Note Content: Real active note */}
            <div className="pt-3 space-y-2">
              {activeNote ? (
                <>
                  <h4 className="text-base font-bold text-white tracking-tight line-clamp-1">
                    {activeNote.title}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-medium">
                      {activeNote.category || '灵感'}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(activeNote.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {noteLines.length > 0 ? (
                    <ul className="text-xs space-y-1.5 text-zinc-300 font-sans leading-relaxed pt-1">
                      {noteLines.map((line, idx) => (
                        <li key={idx} className="line-clamp-2 text-zinc-300/90">
                          {line.startsWith('-') || line.startsWith('•') ? line : `• ${line}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-400 italic pt-1">点击右上角全屏编辑补充笔记详情...</p>
                  )}
                </>
              ) : (
                <div className="p-5 text-center rounded-2xl bg-white/[0.04] border border-dashed border-white/10 space-y-2">
                  <span className="text-2xl">✨</span>
                  <p className="text-xs text-zinc-300 font-medium">
                    暂无灵感备忘录，随时记录火花
                  </p>
                  <button
                    onClick={onOpenNotesTab}
                    className="px-3 py-1 text-xs rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors font-medium"
                  >
                    新建笔记 📝
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FLOATING TRANSLUCENT MAOBU AI REASONING CARD */}
          <div className="mt-4 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-3.5 shadow-2xl space-y-2.5 relative z-10 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm">🐾</span>
                <span className="text-xs font-bold text-white tracking-wide">MAOBU AI</span>
                {aiGenerating && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <button
                onClick={onOpenAITab}
                className="text-[10px] text-zinc-300 hover:text-white flex items-center gap-0.5 tactile-press"
              >
                <span>会话</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 rounded-full animate-pulse" />
            </div>

            <p className="text-[11px] text-zinc-200 leading-snug font-sans">
              {aiInsightText}
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => handleAiAction('enhance')}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-[11px] font-semibold text-center tactile-press shadow-xs transition-all"
              >
                Enhance 洞察
              </button>
              <button
                onClick={() => handleAiAction('suggest')}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[11px] font-semibold text-center tactile-press shadow-xs transition-all"
              >
                Suggest 建议
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: Security (2FA) (2FA 动态令牌速查卡片)                           */}
        {/* ========================================================================= */}
        <div className="bg-white/80 dark:bg-[#151520]/80 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between space-y-4 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Security (2FA)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-400 font-mono">
                  {secondsLeft}s 刷新
                </span>
                <span className="text-sm">🐾</span>
              </div>
            </div>

            {/* Real 2FA Tokens List */}
            <div className="space-y-2.5 pt-3.5">
              {tokens.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-2xl">🛡️</span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    暂无 2FA 动态口令，保障账号安全
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    支持 Google / 微软 2FA 扫码或手动导入
                  </p>
                  <button
                    onClick={onOpenVaultTab}
                    className="px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium"
                  >
                    添加 2FA 令牌 🔐
                  </button>
                </div>
              ) : (
                tokens.slice(0, 4).map(token => {
                  const code = totpCodes[token.id] || '------';
                  const isCopied = copiedTokenId === token.id;

                  return (
                    <div
                      key={token.id}
                      onClick={() => handleCopyCode(code, token.id)}
                      className="p-3 rounded-2xl bg-zinc-50/90 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] hover:bg-zinc-100/80 dark:hover:bg-white/[0.06] flex items-center justify-between transition-all cursor-pointer tactile-press group shadow-2xs"
                      title="点击一键复制 6 位验证码"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 shadow-xs flex items-center justify-center text-sm border border-black/[0.05] dark:border-white/[0.05] shrink-0">
                          {token.issuer.toLowerCase().includes('google')
                            ? '🌐'
                            : token.issuer.toLowerCase().includes('microsoft') || token.issuer.toLowerCase().includes('outlook')
                            ? '🪟'
                            : token.issuer.toLowerCase().includes('github')
                            ? '🐙'
                            : token.issuer.toLowerCase().includes('discord')
                            ? '💬'
                            : '🔐'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {token.issuer}
                          </p>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 tracking-wider">
                              {code}
                            </span>
                            {isCopied && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-white font-bold animate-scale-in">
                                已复制
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remaining seconds progress circle */}
                      <div className="relative w-8 h-8 flex items-center justify-center shrink-0 ml-2">
                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-zinc-200 dark:text-zinc-700"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            strokeWidth="3.5"
                            strokeDasharray={`${(secondsLeft / 30) * 100}, 100`}
                            strokeLinecap="round"
                            stroke={secondsLeft > 10 ? '#00C781' : '#FF6080'}
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                          {secondsLeft}s
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between text-xs">
            <span className="text-[11px] text-zinc-400">
              本地离线 AES-256 加密
            </span>
            <button
              onClick={onOpenVaultTab}
              className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1 tactile-press"
            >
              <span>查看密码箱</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
