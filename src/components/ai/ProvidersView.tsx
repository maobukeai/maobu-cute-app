import React, { useEffect, useState } from 'react';
import { AIProvider } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import {
  testProviderLatency,
  fetchModelsFromProvider,
  PROVIDER_TEMPLATES,
  DEFAULT_CUSTOM_PROVIDER,
} from '../../utils/ai';
import {
  Sliders,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  Check,
  Plus,
  Trash2,
  Star,
  X,
} from 'lucide-react';
import { Button, Field, Input, Screen, useToast } from '../ui';

interface ProvidersViewProps {
  providers: AIProvider[];
  onUpdateProviders: (providers: AIProvider[]) => void;
}

export const ProvidersView: React.FC<ProvidersViewProps> = ({ providers, onUpdateProviders }) => {
  const toast = useToast();

  // Selected provider ID currently being viewed/edited in this tab
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => {
    const active = providers.find(p => p.isActive);
    return active?.id || providers[0]?.id || DEFAULT_CUSTOM_PROVIDER.id;
  });

  // Current editing provider object
  const currentProvider =
    providers.find(p => p.id === selectedProviderId) || providers[0] || DEFAULT_CUSTOM_PROVIDER;

  // Form states for current editing provider
  const [name, setName] = useState(currentProvider.name);
  const [baseUrl, setBaseUrl] = useState(currentProvider.baseUrl);
  const [apiKey, setApiKey] = useState(currentProvider.apiKey);
  const [defaultModel, setDefaultModel] = useState(currentProvider.defaultModel);
  const [availableModels, setAvailableModels] = useState<string[]>(
    currentProvider.availableModels || []
  );

  const [showApiKey, setShowApiKey] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // New model inline input
  const [newModelInput, setNewModelInput] = useState('');

  // Add preset template dropdown
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Keep local form in sync whenever the selected provider changes
  useEffect(() => {
    if (currentProvider) {
      setName(currentProvider.name);
      setBaseUrl(currentProvider.baseUrl);
      setApiKey(currentProvider.apiKey);
      setDefaultModel(currentProvider.defaultModel);
      setAvailableModels(currentProvider.availableModels || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProvider.id]);

  // Switch to another provider tab
  const handleSelectProvider = (id: string) => {
    sound.playTap();
    haptics.selection();
    setSelectedProviderId(id);
  };

  // Set this provider as the active provider for chat
  const handleSetCurrentActive = () => {
    sound.playTap();
    haptics.impactLight();
    const updated = providers.map(p => ({
      ...p,
      isActive: p.id === currentProvider.id,
    }));
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    toast.success(`已将「${currentProvider.name}」设为当前对话生效厂商`);
  };

  // Add a new model to this provider's model list
  const handleAddModel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const m = newModelInput.trim();
    if (!m) return;
    if (availableModels.includes(m)) {
      toast.warn(`模型 ${m} 已存在`);
      return;
    }
    sound.playSuccess();
    haptics.selection();
    const nextModels = [...availableModels, m];
    setAvailableModels(nextModels);
    // If no default model set, set this one
    if (!defaultModel) {
      setDefaultModel(m);
    }
    setNewModelInput('');

    // Auto save
    const updated = providers.map(p =>
      p.id === currentProvider.id
        ? {
            ...p,
            name: name.trim() || p.name,
            baseUrl: baseUrl.trim(),
            apiKey: apiKey.trim(),
            defaultModel: defaultModel || m,
            availableModels: nextModels,
          }
        : p
    );
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    toast.success(`已添加模型：${m}`);
  };

  // Remove a model from this provider
  const handleRemoveModel = (modelToRemove: string) => {
    sound.playTap();
    haptics.selection();
    const nextModels = availableModels.filter(m => m !== modelToRemove);
    setAvailableModels(nextModels);
    let nextDefault = defaultModel;
    if (defaultModel === modelToRemove) {
      nextDefault = nextModels[0] || '';
      setDefaultModel(nextDefault);
    }

    const updated = providers.map(p =>
      p.id === currentProvider.id
        ? {
            ...p,
            defaultModel: nextDefault,
            availableModels: nextModels,
          }
        : p
    );
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    toast.info(`已移除模型 ${modelToRemove}`);
  };

  // Set a model as the default active model for this provider
  const handleSetDefaultModel = (modelName: string) => {
    sound.playTap();
    haptics.selection();
    setDefaultModel(modelName);

    const updated = providers.map(p =>
      p.id === currentProvider.id
        ? {
            ...p,
            defaultModel: modelName,
          }
        : p
    );
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    toast.success(`已将 ${modelName} 设为该厂商默认模型`);
  };

  // Fetch models from /models endpoint
  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      toast.warn('请先输入 API 接口地址 (Base URL)');
      return;
    }
    setIsFetchingModels(true);
    sound.playTap();
    try {
      const models = await fetchModelsFromProvider(baseUrl.trim(), apiKey.trim());
      if (models.length === 0) {
        toast.warn('未获取到模型，请检查端点地址与 API 密钥');
      } else {
        const merged = Array.from(new Set([...availableModels, ...models]));
        setAvailableModels(merged);
        const nextDef = defaultModel && merged.includes(defaultModel) ? defaultModel : models[0];
        setDefaultModel(nextDef);

        const updated = providers.map(p =>
          p.id === currentProvider.id
            ? {
                ...p,
                baseUrl: baseUrl.trim(),
                apiKey: apiKey.trim(),
                availableModels: merged,
                defaultModel: nextDef,
              }
            : p
        );
        onUpdateProviders(updated);
        db.saveAIProviders(updated);
        sound.playSuccess();
        toast.success(`成功获取到 ${models.length} 个可用模型并已合并保存`);
      }
    } catch (err: any) {
      toast.error(`获取模型失败：${err.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Test Latency (Ping)
  const handleTestLatency = async () => {
    sound.playTap();
    setTestingId(currentProvider.id);
    const tempProv: AIProvider = {
      ...currentProvider,
      name: name.trim() || currentProvider.name,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      defaultModel: defaultModel.trim(),
      availableModels,
    };
    const res = await testProviderLatency(tempProv);
    const updated = providers.map(p =>
      p.id === currentProvider.id
        ? {
            ...tempProv,
            latency: res.ok ? res.latency : undefined,
            lastTestedAt: new Date().toISOString(),
          }
        : p
    );
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    setTestingId(null);
    if (res.ok) {
      toast.success(`${currentProvider.name} 测通成功：${res.message}`);
    } else {
      toast.error(`${currentProvider.name} 测通失败：${res.message}`);
    }
  };

  // Save current provider settings
  const handleSaveConfig = () => {
    sound.playSuccess();
    haptics.impactLight();

    const updatedProvider: AIProvider = {
      ...currentProvider,
      name: name.trim() || currentProvider.name,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      defaultModel: defaultModel.trim(),
      availableModels,
    };

    const nextProviders = providers.map(p =>
      p.id === currentProvider.id ? updatedProvider : p
    );

    onUpdateProviders(nextProviders);
    db.saveAIProviders(nextProviders);
    toast.success(`已保存「${updatedProvider.name}」配置`);
  };

  // Add a new provider from template or custom
  const handleAddProvider = (templateId?: string) => {
    sound.playSuccess();
    const tmpl = templateId ? PROVIDER_TEMPLATES.find(t => t.id === templateId) : null;
    const newProv: AIProvider = {
      id: 'provider_' + Date.now(),
      name: tmpl?.name || '自定义服务商',
      baseUrl: tmpl?.baseUrl || 'https://api.openai.com/v1',
      apiKey: '',
      defaultModel: tmpl?.defaultModel || '',
      availableModels: tmpl ? [...tmpl.models] : [],
      isActive: false,
    };

    const next = [...providers, newProv];
    onUpdateProviders(next);
    db.saveAIProviders(next);
    setSelectedProviderId(newProv.id);
    setShowAddMenu(false);
    toast.success(`已添加新厂商「${newProv.name}」`);
  };

  // Delete provider
  const handleDeleteProvider = (id: string) => {
    if (providers.length <= 1) {
      toast.warn('至少保留一个模型服务商');
      return;
    }
    sound.playTap();
    const next = providers.filter(p => p.id !== id);
    if (!next.some(p => p.isActive) && next.length > 0) {
      next[0].isActive = true;
    }
    onUpdateProviders(next);
    db.saveAIProviders(next);
    setSelectedProviderId(next[0].id);
    toast.info('已删除该服务商');
  };

  return (
    <Screen className="max-w-2xl mx-auto w-full px-3 py-2 space-y-3">
      {/* Compact Header */}
      <div className="bg-surface rounded-2xl border border-line p-3 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sub font-bold text-ink truncate leading-snug">
              模型服务商与多模型配置
            </h4>
            <p className="text-caption text-ink-3 truncate leading-none">
              配置厂商端点与专属模型库 · 自由添加切换
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={handleTestLatency}
            disabled={testingId !== null}
            title="测试当前厂商网络延迟"
            className="text-2xs h-8 px-2.5"
          >
            <Zap className={`w-3.5 h-3.5 text-warn ${testingId !== null ? 'animate-spin' : ''}`} />
            <span>{testingId !== null ? '测通中' : '测通'}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveConfig}
            className="text-2xs h-8 px-3"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存</span>
          </Button>
        </div>
      </div>

      {/* Horizontal Vendor Tabs (Compact & Scrollable) */}
      <div className="relative">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {providers.map(p => {
            const isEditing = p.id === currentProvider.id;
            const isChatActive = p.isActive;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProvider(p.id)}
                className={`px-3 py-1.5 rounded-full text-caption font-semibold flex items-center gap-1.5 shrink-0 transition select-none cursor-pointer border ${
                  isEditing
                    ? 'bg-accent/10 border-accent/40 text-accent shadow-2xs'
                    : 'bg-surface border-line hover:bg-surface-2 text-ink-2'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isChatActive ? 'bg-accent animate-pulse' : 'bg-ink-4'
                  }`}
                  title={isChatActive ? '当前对话生效厂商' : '未激活'}
                />
                <span>{p.name}</span>
                {isChatActive && (
                  <span className="text-3xs px-1 rounded bg-accent text-white font-sans">生效中</span>
                )}
              </button>
            );
          })}

          {/* Add Vendor Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-2.5 py-1.5 rounded-full border border-dashed border-line hover:border-accent text-caption font-semibold text-ink-2 hover:text-accent flex items-center gap-1 bg-surface transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加厂商</span>
            </button>

            {showAddMenu && (
              <div className="absolute left-0 top-full mt-1 w-44 p-1.5 bg-surface rounded-xl border border-line shadow-elev-3 z-30 space-y-1 animate-fade-in">
                <div className="text-3xs text-ink-3 px-1.5 py-0.5 font-bold uppercase">从常用预设添加：</div>
                {PROVIDER_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleAddProvider(tmpl.id)}
                    className="w-full text-left px-2 py-1 rounded-lg text-caption text-ink hover:bg-surface-2 hover:text-accent flex items-center justify-between"
                  >
                    <span>{tmpl.name}</span>
                    <Plus className="w-3 h-3 opacity-60" />
                  </button>
                ))}
                <div className="border-t border-line/60 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddProvider()}
                    className="w-full text-left px-2 py-1 rounded-lg text-caption font-medium text-accent hover:bg-accent/10 flex items-center justify-between"
                  >
                    <span>自定义服务商</span>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Compact Provider Configuration Form */}
      <div className="bg-surface rounded-2xl border border-line shadow-2xs p-3.5 space-y-3">
        {/* Row 1: Vendor Name & Activation Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Field label="厂商名称" required>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="如 谷歌 / sensenova / DeepSeek"
                className="font-semibold text-ink text-sub py-1.5"
              />
            </Field>
          </div>

          <div className="shrink-0 pt-4">
            {currentProvider.isActive ? (
              <div className="flex items-center gap-1 text-2xs font-semibold text-accent px-2.5 py-1.5 rounded-xl bg-accent/10 border border-accent/20">
                <Check className="w-3.5 h-3.5" />
                <span>当前对话生效中</span>
              </div>
            ) : (
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={handleSetCurrentActive}
                className="text-2xs"
              >
                设为对话生效厂商
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Base URL & API Key */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="接口地址 (Base URL)" required hint="支持 /v1 兼容端点">
            <Input
              type="text"
              required
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="font-mono text-caption py-1.5"
            />
          </Field>

          <Field label="API 密钥 (API Key)" hint="本地加密安全存储">
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-… 或 API 秘钥"
                className="pr-8 font-mono text-caption py-1.5"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink transition"
                title={showApiKey ? '隐藏' : '显示'}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </Field>
        </div>

        {/* Row 3: Multi-Model Management (配置一个厂商可以配置几个模型) */}
        <div className="pt-2 border-t border-line/60 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-caption font-bold text-ink">
                该厂商的模型库 ({availableModels.length} 个)
              </span>
              <span className="text-3xs text-ink-3">点击设为默认 · 点击 × 删除</span>
            </div>

            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={handleFetchModels}
              disabled={isFetchingModels || !baseUrl.trim()}
              className="text-2xs h-7 px-2"
              title="请求 /models 自动拉取"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
              <span>{isFetchingModels ? '拉取中…' : '自动拉取'}</span>
            </Button>
          </div>

          {/* Model Chips/Tags Pool */}
          <div className="min-h-[50px] p-2 bg-surface-2/40 rounded-xl border border-line/70 flex flex-wrap gap-1.5 items-center">
            {availableModels.length === 0 ? (
              <span className="text-caption text-ink-3 px-1 py-0.5">
                暂未配置模型，可在下方输入添加或点击右上角「自动拉取」
              </span>
            ) : (
              availableModels.map(model => {
                const isDefault = defaultModel === model;
                return (
                  <div
                    key={model}
                    onClick={() => handleSetDefaultModel(model)}
                    className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-caption font-mono cursor-pointer transition select-none border ${
                      isDefault
                        ? 'bg-accent/10 border-accent/40 text-accent font-bold shadow-2xs'
                        : 'bg-surface border-line hover:border-accent/40 text-ink hover:bg-surface-2'
                    }`}
                    title={isDefault ? '当前生效默认模型（点击保持）' : '点击设为此厂商默认模型'}
                  >
                    {isDefault && <Star className="w-3 h-3 text-accent fill-accent" />}
                    <span>{model}</span>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveModel(model);
                      }}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-surface-3 text-ink-4 hover:text-danger transition"
                      title="删除此模型"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Inline Add Model Input */}
          <form onSubmit={handleAddModel} className="flex items-center gap-1.5">
            <Input
              type="text"
              value={newModelInput}
              onChange={e => setNewModelInput(e.target.value)}
              placeholder="输入模型标识（如 gemini-3.5-flash-lite / deepseek-v4）回车添加…"
              className="flex-1 font-mono text-caption py-1 px-2.5 h-8"
            />
            <Button
              type="submit"
              variant="neutral"
              size="sm"
              disabled={!newModelInput.trim()}
              className="h-8 px-3 text-2xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加模型</span>
            </Button>
          </form>
        </div>

        {/* Bottom Actions: Delete Vendor */}
        {providers.length > 1 && (
          <div className="pt-2 border-t border-line/60 flex items-center justify-between text-2xs">
            <span className="text-ink-4">ID: {currentProvider.id}</span>
            <button
              type="button"
              onClick={() => handleDeleteProvider(currentProvider.id)}
              className="text-danger hover:underline flex items-center gap-1 p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除此服务商</span>
            </button>
          </div>
        )}
      </div>

      {/* Current Active Status Footer Card (Ultra Compact) */}
      <div className="bg-surface rounded-2xl border border-line px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
          <div className="min-w-0">
            <span className="text-2xs text-ink-3 font-semibold block">全局对话生效：</span>
            <span className="text-caption font-bold text-ink truncate font-mono">
              {providers.find(p => p.isActive)?.name || '未配置'} ·{' '}
              {providers.find(p => p.isActive)?.defaultModel || '未选模型'}
            </span>
          </div>
        </div>

        {currentProvider.latency !== undefined && (
          <div className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono font-bold shrink-0">
            <Zap className="w-3 h-3" />
            <span>{currentProvider.latency}ms</span>
          </div>
        )}
      </div>
    </Screen>
  );
};
