import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlanItem, PriorityLevel } from '../../types';
import { Check, Circle, Calendar, AlertCircle, Clock, Edit3, Trash2, ChevronDown, ListPlus, ListTree, RefreshCw } from 'lucide-react';
import { SwipeableItem } from '../common/SwipeableItem';

const PRIORITY_META: Record<PriorityLevel, { label: string; cls: string }> = {
  urgent: { label: '紧急', cls: 'bg-danger/10 text-danger' },
  high: { label: '重要', cls: 'bg-warn/10 text-warn' },
  medium: { label: '普通', cls: 'bg-surface-2 text-ink-2' },
  low: { label: '日常', cls: 'bg-surface-2 text-ink-3' },
};

const CATEGORY_LABEL: Record<string, string> = {
  life: '生活',
  work: '工作',
  study: '学习',
  health: '健身',
  cat: '萌宠',
};

function DueBadge({ dueDate, isCompleted, todayStr }: { dueDate?: string; isCompleted?: boolean; todayStr: string }) {
  if (!dueDate) return null;

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-ink-3">
        <Calendar className="w-3 h-3" />
        <span>{dueDate}</span>
      </span>
    );
  }

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dueDate < todayStr) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-semibold">
        <AlertCircle className="w-3 h-3" />
        <span>已逾期 {dueDate}</span>
      </span>
    );
  }
  if (dueDate === todayStr) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-warn/10 text-warn font-semibold">
        <Clock className="w-3 h-3" />
        <span>今天截止</span>
      </span>
    );
  }
  if (dueDate === tomorrowStr) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
        <Calendar className="w-3 h-3" />
        <span>明天截止</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-ink-3">
      <Calendar className="w-3 h-3" />
      <span>{dueDate}</span>
    </span>
  );
}

interface PlanCardProps {
  plan: PlanItem;
  todayStr: string;
  isCollapsed: boolean;
  aiDecomposing: boolean;
  onToggleCollapse: (planId: string) => void;
  onToggleComplete: (planId: string) => void;
  onToggleSubtask: (planId: string, subtaskId: string) => void;
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
  onAIDecompose: (planId: string) => void;
}

