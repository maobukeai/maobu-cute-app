import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlanItem, SubTask, AccentColor } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { resolveAccent } from '../../utils/theme';
import { Search, X, Target, Plus, ListTodo } from 'lucide-react';
import { generateAIPlan, GeneratedPlanOutput } from '../../utils/ai';
import { Screen, Chip, Button, EmptyState, ProgressRing, AnimatedNumber } from '../ui';
import { PlanCard } from '../plans/PlanCard';
import { PlanFormSheet } from '../plans/PlanFormSheet';
import { AIPlannerSheet } from '../plans/AIPlannerSheet';

/** Confetti loads on first celebration instead of with the tab chunk. */
const fireConfetti = async (colors: string[]) => {
  try {
    const confetti = (await import('canvas-confetti')).default;
    confetti({
      particleCount: 50,
      spread: 62,
      origin: { y: 0.8 },
      colors,
    });
  } catch {
    /* decoration only */
  }
};

/** Hard cap for one render pass — very large lists expand on demand. */
const LIST_RENDER_CAP = 100;

interface PlansTabProps {
  plans: PlanItem[];
  onUpdatePlans: (newPlans: PlanItem[]) => void;
  accentColor: AccentColor;
  onSwitchToAITab?: () => void;
  onSwitchToDashboard?: () => void;
}

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'today', label: '今日' },
  { id: 'pending', label: '进行中' },
  { id: 'completed', label: '已完成' },
] as const;

const CATEGORY_FILTERS = ['life', 'work', 'study', 'health', 'cat'] as const;
const CATEGORY_LABEL: Record<string, string> = {
  life: '生活',
  work: '工作',
  study: '学习',
  health: '健身',
  cat: '萌宠',
};

