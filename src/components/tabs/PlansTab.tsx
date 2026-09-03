import React, { useState } from 'react';
import { PlanItem, PriorityLevel, PlanCategory, AccentColor, SubTask } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  X,
  Sparkles,
  ListTodo,
  RefreshCw,
  Wand2,
  ArrowRight,
  Check,
} from 'lucide-react';
import { generateAIPlan, GeneratedPlanOutput } from '../../utils/ai';

interface PlansTabProps {
  plans: PlanItem[];
  onUpdatePlans: (newPlans: PlanItem[]) => void;
  accentColor: AccentColor;
}

export const PlansTab: React.FC<PlansTabProps> = ({
  plans,
  onUpdatePlans,
  accentColor,
}) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'pending' | 'completed' | string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('medium');
  const [formCategory, setFormCategory] = useState<string>('life');
  const [formDueDate, setFormDueDate] = useState('');
  const [formSubtasks, setFormSubtasks] = useState<Array<{ id: string; title: string; isDone: boolean }>>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // AI Planner Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGoalInput, setAiGoalInput] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<GeneratedPlanOutput | null>(null);
  const [aiDecomposingPlanId, setAiDecomposingPlanId] = useState<string | null>(null);
  const [isFormAIAssisting, setIsFormAIAssisting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Open AI Planner modal
  const handleOpenAIPlanner = () => {
    sound.playTap();
    setAiGoalInput('');
    setAiPlanResult(null);
    setShowAIModal(true);
  };

  // Generate Plan via AI
  const handleRunAIPlan = async (quickPrompt?: string) => {
    const text = quickPrompt || aiGoalInput;
    if (!text.trim()) {
      alert('请先输入你想规划的目标或愿望想法');
      return;
    }
    if (quickPrompt) setAiGoalInput(quickPrompt);

    sound.playTap();
    setIsAIGenerating(true);
    try {
      const activeProvider = db.getAIProviders().find(p => p.isActive);
      const res = await generateAIPlan({ prompt: text, provider: activeProvider });
      setAiPlanResult(res);
      sound.playSuccess();
    } catch (err: any) {
      alert(`AI 规划提示: ${err.message}`);
    } finally {
      setIsAIGenerating(false);
    }
  };

  // Adopt AI Plan into Task List
  const handleAdoptAIPlan = () => {
    if (!aiPlanResult) return;
    sound.playSuccess();

    const newPlan: PlanItem = {
      id: 'p_' + Date.now(),
      title: aiPlanResult.title,
      description: aiPlanResult.description,
      priority: aiPlanResult.priority,
      category: aiPlanResult.category,
      dueDate: aiPlanResult.dueDate,
      isCompleted: false,
      subtasks: aiPlanResult.subtasks.map((st, i) => ({
        id: `st_${Date.now()}_${i}`,
        title: st,
        isDone: false,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newPlan, ...plans];
    onUpdatePlans(updated);
    db.savePlans(updated);
    setShowAIModal(false);
    setAiPlanResult(null);
    setAiGoalInput('');

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#AF52DE', '#FF6B8B', '#07C160'],
    });
  };

  // On-card decompose existing task
  const handleAIDecomposeExisting = async (plan: PlanItem, e: React.MouseEvent) => {
    e.stopPropagation();
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

      const updated = plans.map(p => {
        if (p.id === plan.id) {
          return {
            ...p,
            subtasks: [...p.subtasks, ...newSubtasks],
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });

      onUpdatePlans(updated);
      db.savePlans(updated);
      sound.playSuccess();
    } catch (err: any) {
      alert(`拆解失败: ${err.message}`);
    } finally {
      setAiDecomposingPlanId(null);
    }
  };

  // In manual form: AI auto-fill
  const handleFormAIAssist = async () => {
    if (!formTitle.trim()) {
      alert('请先在标题输入框输入简短的计划想法（例如：带猫咪洗澡、复习考研单词）');
      return;
    }
    sound.playTap();
    setIsFormAIAssisting(true);

    try {
      const activeProvider = db.getAIProviders().find(p => p.isActive);
      const res = await generateAIPlan({ prompt: formTitle, provider: activeProvider });
      setFormTitle(res.title);
      setFormDesc(res.description);
      setFormPriority(res.priority);
      setFormCategory(res.category);
      if (res.dueDate) setFormDueDate(res.dueDate);
      if (res.subtasks && res.subtasks.length > 0) {
        const generatedSt = res.subtasks.map((st, i) => ({
          id: `st_${Date.now()}_${i}`,
          title: st,
          isDone: false,
        }));
        setFormSubtasks(prev => [...prev, ...generatedSt]);
      }
      sound.playSuccess();
    } catch (err: any) {
      alert(`帮写失败: ${err.message}`);
    } finally {
      setIsFormAIAssisting(false);
    }
  };

  // Filter plans
  const filteredPlans = plans.filter(plan => {
    if (filter === 'all') return true;
    if (filter === 'today') return plan.dueDate === todayStr;
    if (filter === 'pending') return !plan.isCompleted;
    if (filter === 'completed') return plan.isCompleted;
    return plan.category === filter;
  });

  // Calculate statistics
  const totalCount = plans.length;
  const completedCount = plans.filter(p => p.isCompleted).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle plan completion
  const handleToggleComplete = (planId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const updated = plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          isCompleted: nextStatus,
          completedAt: nextStatus ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    onUpdatePlans(updated);
    db.savePlans(updated);

    if (nextStatus) {
      sound.playSuccess();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#07C160', '#FF6B8B', '#007AFF', '#FFD700'],
      });
    } else {
      sound.playTap();
    }
  };

  // Toggle subtask completion
  const handleToggleSubtask = (planId: string, subtaskId: string) => {
    sound.playTap();
    const updated = plans.map(p => {
      if (p.id === planId) {
        const nextSubtasks = p.subtasks.map(st =>
          st.id === subtaskId ? { ...st, isDone: !st.isDone } : st
        );
        return { ...p, subtasks: nextSubtasks, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    onUpdatePlans(updated);
    db.savePlans(updated);
  };

  // Delete plan
  const handleDeletePlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    const updated = plans.filter(p => p.id !== planId);
    onUpdatePlans(updated);
    db.savePlans(updated);
  };

  // Open Add / Edit Modal
  const handleOpenAdd = () => {
    setEditingPlan(null);
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormCategory('life');
    setFormDueDate(todayStr);
    setFormSubtasks([]);
    setNewSubtaskTitle('');
    setShowModal(true);
  };

  const handleOpenEdit = (plan: PlanItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlan(plan);
    setFormTitle(plan.title);
    setFormDesc(plan.description || '');
    setFormPriority(plan.priority);
    setFormCategory(plan.category);
    setFormDueDate(plan.dueDate || '');
    setFormSubtasks([...plan.subtasks]);
    setNewSubtaskTitle('');
    setShowModal(true);
  };

  // Add Subtask to form
  const handleAddSubtaskToForm = () => {
    if (!newSubtaskTitle.trim()) return;
    setFormSubtasks([
      ...formSubtasks,
      { id: 'st_' + Date.now(), title: newSubtaskTitle.trim(), isDone: false },
    ]);
    setNewSubtaskTitle('');
    sound.playTap();
  };

  // Remove Subtask from form
  const handleRemoveSubtaskFromForm = (id: string) => {
    setFormSubtasks(formSubtasks.filter(st => st.id !== id));
    sound.playTap();
  };

  // Save Plan form
  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    sound.playTap();

    let updated: PlanItem[];
    if (editingPlan) {
      updated = plans.map(p => {
        if (p.id === editingPlan.id) {
          return {
            ...p,
            title: formTitle.trim(),
            description: formDesc.trim(),
            priority: formPriority,
            category: formCategory,
            dueDate: formDueDate || undefined,
            subtasks: formSubtasks,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
    } else {
      const newPlan: PlanItem = {
        id: 'p_' + Date.now(),
        title: formTitle.trim(),
        description: formDesc.trim(),
        priority: formPriority,
        category: formCategory,
        dueDate: formDueDate || undefined,
        isCompleted: false,
        subtasks: formSubtasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newPlan, ...plans];
    }

    onUpdatePlans(updated);
    db.savePlans(updated);
    setShowModal(false);
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 font-semibold">紧急</span>;
      case 'high':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 font-semibold">重要</span>;
      case 'medium':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-medium">普通</span>;
      case 'low':
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">日常</span>;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'cat': return '🐱 萌宠';
      case 'work': return '💼 工作';
      case 'study': return '📚 学习';
      case 'health': return '🏃 健身';
      case 'life':
      default: return '🌸 生活';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#EDEDED] dark:bg-[#111111]">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        {/* Daily Motivation & Progress Card (Apple Health/WeChat Moment style) */}
        <div className="glass-card p-3.5 rounded-2xl shadow-ios border border-white/60 dark:border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">今日成就进度</span>
              <span className="text-[11px] font-bold text-[#07C160]">
                {completedCount}/{totalCount} 项
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {progressPercent === 100 ? '太棒了！今天计划全部达成！🎉🐾' : '迈出猫步，专注完成每一个微小目标~'}
            </p>
            {/* Progress bar */}
            <div className="w-44 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-[#07C160] to-[#FF6B8B] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* AI Assistant Generator */}
            <button
              onClick={handleOpenAIPlanner}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 hover:from-purple-600 hover:to-rose-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-transform"
              title="AI 智能规划任务"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>AI 规划</span>
            </button>

            {/* Manual Add Button */}
            <button
              onClick={handleOpenAdd}
              className="flex flex-col items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#07C160] to-[#06AD56] text-white shadow-md active:scale-95 transition-transform"
              title="手动添加新计划"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills (iOS Segmented Style) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: '全部' },
            { id: 'today', label: '📅 今日' },
            { id: 'pending', label: '⏳ 进行中' },
            { id: 'completed', label: '✅ 已完成' },
            { id: 'cat', label: '🐱 萌宠' },
            { id: 'work', label: '💼 工作' },
            { id: 'study', label: '📚 学习' },
            { id: 'health', label: '🏃 健身' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                sound.playTap();
                setFilter(tab.id);
              }}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium ${
                filter === tab.id
                  ? 'bg-[#07C160] text-white shadow-sm'
                  : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Plan List */}
        {filteredPlans.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 select-none">
            <div className="w-16 h-16 rounded-full bg-zinc-200/70 dark:bg-zinc-800/70 flex items-center justify-center text-2xl">
              🐾
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">这里暂时空空如也喵~</p>
            <button
              onClick={handleOpenAdd}
              className="text-xs text-[#07C160] font-semibold hover:underline"
            >
              + 制定第一条猫步计划
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredPlans.map(plan => {
              const hasSubtasks = plan.subtasks && plan.subtasks.length > 0;
              const subtasksDoneCount = plan.subtasks?.filter(st => st.isDone).length || 0;

              return (
                <div
                  key={plan.id}
                  className={`glass-card p-3 rounded-2xl shadow-ios border transition-all duration-200 ${
                    plan.isCompleted
                      ? 'border-zinc-200/50 dark:border-zinc-800/50 opacity-60'
                      : 'border-white/70 dark:border-zinc-800/80 hover:shadow-ios-hover'
                  }`}
                >
                  <div className="flex items-start justify-between space-x-2">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(plan.id, plan.isCompleted)}
                      className="mt-0.5 p-1 rounded-full text-zinc-400 hover:text-[#07C160] transition-colors"
                    >
                      {plan.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[#07C160] fill-[#E8F8F0] dark:fill-transparent" />
                      ) : (
                        <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3
                          className={`text-sm font-semibold truncate ${
                            plan.isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {plan.title}
                        </h3>
                        {getPriorityBadge(plan.priority)}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {getCategoryLabel(plan.category)}
                        </span>
                      </div>

                      {plan.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {plan.description}
                        </p>
                      )}

                      {/* Subtasks Progress */}
                      {hasSubtasks && (
                        <div className="mt-2 pl-1 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-1">
                          <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                            <span>子步骤 ({subtasksDoneCount}/{plan.subtasks.length})</span>
                          </div>
                          {plan.subtasks.map(st => (
                            <div
                              key={st.id}
                              onClick={() => handleToggleSubtask(plan.id, st.id)}
                              className="flex items-center space-x-1.5 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none"
                            >
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border ${st.isDone ? 'bg-[#07C160] border-[#07C160] text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                {st.isDone ? '✓' : ''}
                              </span>
                              <span className={st.isDone ? 'line-through text-zinc-400' : ''}>
                                {st.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer meta: Due date */}
                      <div className="flex items-center space-x-3 mt-2 text-[10px] text-zinc-400">
                        {plan.dueDate && (
                          <span className={`flex items-center space-x-1 ${plan.dueDate < todayStr && !plan.isCompleted ? 'text-red-500 font-semibold' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            <span>
                              {plan.dueDate === todayStr ? '今天截止' : plan.dueDate}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-0.5 shrink-0">
                      <button
                        onClick={e => handleAIDecomposeExisting(plan, e)}
                        disabled={aiDecomposingPlanId === plan.id}
                        className="p-1.5 text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                        title="AI 智能拆解执行微步骤"
                      >
                        {aiDecomposingPlanId === plan.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={e => handleOpenEdit(plan, e)}
                        className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => handleDeletePlan(plan.id, e)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal animate-scale-in border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingPlan ? '编辑计划' : '制定新计划 🐾'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-3 space-y-3">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">计划目标 *</label>
                  <button
                    type="button"
                    onClick={handleFormAIAssist}
                    disabled={isFormAIAssisting}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center space-x-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isFormAIAssisting ? 'AI 正在构思拆解...' : '✨ AI 智能帮写并拆解'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="例如：完成猫咪疫苗预约、阅读 1 章书..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#07C160] text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">详情备注</label>
                <textarea
                  rows={2}
                  placeholder="填写具体要求或行动备忘..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#07C160] text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">优先级</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as PriorityLevel)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#07C160] text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="urgent">🚨 紧急</option>
                    <option value="high">🔥 重要</option>
                    <option value="medium">⚡ 普通</option>
                    <option value="low">🌱 日常</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">分类</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#07C160] text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="life">🌸 生活</option>
                    <option value="cat">🐱 萌宠</option>
                    <option value="work">💼 工作</option>
                    <option value="study">📚 学习</option>
                    <option value="health">🏃 健身</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">截止日期</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={e => setFormDueDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#07C160] text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Subtasks builder */}
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">子步骤拆解</label>
                <div className="flex space-x-2 mt-1">
                  <input
                    type="text"
                    placeholder="输入子步骤并按添加..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtaskToForm();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtaskToForm}
                    className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold rounded-xl text-zinc-800 dark:text-zinc-200"
                  >
                    添加
                  </button>
                </div>

                {formSubtasks.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                    {formSubtasks.map(st => (
                      <div key={st.id} className="flex items-center justify-between px-2 py-1 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs">
                        <span className="truncate text-zinc-700 dark:text-zinc-300">{st.title}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtaskFromForm(st.id)}
                          className="text-zinc-400 hover:text-red-500 text-xs ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#07C160] hover:bg-[#06AD56] text-white shadow-md transition"
                >
                  保存计划
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Smart Planner Assistant Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 w-full max-w-md shadow-2xl border border-white/80 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-400 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    猫步 AI 智能规划助手
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  输入你的想法或愿望，AI 自动拆解可行步骤并设定优先级与排期
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setAiPlanResult(null);
                }}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                你的目标或想法
              </label>
              <textarea
                rows={3}
                value={aiGoalInput}
                onChange={e => setAiGoalInput(e.target.value)}
                placeholder="例如：制定 7 天低碳减脂运动方案、周末带猫咪做全面体检、攻坚 React 19 核心全栈架构..."
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-purple-500 text-zinc-900 dark:text-zinc-100 transition leading-relaxed"
              />
            </div>

            {/* Quick Inspiration Pills */}
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-medium">✨ 快捷灵感推荐：</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🐱 萌宠全套驱虫体检与护理',
                  '💻 React 19 核心架构研发攻坚',
                  '📚 考研 / 雅思核心词汇冲刺',
                  '🏃 7天活力减脂与燃脂运动',
                  '🧹 周末断舍离极简大扫除',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRunAIPlan(chip)}
                    className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[11px] transition font-medium text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={() => handleRunAIPlan()}
              disabled={isAIGenerating || !aiGoalInput.trim()}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 hover:from-purple-700 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md active:scale-98 transition disabled:opacity-50"
            >
              {isAIGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI 正在结构化深度拆解中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>开始 AI 智能规划</span>
                </>
              )}
            </button>

            {/* AI Result Card */}
            {aiPlanResult && (
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-3 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {aiPlanResult.title}
                      </span>
                      {getPriorityBadge(aiPlanResult.priority)}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                        {getCategoryLabel(aiPlanResult.category)}
                      </span>
                    </div>
                    {aiPlanResult.description && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {aiPlanResult.description}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 flex items-center space-x-1 pt-0.5">
                      <Calendar className="w-3 h-3 text-purple-500" />
                      <span>建议截止日期：{aiPlanResult.dueDate}</span>
                    </p>
                  </div>
                </div>

                {/* Subtasks List */}
                <div className="space-y-1.5 border-t border-purple-200/60 dark:border-purple-800/60 pt-2.5">
                  <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center space-x-1">
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>AI 拆解微行动清单 ({aiPlanResult.subtasks.length} 步)：</span>
                  </div>
                  <div className="space-y-1">
                    {aiPlanResult.subtasks.map((st, i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-2 text-xs text-zinc-700 dark:text-zinc-300 bg-white/70 dark:bg-zinc-800/70 px-2.5 py-1.5 rounded-xl"
                      >
                        <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate">{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adopt Button */}
                <button
                  onClick={handleAdoptAIPlan}
                  className="w-full py-2.5 rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>一键采纳并加入任务清单</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
