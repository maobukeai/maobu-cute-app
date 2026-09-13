import React, { useState, useEffect, useRef } from 'react';
import {
  PlanItem,
  NoteItem,
  TwoFactorToken,
  AccentColor,
} from '../../types';
import {
  CheckCircle2,
  Circle,
  Edit3,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  StickyNote,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { generateTOTP } from '../../utils/crypto';
import { db } from '../../utils/storage';
import { motion } from 'motion/react';
import { ProgressRing, Button, NowSecondProvider, useNowSecond, remainingSeconds, AnimatedNumber } from '../ui';

/** Entrance stagger wrapper for bento cards. */
const BentoItem: React.FC<{ order: number; children: React.ReactNode; className?: string }> = ({
  order,
  children,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 320, damping: 30, delay: order * 0.07 }}
  >
    {children}
  </motion.div>
);

/** Per-second leaves for the 2FA card — isolated so ticks never re-render the bento body. */
const CountdownSeconds: React.FC = () => {
  const nowSec = useNowSecond();
  return <span className="text-caption font-mono text-ink-3">{remainingSeconds(nowSec, 30)}s</span>;
};

const CountdownRing30: React.FC = () => {
  const nowSec = useNowSecond();
  const remaining = remainingSeconds(nowSec, 30);
  return (
    <ProgressRing
      value={remaining / 30}
      size={36}
      stroke={4}
      color={remaining > 10 ? 'var(--theme-accent)' : 'rgb(244 63 94)'}
    >
      <span className="text-[11px] font-mono font-bold text-ink-2">{remaining}</span>
    </ProgressRing>
  );
};

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

