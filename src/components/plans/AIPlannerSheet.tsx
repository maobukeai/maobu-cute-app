import React, { useState } from 'react';
import { BottomSheet } from '../common/BottomSheet';
import { Button, Field, Input, useToast } from '../ui';
import { generateAIPlan, GeneratedPlanOutput } from '../../utils/ai';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { Cpu, ExternalLink, Target, RefreshCw, Brain, ListTodo, Calendar, Check, X, AlertCircle } from 'lucide-react';

interface AIPlannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (result: GeneratedPlanOutput, subtasks: string[]) => void;
  onGoToAISettings: () => void;
}

const QUICK_IDEAS = [
  '萌宠全套驱虫体检与护理',
  'React 19 核心架构研发攻坚',
  '考研 / 雅思核心词汇冲刺',
  '7 天活力减脂运动方案',
  '周末断舍离极简大扫除',
];

export const AIPlannerSheet: React.FC<AIPlannerSheetProps> = ({
  isOpen,
  onClose,
  onAdopt,
  onGoToAISettings,
}) => {
  const toast = useToast();
  const [goal, setGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedPlanOutput | null>(null);
  const [liveReasoning, setLiveReasoning] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editableSubtasks, setEditableSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);

  const activeProvider = db.getAIProviders().find(p => p.isActive) || db.getAIProviders()[0];
  const availableModels = activeProvider?.availableModels || [];
  const [selectedModel, setSelectedModel] = useState(activeProvider?.defaultModel || '');

  const reset = () => {
    setGoal('');
    setResult(null);
    setLiveReasoning('');
    setError(null);
    setEditableSubtasks([]);
    setNewSubtask('');
  };

  React.useEffect(() => {
    if (isOpen) {
      setSelectedModel(activeProvider?.defaultModel || (availableModels[0] || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeProvider?.defaultModel]);

  const run = async (quickPrompt?: string) => {
    const text = quickPrompt || goal;
    if (!text.trim()) {
      toast.info('先输入你想规划的目标或愿望');
      return;
    }
    if (quickPrompt) setGoal(quickPrompt);

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
    setError(null);
    setElapsed(0);

    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    try {
      const res = await generateAIPlan({
        prompt: text,
        provider: activeProvider,
        model: selectedModel,
        onReasoningChunk: chunk => setLiveReasoning(prev => prev + chunk),
      });
      setResult(res);
      setEditableSubtasks(res.subtasks || []);
      sound.playSuccess();
    } catch (err: any) {
      setError(err.message || '大模型规划调用失败');
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="AI 目标敏捷规划">
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
            <span className="text-caption px-2 py-0.5 rounded-full bg-ok/10 text-ok font-semibold shrink-0">
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

        {/* Goal input */}
        <Field label="你的目标或愿望">
          <textarea
            rows={3}
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="例如：制定 7 天低碳减脂运动方案、周末带猫咪做全面体检…"
            className="w-full px-3.5 py-2.5 text-sub rounded-2xl bg-surface-2 border-none outline-none focus:ring-2 ring-accent/40 text-ink placeholder:text-ink-3 transition leading-relaxed resize-none"
          />
        </Field>

        {/* Quick ideas */}
        <div>
          <p className="text-caption text-ink-3 font-medium mb-1.5">快捷灵感</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_IDEAS.map((chip, idx) => (
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

        {/* Error */}
        {error && (
          <div className="p-3 rounded-2xl bg-danger/10 border border-danger/20 text-caption text-danger space-y-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToAISettings();
              }}
              className="px-3 py-1 bg-danger/15 rounded-lg font-semibold hover:bg-danger/25 transition"
            >
              前往「AI 伴侣」检查配置
            </button>
          </div>
        )}

        {/* Run */}
        {!result && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => run()}
            disabled={isGenerating || !goal.trim()}
            haptic="medium"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>规划中… ({elapsed}s)</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>开始规划</span>
              </>
            )}
          </Button>
        )}

        {/* Live thinking */}
        {isGenerating && liveReasoning && (
          <div className="p-3 rounded-2xl bg-accent/[0.06] border border-accent/15 space-y-1">
            <div className="flex items-center gap-1 text-accent font-semibold text-caption">
              <Brain className="w-3.5 h-3.5 animate-pulse" />
              <span>模型思考中…</span>
            </div>
            <p className="text-caption text-ink-2 line-clamp-3 leading-relaxed">{liveReasoning}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sub text-ink">{result.title}</span>
              </div>
              {result.description && (
                <p className="text-caption text-ink-2 leading-relaxed">{result.description}</p>
              )}
              <div className="flex items-center gap-3 text-caption text-ink-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>建议截止 {result.dueDate}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-surface-2 text-ink-3 font-mono">
                  {result.modelUsed || selectedModel} · {result.durationSeconds || 1}s
                </span>
              </div>
            </div>

            {/* Reasoning */}
            {result.reasoningContent && (
              <div className="rounded-xl border border-line bg-surface-2/50 p-2.5 space-y-1">
                <button
                  type="button"
                  onClick={() => setShowReasoning(v => !v)}
                  className="w-full flex items-center justify-between text-caption font-semibold text-ink-2"
                >
                  <span className="flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5" />
                    <span>思维推导过程</span>
                  </span>
                  <span className="text-ink-3">{showReasoning ? '收起' : '展开'}</span>
                </button>
                {showReasoning && (
                  <div className="mt-1 p-2 rounded-lg bg-surface-2 text-caption text-ink-2 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {result.reasoningContent}
                  </div>
                )}
              </div>
            )}

            {/* Editable subtasks */}
            <div className="space-y-1.5 border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-caption font-bold text-ink">
                  <ListTodo className="w-3.5 h-3.5 text-accent" />
                  <span>行动步骤（{editableSubtasks.length}）</span>
                </div>
                <span className="text-caption text-ink-3">可删减或补充</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {editableSubtasks.map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-caption text-ink-2 bg-surface-2/70 px-2.5 py-1.5 rounded-xl"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-4 h-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate">{st}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditableSubtasks(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-ink-3 hover:text-danger shrink-0 px-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  placeholder="补充自定义步骤…"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSubtask.trim()) {
                      e.preventDefault();
                      setEditableSubtasks(prev => [...prev, newSubtask.trim()]);
                      setNewSubtask('');
                    }
                  }}
                  className="py-2"
                />
                <Button
                  type="button"
                  variant="soft"
                  size="md"
                  onClick={() => {
                    if (newSubtask.trim()) {
                      setEditableSubtasks(prev => [...prev, newSubtask.trim()]);
                      setNewSubtask('');
                    }
                  }}
                >
                  添加
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-1 flex items-center gap-2.5">
              <Button variant="neutral" size="md" onClick={() => run()}>
                重新生成
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                haptic="medium"
                onClick={() => onAdopt(result, editableSubtasks)}
              >
                <Check className="w-4 h-4" />
                <span>采纳并加入清单</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
