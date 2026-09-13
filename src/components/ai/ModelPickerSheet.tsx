import React, { useState, useMemo, useEffect } from 'react';
import { AIProvider } from '../../types';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import {
  X,
  Search,
  Check,
  ChevronRight,
  Plus,
  Sliders,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button, Input, useToast } from '../ui';
import { fetchModelsFromProvider, PROVIDER_TEMPLATES } from '../../utils/ai';
import { db } from '../../utils/storage';

export interface ModelPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  providers: AIProvider[];
  onUpdateProviders: (providers: AIProvider[]) => void;
  onSelectProviderModel: (providerId: string, modelName: string) => void;
  onGoToProviders: () => void;
}

export const ModelPickerSheet: React.FC<ModelPickerSheetProps> = ({
  isOpen,
  onClose,
  providers,
  onUpdateProviders,
  onSelectProviderModel,
  onGoToProviders,
}) => {
  const toast = useToast();

  // Find currently active provider
  const activeProvider = useMemo(
    () => providers.find(p => p.isActive) || providers[0],
    [providers]
  );

  // Selected provider in the cascader (left column)
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    activeProvider?.id || providers[0]?.id || ''
  );

  // Keep selected provider in sync with active provider when opening
  useEffect(() => {
    if (isOpen) {
      const active = providers.find(p => p.isActive) || providers[0];
      if (active) {
        setSelectedProviderId(active.id);
      }
    }
  }, [isOpen, providers]);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Inline model add state
  const [newModelInput, setNewModelInput] = useState('');
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);

  // Quick add vendor preset modal state
  const [showAddVendorMenu, setShowAddVendorMenu] = useState(false);

  const currentProvider = useMemo(
    () => providers.find(p => p.id === selectedProviderId) || providers[0],
    [providers, selectedProviderId]
  );

  // Filtered providers
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase().trim();
    return providers.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.defaultModel.toLowerCase().includes(q) ||
        p.availableModels?.some(m => m.toLowerCase().includes(q))
    );
  }, [providers, searchQuery]);

  // Current provider's models, deduplicated and filtered
  const providerModels = useMemo(() => {
    if (!currentProvider) return [];
    const set = new Set<string>();
    if (currentProvider.defaultModel?.trim()) {
      set.add(currentProvider.defaultModel.trim());
    }
    (currentProvider.availableModels || []).forEach(m => {
      if (m?.trim()) set.add(m.trim());
    });
    const list = Array.from(set);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(m => m.toLowerCase().includes(q));
  }, [currentProvider, searchQuery]);

  if (!isOpen) return null;

  // Handle choosing a model
  const handleSelectModel = (modelName: string) => {
    if (!currentProvider) return;
    sound.playTap();
    haptics.selection();
    onSelectProviderModel(currentProvider.id, modelName);
    toast.success(`已切换至 ${currentProvider.name} · ${modelName}`);
    onClose();
  };

  // Inline add custom model for this vendor
  const handleAddCustomModel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const model = newModelInput.trim();
    if (!model || !currentProvider) return;

    sound.playSuccess();
    haptics.impactLight();

    const updatedModels = Array.from(new Set([model, ...(currentProvider.availableModels || [])]));
    const updatedProviders = providers.map(p => {
      if (p.id === currentProvider.id) {
        return {
          ...p,
          defaultModel: model,
          availableModels: updatedModels,
          isActive: true,
        };
      }
      return { ...p, isActive: false };
    });

    onUpdateProviders(updatedProviders);
    db.saveAIProviders(updatedProviders);
    setNewModelInput('');
    setIsAddingModel(false);
    toast.success(`已为 ${currentProvider.name} 添加并选用模型：${model}`);
    onClose();
  };

  // Auto fetch from /models endpoint
  const handleFetchRemoteModels = async () => {
    if (!currentProvider) return;
    if (!currentProvider.baseUrl?.trim()) {
      toast.warn('该厂商尚未配置 API 接口地址');
      return;
    }
    setIsFetchingRemote(true);
    sound.playTap();
    try {
      const models = await fetchModelsFromProvider(
        currentProvider.baseUrl.trim(),
        currentProvider.apiKey.trim()
      );
      if (models.length === 0) {
        toast.warn('未获取到模型，请检查 API Key 或端点地址');
      } else {
        const merged = Array.from(
          new Set([...(currentProvider.availableModels || []), ...models])
        );
        const updatedProviders = providers.map(p =>
          p.id === currentProvider.id
            ? {
                ...p,
                availableModels: merged,
                defaultModel: p.defaultModel || models[0],
              }
            : p
        );
        onUpdateProviders(updatedProviders);
        db.saveAIProviders(updatedProviders);
        sound.playSuccess();
        toast.success(`成功为 ${currentProvider.name} 获取到 ${models.length} 个模型`);
      }
    } catch (err: any) {
      toast.error(`拉取模型失败: ${err.message}`);
    } finally {
      setIsFetchingRemote(false);
    }
  };

  // Add a vendor preset
  const handleAddVendorPreset = (templateId: string) => {
    const tmpl = PROVIDER_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    sound.playSuccess();
    const newProvider: AIProvider = {
      id: 'provider_' + Date.now(),
      name: tmpl.name,
      baseUrl: tmpl.baseUrl,
      apiKey: '',
      defaultModel: tmpl.defaultModel,
      availableModels: [...tmpl.models],
      isActive: true,
    };
    const updated = [...providers.map(p => ({ ...p, isActive: false })), newProvider];
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    setSelectedProviderId(newProvider.id);
    setShowAddVendorMenu(false);
    toast.success(`已添加厂商「${newProvider.name}」并设为激活`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => {
          sound.playTap();
          onClose();
        }}
      />

      {/* Compact Sheet Container */}
      <div
        className="relative w-full sm:max-w-md max-h-[62vh] bg-surface rounded-t-[24px] sm:rounded-2xl border border-line shadow-2xl flex flex-col overflow-hidden z-10 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-ink-4/30" />
        </div>

        {/* Compact Header */}
        <div className="px-3.5 py-2 border-b border-line flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-sub font-bold text-ink truncate leading-tight">选择大模型</h3>
              <span className="text-[11px] text-ink-3">点击即切换</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onClose();
                onGoToProviders();
              }}
              className="px-2 py-0.5 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink text-[11px] font-medium flex items-center gap-1 transition select-none"
              title="前往模型配置页面"
            >
              <Sliders className="w-3 h-3" />
              <span>配置厂商</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-6 h-6 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center active:scale-95 transition"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Vendor Selector Strip (Horizontal Pills) */}
        <div className="px-3 py-1.5 border-b border-line/60 bg-surface-2/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[11px] text-ink-3 font-medium shrink-0">服务商:</span>
          {filteredProviders.map(p => {
            const isSelected = p.id === selectedProviderId;
            const isCurrentActive = p.isActive;
            const modelCount =
              (p.availableModels?.length || 0) +
              (p.defaultModel && !p.availableModels?.includes(p.defaultModel) ? 1 : 0);

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  haptics.selection();
                  setSelectedProviderId(p.id);
                }}
                className={`px-2.5 py-1 rounded-full text-caption font-semibold flex items-center gap-1.5 shrink-0 transition-all tactile-press ${
                  isSelected
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface border border-line/70 text-ink-2 hover:text-ink'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : isCurrentActive ? 'bg-accent' : 'bg-ink-4'
                  }`}
                />
                <span className="truncate max-w-[120px]">{p.name}</span>
                <span className={isSelected ? 'text-white/80 text-[11px]' : 'text-ink-3 text-[11px]'}>
                  {modelCount}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowAddVendorMenu(!showAddVendorMenu)}
            className="px-2 py-0.5 rounded-full border border-dashed border-line text-ink-3 hover:text-accent text-[11px] font-medium flex items-center gap-0.5 shrink-0 transition hover:border-accent/40"
            title="添加常用预设厂商"
          >
            <Plus className="w-3 h-3" />
            <span>添加</span>
          </button>
        </div>

        {/* Quick Add Vendor Dropdown Menu */}
        {showAddVendorMenu && (
          <div className="px-3 py-2 bg-surface-2/80 border-b border-line/60 space-y-1.5 animate-scale-in shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-3 font-semibold">快速添加常用厂商预设：</span>
              <button
                type="button"
                onClick={() => setShowAddVendorMenu(false)}
                className="text-ink-3 hover:text-ink text-[11px]"
              >
                收起
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {PROVIDER_TEMPLATES.map(tmpl => {
                const alreadyExists = providers.some(
                  p => p.name.toLowerCase() === tmpl.name.toLowerCase()
                );
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    disabled={alreadyExists}
                    onClick={() => handleAddVendorPreset(tmpl.id)}
                    className={`px-2 py-1 rounded-lg text-caption shrink-0 flex items-center gap-1 border transition ${
                      alreadyExists
                        ? 'opacity-40 cursor-not-allowed bg-surface border-line text-ink-4'
                        : 'bg-surface hover:bg-surface-2 border-line hover:border-accent text-ink font-medium shadow-xs'
                    }`}
                  >
                    <span>{tmpl.name}</span>
                    {alreadyExists ? (
                      <span className="text-[10px] text-ink-4">已加</span>
                    ) : (
                      <Plus className="w-3 h-3 text-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="px-3 py-1.5 border-b border-line/50 flex items-center gap-1.5 bg-surface shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3 h-3 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`搜索 ${currentProvider?.name || ''} 模型...`}
              className="w-full pl-7 pr-6 py-1 text-caption bg-surface-2/70 rounded-lg border border-line/60 focus:outline-none focus:border-accent text-ink placeholder:text-ink-4 transition h-7"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink text-2xs"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleFetchRemoteModels}
              disabled={isFetchingRemote || !currentProvider?.baseUrl}
              className="h-7 px-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-accent text-[11px] font-medium flex items-center gap-1 transition disabled:opacity-40"
              title="从 /models 远端拉取最新模型"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingRemote ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">拉取</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingModel(!isAddingModel)}
              className="h-7 px-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-accent text-[11px] font-medium flex items-center gap-1 transition"
              title="手动输入新模型"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden xs:inline">自定义</span>
            </button>
          </div>
        </div>

        {/* Inline Add Custom Model Form */}
        {isAddingModel && (
          <form
            onSubmit={handleAddCustomModel}
            className="p-2 border-b border-line/60 bg-surface-2/60 flex items-center gap-1.5 shrink-0 animate-fade-in"
          >
            <Input
              type="text"
              autoFocus
              value={newModelInput}
              onChange={e => setNewModelInput(e.target.value)}
              placeholder="如 gemini-2.5-flash / deepseek-chat"
              className="flex-1 font-mono text-caption py-1 px-2.5 h-7"
            />
            <Button type="submit" variant="primary" size="sm" className="h-7 px-2.5 text-caption shrink-0">
              选用
            </Button>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={() => setIsAddingModel(false)}
              className="h-7 px-2 text-caption shrink-0"
            >
              取消
            </Button>
          </form>
        )}

        {/* Full-width Models Scrollable List (Comfortable height) */}
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-2 space-y-1 min-h-[140px] max-h-[300px]">
          {providerModels.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 gap-2">
              <span className="text-caption text-ink-3">该厂商暂未配置可用模型</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => setIsAddingModel(true)}
                  className="text-caption h-7"
                >
                  <Plus className="w-3 h-3" />
                  <span>手动添加</span>
                </Button>
                {currentProvider?.baseUrl && (
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={handleFetchRemoteModels}
                    disabled={isFetchingRemote}
                    className="text-caption h-7"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingRemote ? 'animate-spin' : ''}`} />
                    <span>在线拉取</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            providerModels.map(model => {
              const isModelActive =
                currentProvider?.isActive && currentProvider?.defaultModel === model;
              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleSelectModel(model)}
                  className={`w-full px-3 py-2 rounded-xl text-left transition flex items-center justify-between gap-2 select-none group cursor-pointer ${
                    isModelActive
                      ? 'bg-accent/10 border border-accent/30 text-accent font-semibold shadow-2xs'
                      : 'hover:bg-surface-2 border border-transparent text-ink'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-caption font-mono truncate leading-normal">
                      {model}
                    </div>
                    {isModelActive && (
                      <span className="text-[10px] text-accent font-sans block mt-0.5">当前生效模型</span>
                    )}
                  </div>

                  {isModelActive ? (
                    <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  ) : (
                    <span className="text-caption text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      切换
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Compact Footer */}
        <div className="px-3 py-1.5 border-t border-line/60 bg-surface-2/40 flex items-center justify-between text-[11px] text-ink-3 shrink-0">
          <span className="truncate max-w-[200px]">
            端点: {currentProvider?.baseUrl ? new URL(currentProvider.baseUrl).hostname : '未配置'}
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onClose();
              onGoToProviders();
            }}
            className="text-accent hover:underline font-medium shrink-0"
          >
            端点与密钥配置 →
          </button>
        </div>
      </div>
    </div>
  );
};