/** Bento card shell */
const BentoCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}> = ({ icon, title, meta, action, children, footer, className = '' }) => (
  <div
    className={`bg-surface rounded-3xl border border-line shadow-elev-1 p-5 flex flex-col transition-all ${className}`}
  >
    <div className="flex items-center justify-between pb-3 border-b border-line/70">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sub font-bold text-ink truncate">{title}</h3>
          {meta && <p className="text-caption text-ink-3 mt-0.5">{meta}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="pt-3.5 flex-1">{children}</div>
    {footer && (
      <div className="pt-3 border-t border-line/70 mt-3.5">{footer}</div>
    )}
  </div>
);

export const DashboardBentoView: React.FC<DashboardBentoViewProps> = ({
  plans,
  onUpdatePlans,
  notes,
  tokens,
  onOpenPlansTab,
  onOpenNotesTab,
  onOpenVaultTab,
  onOpenAITab,
}) => {
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [totpCodes, setTotpCodes] = useState<Record<string, string>>({});

  // Regenerate codes only on time-window rollover; the per-second tick
  // comes from NowSecondProvider and re-renders just the countdown leaves.
  const windowRef = useRef<Record<string, number>>({});
  const nowSec = useNowSecond();

  useEffect(() => {
    let cancelled = false;

    const pending = (tokens || []).filter(t => {
      const period = t.period || 30;
      const win = Math.floor(nowSec / period);
      if (windowRef.current[t.id] === win && totpCodes[t.id]) return false;
      windowRef.current[t.id] = win;
      return true;
    });
    if (pending.length === 0) return;

    (async () => {
      const updates: Record<string, string> = {};
      for (const token of pending) {
        try {
          const res = await generateTOTP(token.secret, token.period || 30, token.digits || 6);
          const code = res.code.length === 6 ? `${res.code.slice(0, 3)} ${res.code.slice(3)}` : res.code;
          updates[token.id] = code;
        } catch {
          updates[token.id] = '------';
        }
      }
      if (!cancelled) {
        setTotpCodes(prev => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nowSec, tokens, totpCodes]);

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

  // Plans statistics
  const totalCount = plans.length;
  const completedCount = plans.filter(p => p.isCompleted).length;
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingCount = totalCount - completedCount;

  const allSubtasks = plans.flatMap(p => p.subtasks || []);
  const completedSubtasks = allSubtasks.filter(s => s.isDone).length;
  const totalSubtasks = allSubtasks.length;

  // Active note
  const activeNote = notes.length > 0 ? notes[0] : null;
  const noteLines = activeNote
    ? activeNote.content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'))
        .slice(0, 4)
    : [];

  const todayLabel = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <NowSecondProvider>
    <div data-header-scroll className="w-full h-full overflow-y-auto no-scrollbar">
      <div className="max-w-6xl mx-auto p-4 flex flex-col gap-4 select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <div>
            <h2 className="text-title font-bold text-ink tracking-tight">看板</h2>
            <p className="text-caption text-ink-3 mt-0.5">{todayLabel}</p>
          </div>
          <Button variant="soft" size="sm" onClick={onOpenPlansTab}>
            <span>进入清单</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          {/* ── Column 1: Daily checklist ─────────────────────── */}
          <BentoItem order={0} className="flex">
          <BentoCard
            icon={<CalendarCheck className="w-4 h-4" />}
            title="今日清单"
            meta={`${pendingCount > 0 ? `待办 ${pendingCount} 项` : '全部完成'}`}
            action={
              <button
                onClick={onOpenPlansTab}
                className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-ink-2 hover:text-ink tactile-press"
                title="管理计划"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            }
            footer={
              <div className="flex items-center gap-4">
                <ProgressRing value={overallPercent / 100} size={52} stroke={5}>
                  <AnimatedNumber value={overallPercent} className="text-caption font-bold text-accent" />%
                </ProgressRing>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-ink-2">已完成</span>
                    <span className="font-semibold text-ink">{completedCount} / {totalCount} 项</span>
                  </div>
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-ink-2">子步骤</span>
                    <span className="font-semibold text-ink">
                      {totalSubtasks > 0 ? `${completedSubtasks} / ${totalSubtasks}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            }
          >
            {plans.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-surface-2/60 border border-dashed border-line space-y-2">
                <p className="text-caption text-ink-2 font-medium">暂无待办，开启全新的一天</p>
                <button
                  onClick={onOpenPlansTab}
                  className="text-caption font-semibold text-accent px-3 py-1 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors"
                >
                  去新建计划
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {plans.slice(0, 5).map(plan => {
                  const subDone = (plan.subtasks || []).filter(s => s.isDone).length;
                  const subTotal = (plan.subtasks || []).length;
                  const progressStr = subTotal > 0 ? `${Math.round((subDone / subTotal) * 100)}%` : null;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleToggleTask(plan.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer tactile-press ${
                        plan.isCompleted
                          ? 'bg-ok/[0.06] border-ok/20'
                          : 'bg-surface-2/50 border-line hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0">
                          {plan.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-ok fill-ok/20" />
                          ) : (
                            <Circle className="w-4 h-4 text-ink-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-caption font-semibold truncate ${
                              plan.isCompleted ? 'line-through text-ink-3' : 'text-ink'
                            }`}
                          >
                            {plan.title}
                          </p>
                          <p className="text-[11px] text-ink-3 mt-0.5">
                            {plan.dueDate ? `截止 ${plan.dueDate}` : '今日待办'}
                          </p>
                        </div>
                      </div>

                      {progressStr && (
                        <span className="shrink-0 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          {progressStr}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </BentoCard>
          </BentoItem>

          {/* ── Column 2: Latest note ─────────────────────────── */}
          <BentoItem order={1} className="flex">
          <BentoCard
            icon={<StickyNote className="w-4 h-4" />}
            title="最新笔记"
            meta={
              activeNote
                ? `${activeNote.category || '灵感'} · ${new Date(activeNote.updatedAt).toLocaleDateString()}`
                : '随手记录灵感'
            }
            action={
              <button
                onClick={onOpenNotesTab}
                className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-ink-2 hover:text-ink tactile-press"
                title="打开笔记"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            }
          >
            {activeNote ? (
              <div className="space-y-2">
                <h4 className="text-headline font-bold text-ink tracking-tight line-clamp-1">
                  {activeNote.title}
                </h4>
                {noteLines.length > 0 ? (
                  <ul className="text-caption space-y-1.5 text-ink-2 leading-relaxed pt-1">
                    {noteLines.map((line, idx) => (
                      <li key={idx} className="line-clamp-2">
                        {line.startsWith('-') || line.startsWith('•') ? line.slice(1).trim() : line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-caption text-ink-3 pt-1">正文暂无内容，点击右上角编辑补充…</p>
                )}
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-surface-2/60 border border-dashed border-line space-y-2">
                <p className="text-caption text-ink-2 font-medium">暂无笔记，随时记录火花</p>
                <button
                  onClick={onOpenNotesTab}
                  className="text-caption font-semibold text-accent px-3 py-1 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors"
                >
                  去写笔记
                </button>
              </div>
            )}

            {/* Quiet link into the assistant */}
            <button
              onClick={onOpenAITab}
              className="mt-4 w-full flex items-center justify-between rounded-2xl border border-line bg-surface-2/50 px-3.5 py-3 text-left tactile-press hover:bg-surface-2 transition-colors"
            >
              <span className="text-caption font-semibold text-ink-2">有问题？问问你的助手</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-3" />
            </button>
          </BentoCard>
          </BentoItem>

          {/* ── Column 3: Security 2FA ────────────────────────── */}
          <BentoItem order={2} className="flex">
          <BentoCard
            icon={<ShieldCheck className="w-4 h-4" />}
            title="2FA 动态口令"
            meta="点击卡片一键复制"
            action={<CountdownSeconds />}
            footer={
              <div className="flex items-center justify-between text-caption">
                <span className="text-ink-3">本地离线 AES-256 加密</span>
                <button
                  onClick={onOpenVaultTab}
                  className="text-accent font-semibold hover:underline flex items-center gap-1 tactile-press"
                >
                  <span>查看安全箱</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            }
          >
            {tokens.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-surface-2/60 border border-dashed border-line space-y-2">
                <p className="text-caption text-ink-2 font-medium">暂无 2FA 动态口令</p>
                <p className="text-[11px] text-ink-3">支持扫码或手动导入</p>
                <button
                  onClick={onOpenVaultTab}
                  className="text-caption font-semibold text-accent px-3 py-1 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors"
                >
                  去添加令牌
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.slice(0, 4).map(token => {
                  const code = totpCodes[token.id] || '------';
                  const isCopied = copiedTokenId === token.id;

                  return (
                    <div
                      key={token.id}
                      onClick={() => handleCopyCode(code, token.id)}
                      className="p-3 rounded-2xl bg-surface-2/50 border border-line hover:bg-surface-2 flex items-center justify-between transition-all cursor-pointer tactile-press"
                      title="点击一键复制验证码"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface border border-line shadow-elev-1 flex items-center justify-center shrink-0">
                          <span className="text-sub font-bold text-accent uppercase">
                            {token.issuer.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-caption font-semibold text-ink truncate">{token.issuer}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sub font-mono font-bold text-ink tracking-wider">
                              {code}
                            </span>
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-ok animate-scale-in" />
                            ) : (
                              <Copy className="w-3 h-3 text-ink-3" />
                            )}
                          </div>
                        </div>
                      </div>

                      <CountdownRing30 />
                    </div>
                  );
                })}
              </div>
            )}
          </BentoCard>
          </BentoItem>
        </div>
      </div>
    </div>
    </NowSecondProvider>
  );
};
