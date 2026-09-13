import React, { useState } from 'react';
import { PlanItem, PriorityLevel, SubTask } from '../../types';
import { BottomSheet } from '../common/BottomSheet';
import { Button, Field, Input, Select, Textarea } from '../ui';
import { generateAIPlan } from '../../utils/ai';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { PenLine, X } from 'lucide-react';
import { useToast } from '../ui';

interface PlanFormSheetProps {
  isOpen: boolean;
  editingPlan: PlanItem | null;
  todayStr: string;
  onClose: () => void;
  onSave: (draft: {
    title: string;
    description: string;
    priority: PriorityLevel;
    category: string;
    dueDate: string;
    subtasks: SubTask[];
  }) => void;
}

export const PlanFormSheet: React.FC<PlanFormSheetProps> = ({
  isOpen,
  editingPlan,
  todayStr,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [category, setCategory] = useState('life');
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAIAssisting, setIsAIAssisting] = useState(false);

  // Seed the form each time the sheet opens (editing an existing plan or blank)
  React.useEffect(() => {
    if (!isOpen) return;
    if (editingPlan) {
      setTitle(editingPlan.title);
      setDesc(editingPlan.description || '');
      setPriority(editingPlan.priority);
      setCategory(editingPlan.category);
      setDueDate(editingPlan.dueDate || '');
      setSubtasks([...editingPlan.subtasks]);
    } else {
      setTitle('');
      setDesc('');
      setPriority('medium');
      setCategory('life');
      setDueDate(todayStr);
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
  }, [isOpen, editingPlan, todayStr]);

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks(prev => [...prev, { id: 'st_' + Date.now(), title: newSubtaskTitle.trim(), isDone: false }]);
    setNewSubtaskTitle('');
    sound.playTap();
  };

  const handleAIAssist = async () => {
    if (!title.trim()) {
      toast.info('先输入一个简短的计划想法，AI 来帮你完善');
      return;
    }
    sound.playTap();
    setIsAIAssisting(true);
    try {
      const res = await generateAIPlan({
        prompt: title,
        provider: db.getAIProviders().find(p => p.isActive),
      });
      setTitle(res.title);
      setDesc(res.description);
      setPriority(res.priority);
      setCategory(res.category);
      if (res.dueDate) setDueDate(res.dueDate);
      if (res.subtasks?.length) {
        setSubtasks(prev => [
          ...prev,
          ...res.subtasks.map((st, i) => ({ id: `st_${Date.now()}_${i}`, title: st, isDone: false })),
        ]);
      }
      toast.success('AI 已帮你完善这份计划');
    } catch (err: any) {
      toast.error(`帮写失败：${err.message || '请检查 AI 配置'}`);
    } finally {
      setIsAIAssisting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: desc.trim(),
      priority,
      category,
      dueDate,
      subtasks,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editingPlan ? '编辑计划' : '新计划'}>
      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        <Field label="计划目标" required>
          <div className="relative">
            <Input
              required
              placeholder="例如：完成猫咪疫苗预约"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="pr-[118px]"
            />
            <button
              type="button"
              onClick={handleAIAssist}
              disabled={isAIAssisting}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg bg-accent/10 text-accent text-caption font-semibold flex items-center gap-1 tactile-press disabled:opacity-50"
            >
              <PenLine className="w-3 h-3" />
              <span>{isAIAssisting ? '构思中…' : '帮写'}</span>
            </button>
          </div>
        </Field>

        <Field label="详情备注">
          <Textarea rows={2} placeholder="具体要求或行动备忘…" value={desc} onChange={e => setDesc(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="优先级">
            <Select value={priority} onChange={e => setPriority(e.target.value as PriorityLevel)}>
              <option value="urgent">紧急</option>
              <option value="high">重要</option>
              <option value="medium">普通</option>
              <option value="low">日常</option>
            </Select>
          </Field>
          <Field label="分类">
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="life">生活</option>
              <option value="work">工作</option>
              <option value="study">学习</option>
              <option value="health">健身</option>
              <option value="cat">萌宠</option>
            </Select>
          </Field>
        </div>

        <Field label="截止日期">
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </Field>

        <Field label={`子步骤${subtasks.length ? `（${subtasks.length}）` : ''}`}>
          <div className="flex gap-2">
            <Input
              placeholder="输入子步骤，回车添加"
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSubtask();
                }
              }}
            />
            <Button type="button" variant="neutral" size="md" onClick={addSubtask}>
              添加
            </Button>
          </div>

          {subtasks.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {subtasks.map(st => (
                <div
                  key={st.id}
                  className="flex items-center justify-between px-3 py-1.5 bg-surface-2/70 rounded-xl text-caption text-ink-2"
                >
                  <span className="truncate">{st.title}</span>
                  <button
                    type="button"
                    onClick={() => setSubtasks(prev => prev.filter(s => s.id !== st.id))}
                    className="text-ink-3 hover:text-danger ml-2 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        <div className="pt-1 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" size="md" className="min-w-[108px]">
            保存
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