/** Memoized: while typing in search only the changed rows re-render. */
export const PlanCard = React.memo<PlanCardProps>(function PlanCard({
  plan,
  todayStr,
  isCollapsed,
  aiDecomposing,
  onToggleCollapse,
  onToggleComplete,
  onToggleSubtask,
  onEdit,
  onDelete,
  onAIDecompose,
}) { 
  const hasSubtasks = plan.subtasks && plan.subtasks.length > 0;
  const subtasksDoneCount = plan.subtasks?.filter(st => st.isDone).length || 0;
  const subtasksTotal = plan.subtasks?.length || 0;
  const subtasksPercent = subtasksTotal > 0 ? Math.round((subtasksDoneCount / subtasksTotal) * 100) : 0;
  const priority = PRIORITY_META[plan.priority] ?? PRIORITY_META.medium;

  return (
    <SwipeableItem
      leftAction={{
        label: plan.isCompleted ? '标为待办' : '达成完成',
        icon: <Check className="w-4 h-4 text-white" />,
        colorClass: plan.isCompleted ? 'bg-zinc-600 text-white' : 'bg-accent text-white',
        onTrigger: () => onToggleComplete(plan.id),
      }}
      rightActions={[
        {
          label: '编辑',
          icon: <Edit3 className="w-3.5 h-3.5 text-white" />,
          colorClass: 'bg-blue-500 text-white',
          onClick: () => onEdit(plan.id),
        },
        {
          label: '删除',
          icon: <Trash2 className="w-3.5 h-3.5 text-white" />,
          colorClass: 'bg-danger text-white',
          onClick: () => onDelete(plan.id),
        },
      ]}
      className="rounded-2xl h-full"
    >
      <div
        onClick={() => onEdit(plan.id)}
        className={`bg-surface rounded-2xl border p-4 cursor-pointer transition-all duration-200 h-full flex flex-col ${
          plan.isCompleted
            ? 'opacity-60 border-line'
            : plan.priority === 'urgent'
            ? 'border-danger/25 shadow-elev-1'
            : 'border-line shadow-elev-1'
        }`}
      >
        <div className="flex items-start space-x-3">
          {/* Checkbox */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggleComplete(plan.id);
            }}
            className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90"
            title={plan.isCompleted ? '标记为未完成' : '标记为已完成'}
          >
            {plan.isCompleted ? (
              <Circle className="w-6 h-6 text-accent fill-accent/25" strokeWidth={2.2} />
            ) : (
              <Circle className="w-6 h-6 text-ink-3 hover:text-accent transition-colors" strokeWidth={1.8} />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                <h3
                  className={`text-sub font-semibold break-words leading-snug ${
                    plan.isCompleted ? 'line-through text-ink-3' : 'text-ink'
                  }`}
                >
                  {plan.title}
                </h3>
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${priority.cls}`}>
                    {priority.label}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-ink-2">
                    {CATEGORY_LABEL[plan.category] ?? plan.category}
                  </span>
                  <DueBadge dueDate={plan.dueDate} isCompleted={plan.isCompleted} todayStr={todayStr} />
                </div>
              </div>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(plan.id);
                }}
                className="p-1.5 text-ink-3 hover:text-ink rounded-lg hover:bg-surface-2 transition tactile-press shrink-0"
                title="编辑计划"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {plan.description && (
              <p className="text-caption text-ink-2 mt-2 leading-relaxed break-words line-clamp-3">
                {plan.description}
              </p>
            )}

            {/* Subtasks */}
            {hasSubtasks && (
              <div className="mt-3 pt-2.5 border-t border-line/70">
                <div
                  onClick={e => {
                    e.stopPropagation();
                    onToggleCollapse(plan.id);
                  }}
                  className="flex items-center justify-between py-0.5 cursor-pointer select-none"
                >
                  <span className="text-caption font-semibold text-ink-2">
                    子步骤 ({subtasksDoneCount}/{subtasksTotal})
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-ink-3 transition-transform duration-200 ${
                      isCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </div>

                {/* Sub-progress bar */}
                <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden mt-1.5">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={false}
                    animate={{ width: `${subtasksPercent}%` }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 mt-2">
                        {plan.subtasks.map(st => (
                          <div
                            key={st.id}
                            onClick={e => {
                              e.stopPropagation();
                              onToggleSubtask(plan.id, st.id);
                            }}
                            className="flex items-start space-x-2.5 p-2 rounded-xl bg-surface-2/60 hover:bg-surface-2 transition cursor-pointer"
                          >
                            <span
                              className={`mt-0.5 w-4 h-4 rounded-[5px] flex items-center justify-center border transition-all shrink-0 ${
                                st.isDone
                                  ? 'bg-accent border-accent'
                                  : 'border-ink-3/50 bg-surface'
                              }`}
                            >
                              {st.isDone && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
                            </span>
                            <span
                              className={`text-caption flex-1 break-words leading-relaxed ${
                                st.isDone ? 'line-through text-ink-3' : 'text-ink-2'
                              }`}
                            >
                              {st.title}
                            </span>
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-1 text-caption">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onEdit(plan.id);
                            }}
                            className="text-ink-3 hover:text-accent flex items-center gap-1 transition tactile-press font-medium"
                          >
                            <ListPlus className="w-3 h-3" />
                            <span>管理步骤</span>
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onAIDecompose(plan.id);
                            }}
                            disabled={aiDecomposing}
                            className="text-accent flex items-center gap-1 transition tactile-press disabled:opacity-50 font-semibold"
                          >
                            {aiDecomposing ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <ListTree className="w-3 h-3" />
                            )}
                            <span>{aiDecomposing ? '拆解中…' : '智能拆解'}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </SwipeableItem>
  );
});