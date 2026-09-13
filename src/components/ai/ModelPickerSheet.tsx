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

      {/* Sheet Container */}
      <div
        className="relative w-full sm:max-w-xl h-[82vh] sm:h-[560px] max-h-[90vh] bg-surface rounded-t-[28px] sm:rounded-3xl border border-line shadow-2xl flex flex-col overflow-hidden z-10 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-ink-4/30" />
        </div>

        {/* Compact Header */}
        <div className="px-4 py-2.5 border-b border-line flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sub font-bold text-ink truncate leading-tight">选择大模型</h3>
                <span className="text-caption text-ink-3">先厂商，后模型</span>
              </div>
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
              className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink text-caption font-medium flex items-center gap-1 transition select-none"
              title="前往模型配置页面"
            >
              <Sliders className="w-3 h-3" />
              <span>配置</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center active:scale-95 transition"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 border-b border-line/60 bg-surface-2/30 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索厂商或大模型名称（如 谷歌 / deepseek）…"
              className="w-full pl-8 pr-3 py-1.5 text-caption bg-surface rounded-xl border border-line focus:outline-none focus:border-accent text-ink placeholder:text-ink-4 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink text-caption"
              >
                清空
              </button>
            )}
          </div>
        </div>

        {/* Two-Column Cascader Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Column 1: 厂商列表 (Left Column, ~40%) */}
          <div className="w-5/12 max-w-[190px] min-w-[130px] border-r border-line bg-surface-2/40 flex flex-col min-h-0">
            <div className="px-3 py-1.5 text-2xs font-semibold text-ink-3 uppercase tracking-wider border-b border-line/50 shrink-0 flex items-center justify-between">
              <span>服务商</span>
              <span>{filteredProviders.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar divide-y divide-line/30">
              {filteredProviders.map(p => {
                const isSelected = p.id === selectedProviderId;
                const isCurrentActive = p.isActive;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      haptics.selection();
                      setSelectedProviderId(p.id);
                    }}
                    className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition select-none group cursor-pointer ${
                      isSelected
                        ? 'bg-surface font-bold text-ink shadow-2xs border-l-2 border-accent'
                        : 'hover:bg-surface/50 text-ink-2 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isCurrentActive ? 'bg-accent animate-pulse' : 'bg-ink-4'
                        }`}
                        title={isCurrentActive ? '当前对话生效厂商' : '未激活'}
                      />
                      <span className="text-caption truncate leading-snug">{p.name}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isSelected ? 'text-accent translate-x-0.5' : 'text-ink-4 opacity-70'
                      }`}
                    />
                  </button>
                );
              })}

              {/* Add Vendor button */}
              <div className="p-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddVendorMenu(!showAddVendorMenu)}
                  className="w-full py-1.5 px-2 rounded-xl border border-dashed border-line hover:border-accent/60 bg-surface/60 hover:bg-surface text-ink-2 hover:text-accent text-caption font-semibold flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加厂商</span>
                </button>

                {showAddVendorMenu && (
                  <div className="mt-1.5 p-1.5 bg-surface rounded-xl border border-line shadow-elev-2 space-y-1 animate-fade-in">
                    <div className="text-2xs text-ink-3 px-1.5 font-medium">快速添加常用预设：</div>
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
                          className={`w-full text-left px-2 py-1 rounded-lg text-caption flex items-center justify-between transition ${
                            alreadyExists
                              ? 'opacity-40 cursor-not-allowed text-ink-3'
                              : 'hover:bg-surface-2 text-ink hover:text-accent font-medium'
                          }`}
                        >
                          <span>{tmpl.name}</span>
                          {alreadyExists ? (
                            <span className="text-2xs text-ink-4">已存在</span>
                          ) : (
                            <Plus className="w-3 h-3 opacity-60" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: 该厂商的模型列表 (Right Column, ~60%) */}
          <div className="flex-1 flex flex-col min-h-0 bg-surface">
            {/* Right Column Header */}
            <div className="px-3.5 py-2 border-b border-line/50 flex items-center justify-between gap-2 shrink-0 bg-surface">
              <div className="min-w-0">
                <span className="text-caption font-bold text-ink truncate block">
                  {currentProvider?.name || '厂商'} 的大模型
                </span>
                <span className="text-2xs text-ink-3">
                  共 {providerModels.length} 个模型 · 点击立即切换
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleFetchRemoteModels}
                  disabled={isFetchingRemote || !currentProvider?.baseUrl}
                  className="p-1 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-accent transition disabled:opacity-40"
                  title="从 /models 远端拉取最新模型"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRemote ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingModel(!isAddingModel)}
                  className="p-1 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-accent transition"
                  title="手动输入新模型"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inline Add Model Input Form */}
            {isAddingModel && (
              <form
                onSubmit={handleAddCustomModel}
                className="p-2 border-b border-line/60 bg-surface-2/40 flex items-center gap-1.5 shrink-0 animate-fade-in"
              >
                <Input
                  type="text"
                  autoFocus
                  value={newModelInput}
                  onChange={e => setNewModelInput(e.target.value)}
                  placeholder="如 gemini-3.5-flash-lite / deepseek-v4"
                  className="flex-1 font-mono text-caption py-1 px-2.5 h-7"
                />
                <Button type="submit" variant="primary" size="sm" className="h-7 px-2.5 text-2xs shrink-0">
                  选用
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => setIsAddingModel(false)}
                  className="h-7 px-1.5 text-2xs shrink-0"
                >
                  取消
                </Button>
              </form>
            )}

            {/* Models Scrollable List */}
            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-2 space-y-1">
              {providerModels.length === 0 ? (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-4 gap-2">
                  <span className="text-caption text-ink-3">该服务商暂未配置模型</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => setIsAddingModel(true)}
                      className="text-2xs"
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
                        className="text-2xs"
                      >
                        <RefreshCw className={`w-3 h-3 ${isFetchingRemote ? 'animate-spin' : ''}`} />
                        <span>自动拉取</span>
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
                          <span className="text-3xs text-accent/80 font-sans block">当前生效模型</span>
                        )}
                      </div>

                      {isModelActive ? (
                        <Check className="w-4 h-4 text-accent shrink-0" />
                      ) : (
                        <span className="text-2xs text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          切换
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Helper / Provider Manage Bottom Bar */}
            <div className="px-3 py-2 border-t border-line/60 bg-surface-2/30 flex items-center justify-between text-2xs text-ink-3 shrink-0">
              <span className="truncate">
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
                配置端点与密钥 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