export const PlansTab: React.FC<PlansTabProps> = ({
  plans,
  onUpdatePlans,
  accentColor,
  onSwitchToAITab,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());

  // Form sheet
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  // AI planner sheet
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [aiDecomposingPlanId, setAiDecomposingPlanId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // ── Statistics ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCount = plans.length;
    const completedCount = plans.filter(p => p.isCompleted).length;
    const pendingCount = totalCount - completedCount;
    const todayDueCount = plans.filter(p => p.dueDate === todayStr && !p.isCompleted).length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { totalCount, completedCount, pendingCount, todayDueCount, percent };
  }, [plans, todayStr]);

  const filterCount = (id: string) => {
    switch (id) {
      case 'all': return stats.totalCount;
      case 'today': return stats.todayDueCount;
      case 'pending': return stats.pendingCount;
      case 'completed': return stats.completedCount;
      default: return plans.filter(p => p.category === id).length;
    }
  };

  // ── Filtering (deferred so typing never blocks the input) ───
  const deferredSearch = useDeferredValue(searchQuery);
  const filteredPlans = useMemo(
    () =>
      plans.filter(plan => {
        if (deferredSearch.trim()) {
          const q = deferredSearch.trim().toLowerCase();
          const match =
            plan.title.toLowerCase().includes(q) ||
            plan.description?.toLowerCase().includes(q) ||
            plan.subtasks.some(st => st.title.toLowerCase().includes(q));
          if (!match) return false;
        }
        if (filter === 'all') return true;
        if (filter === 'today') return plan.dueDate === todayStr;
        if (filter === 'pending') return !plan.isCompleted;
        if (filter === 'completed') return plan.isCompleted;
        return plan.category === filter;
      }),
    [plans, deferredSearch, filter, todayStr]
  );

  const [renderAll, setRenderAll] = useState(false);
  const visiblePlans = renderAll ? filteredPlans : filteredPlans.slice(0, LIST_RENDER_CAP);

  // ── Mutations ───────────────────────────────────────────────
  const persist = (updated: PlanItem[]) => {
    onUpdatePlans(updated);
    db.savePlans(updated);
  };

  const celebrate = useCallback(() => {
    const accentHex = resolveAccent(accentColor).hex;
    fireConfetti([accentHex, '#FFD700', '#0A84FF']);
  }, [accentColor]);

  const handleToggleComplete = useCallback(
    (planId: string) => {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;
      const nextStatus = !plan.isCompleted;
      persist(
        plans.map(p =>
          p.id === planId
            ? {
                ...p,
                isCompleted: nextStatus,
                completedAt: nextStatus ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );

      if (nextStatus) {
        haptics.notificationSuccess();
        sound.playSuccess();
        celebrate();
      } else {
        haptics.selection();
        sound.playTap();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans, celebrate]
  );

  const handleToggleSubtask = useCallback(
    (planId: string, subtaskId: string) => {
      haptics.selection();
      sound.playTap();
      persist(
        plans.map(p => {
          if (p.id === planId) {
            return {
              ...p,
              subtasks: p.subtasks.map(st => (st.id === subtaskId ? { ...st, isDone: !st.isDone } : st)),
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans]
  );

  const handleDeletePlan = useCallback(
    (planId: string) => {
      haptics.impactMedium();
      sound.playTap();
      persist(plans.filter(p => p.id !== planId));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans]
  );

  const handleToggleCollapse = useCallback((planId: string) => {
    setExpandedPlanIds(prev => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }, []);

  const handleEditPlan = useCallback(
    (planId: string) => {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;
      setEditingPlan(plan);
      setShowForm(true);
    },
    [plans]
  );

  const handleSavePlan = (draft: {
    title: string;
    description: string;
    priority: PlanItem['priority'];
    category: string;
    dueDate: string;
    subtasks: SubTask[];
  }) => {
    sound.playTap();
    if (editingPlan) {
      persist(
        plans.map(p =>
          p.id === editingPlan.id
            ? {
                ...p,
                title: draft.title,
                description: draft.description,
                priority: draft.priority,
                category: draft.category,
                dueDate: draft.dueDate || undefined,
                subtasks: draft.subtasks,
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
    } else {
      const newPlan: PlanItem = {
        id: 'p_' + Date.now(),
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        category: draft.category,
        dueDate: draft.dueDate || undefined,
        isCompleted: false,
        subtasks: draft.subtasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist([newPlan, ...plans]);
    }
    setShowForm(false);
    setEditingPlan(null);
  };

  const handleAIDecomposeExisting = useCallback(
    async (planId: string) => {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;
      sound.playTap();
      setAiDecomposingPlanId(plan.id);
      try {
        const activeProvider = db.getAIProviders().find(p => p.isActive);
        const res = await generateAIPlan({
          prompt: `请为已有任务【${plan.title}】细化拆解 3 到 4 个具体执行微步骤`,
          provider: activeProvider,
        });
        const newSubtasks = res.subtasks.map((st, i) => ({
          id: `st_${Date.now()}_${i}`,
          title: st,
          isDone: false,
        }));
        persist(
          plans.map(p =>
            p.id === plan.id
              ? { ...p, subtasks: [...p.subtasks, ...newSubtasks], updatedAt: new Date().toISOString() }
              : p
          )
        );
        sound.playSuccess();
      } catch {
        sound.playError();
        // Errors surface via the AI sheet when user retries; keep card feedback minimal
        haptics.notificationError();
      } finally {
        setAiDecomposingPlanId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans]
  );

  const handleAdoptAIPlan = (result: GeneratedPlanOutput, subtasks: string[]) => {
    sound.playSuccess();
    const finalSubtasks = subtasks.length > 0 ? subtasks : result.subtasks;
    const newPlan: PlanItem = {
      id: 'p_' + Date.now(),
      title: result.title,
      description: result.description,
      priority: result.priority,
      category: result.category,
      dueDate: result.dueDate,
      isCompleted: false,
      subtasks: finalSubtasks.map((st, i) => ({
        id: `st_${Date.now()}_${i}`,
        title: st,
        isDone: false,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist([newPlan, ...plans]);
    setShowAIPlanner(false);
    celebrate();
  };

  const encouragement =
    stats.percent === 100
      ? '全部达成，漂亮！'
      : stats.percent >= 50
      ? '已经完成大半，保持节奏'
      : '迈出轻巧猫步，专注每个小目标';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden cat-bg-canvas">
      <Screen className="max-w-3xl mx-auto w-full">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索任务…"
            className="w-full pl-10 pr-9 py-2.5 text-sub rounded-full bg-surface border border-line text-ink placeholder:text-ink-3 outline-none focus:ring-2 ring-accent/40 shadow-elev-1 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-surface-2 text-ink-3 hover:text-ink tactile-press"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Compact progress hero */}
        <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 mb-3 flex items-center gap-3.5 relative overflow-hidden">
          <div
            className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-accent/10 blur-2xl pointer-events-none"
            aria-hidden
          />
          <ProgressRing value={stats.percent / 100} size={50} stroke={4.5}>
            <span className="text-[11px] font-mono font-bold text-accent">{stats.percent}%</span>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-headline font-bold text-ink">
                {stats.completedCount}
                <span className="text-ink-3 font-semibold text-sub"> / {stats.totalCount}</span>
              </span>
              <AnimatedNumber value={stats.percent} className="text-caption font-semibold text-accent" />%
            </div>
            <p className="text-caption text-ink-2 mt-0.5 leading-snug">{encouragement}</p>
            {stats.todayDueCount > 0 && (
              <p className="text-caption text-warn mt-0.5 font-medium">今天还有 {stats.todayDueCount} 项到期</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onSwitchToAITab !== undefined && (
              <Button variant="soft" size="md" onClick={() => setShowAIPlanner(true)} haptic="medium">
                <Target className="w-4 h-4" />
                <span>智能规划</span>
              </Button>
            )}
            <Button
              variant="primary"
              size="icon"
              onClick={() => {
                setEditingPlan(null);
                setShowForm(true);
              }}
              haptic="medium"
              title="手动添加新计划"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="-mx-4 px-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[...FILTERS.map(f => ({ id: f.id as string, label: f.label })), ...CATEGORY_FILTERS.map(c => ({ id: c, label: CATEGORY_LABEL[c] }))].map(
            f => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                <span className={filter === f.id ? 'text-white/70' : 'text-ink-3'}>{filterCount(f.id)}</span>
              </Chip>
            )
          )}
        </div>

        {/* Plan list */}
        {filteredPlans.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={searchQuery ? '没有匹配的计划' : '这里还没有计划'}
            hint="让 AI 为你规划目标，或手动制定一个新计划"
            actionLabel="新建计划"
            onAction={() => {
              setEditingPlan(null);
              setShowForm(true);
            }}
            className="mt-2"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 mt-1">
            <AnimatePresence>
              {visiblePlans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{
                    type: 'spring', stiffness: 420, damping: 36,
                    delay: Math.min(idx * 0.035, 0.28),
                  }}
                >
                  <PlanCard
                    plan={plan}
                    todayStr={todayStr}
                    isCollapsed={!expandedPlanIds.has(plan.id)}
                    aiDecomposing={aiDecomposingPlanId === plan.id}
                    onToggleCollapse={handleToggleCollapse}
                    onToggleComplete={handleToggleComplete}
                    onToggleSubtask={handleToggleSubtask}
                    onEdit={handleEditPlan}
                    onDelete={handleDeletePlan}
                    onAIDecompose={handleAIDecomposeExisting}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {!renderAll && filteredPlans.length > LIST_RENDER_CAP && (
              <button
                onClick={() => setRenderAll(true)}
                className="w-full py-3 text-caption font-semibold text-ink-2 bg-surface border border-line rounded-2xl tactile-press"
              >
                显示全部 {filteredPlans.length} 条
              </button>
            )}
          </div>
        )}
      </Screen>

      {/* Add / Edit sheet */}
      <PlanFormSheet
        isOpen={showForm}
        editingPlan={editingPlan}
        todayStr={todayStr}
        onClose={() => {
          setShowForm(false);
          setEditingPlan(null);
        }}
        onSave={handleSavePlan}
      />

      {/* AI planner sheet */}
      <AIPlannerSheet
        isOpen={showAIPlanner}
        onClose={() => setShowAIPlanner(false)}
        onAdopt={handleAdoptAIPlan}
        onGoToAISettings={() => onSwitchToAITab?.()}
      />
    </div>
  );
};
