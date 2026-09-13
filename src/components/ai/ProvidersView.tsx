import React, { useEffect, useState } from 'react';
import { AIProvider } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import {
  testProviderLatency,
  fetchModelsFromProvider,
  DEFAULT_CUSTOM_PROVIDER,
  SECOND_CUSTOM_PROVIDER,
} from '../../utils/ai';
import { Sliders, Eye, EyeOff, RefreshCw, Zap, Check, ChevronDown } from 'lucide-react';
import { Button, Field, Input, Select, SectionHeader, Screen, useToast } from '../ui';

interface ProvidersViewProps {
  providers: AIProvider[];
  onUpdateProviders: (providers: AIProvider[]) => void;
}

const QUICK_PRESETS = [
  {
    preset: DEFAULT_CUSTOM_PROVIDER,
    label: 'OpenAI 兼容接口',
    host: 'api.openai.com/v1',
    match: 'openai.com',
  },
  {
    preset: SECOND_CUSTOM_PROVIDER,
    label: 'DeepSeek 开放平台',
    host: 'api.deepseek.com/v1',
    match: 'deepseek.com',
  },
];

export const ProvidersView: React.FC<ProvidersViewProps> = ({ providers, onUpdateProviders }) => {
  const toast = useToast();

  const currentCustomProvider =
    providers.find(p => p.isActive) || providers[0] || DEFAULT_CUSTOM_PROVIDER;

  const [showApiKey, setShowApiKey] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [customModelInputMode, setCustomModelInputMode] = useState(false);

  const [activeBaseUrl, setActiveBaseUrl] = useState(currentCustomProvider?.baseUrl || '');
  const [activeApiKey, setActiveApiKey] = useState(currentCustomProvider?.apiKey || '');
  const [activeModel, setActiveModel] = useState(currentCustomProvider?.defaultModel || '');
  const [availableModelsList, setAvailableModelsList] = useState<string[]>(
    currentCustomProvider?.availableModels || []
  );
  const [customModelManualName, setCustomModelManualName] = useState('');

  // Keep in sync when active provider changes
  useEffect(() => {
    if (currentCustomProvider) {
      setActiveBaseUrl(currentCustomProvider.baseUrl);
      setActiveApiKey(currentCustomProvider.apiKey);
      setActiveModel(currentCustomProvider.defaultModel);
      setAvailableModelsList(currentCustomProvider.availableModels || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCustomProvider?.id]);

  // Fetch models from /models endpoint
  const handleFetchModels = async () => {
    if (!activeBaseUrl.trim()) {
      toast.warn('请先输入 API 接口地址 (Base URL)');
      return;
    }
    setIsFetchingModels(true);
    sound.playTap();
    try {
      const models = await fetchModelsFromProvider(activeBaseUrl.trim(), activeApiKey.trim());
      setAvailableModelsList(models);
      if (models.length > 0 && (!activeModel || !models.includes(activeModel))) {
        setActiveModel(models[0]);
      }
      sound.playSuccess();
      toast.success(`成功获取到 ${models.length} 个可用大模型，已更新至模型选择列表`);

      // Auto persist fetched models
      const updated = providers.map(p =>
        p.id === currentCustomProvider.id
          ? {
              ...p,
              availableModels: models,
              defaultModel: models.includes(activeModel) ? activeModel : models[0],
            }
          : p
      );
      onUpdateProviders(updated);
      db.saveAIProviders(updated);
    } catch (err: any) {
      toast.error(`获取模型失败：${err.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Quick switch between user's two test endpoints
  const handleQuickLoadPreset = (preset: AIProvider) => {
    sound.playTap();
    setActiveBaseUrl(preset.baseUrl);
    setActiveApiKey(preset.apiKey);
    setActiveModel(preset.defaultModel);
    setAvailableModelsList(preset.availableModels);

    const updated = providers.some(p => p.id === preset.id)
      ? providers.map(p => ({ ...p, isActive: p.id === preset.id }))
      : [{ ...preset, isActive: true }, ...providers.map(p => ({ ...p, isActive: false }))];

    onUpdateProviders(updated);
    db.saveAIProviders(updated);
  };

  // Save custom config
  const handleSaveCustomConfig = () => {
    sound.playSuccess();
    const modelToUse =
      customModelInputMode && customModelManualName.trim()
        ? customModelManualName.trim()
        : activeModel.trim();

    if (!modelToUse) {
      toast.warn('请先选择或输入大模型名称，或点击「获取模型」自动拉取');
      return;
    }

    const updatedList = Array.from(new Set([modelToUse, ...availableModelsList]));

    const updatedProvider: AIProvider = {
      ...currentCustomProvider,
      baseUrl: activeBaseUrl.trim(),
      apiKey: activeApiKey.trim(),
      defaultModel: modelToUse,
      availableModels: updatedList,
      isActive: true,
    };

    const nextProviders = providers.map(p =>
      p.id === currentCustomProvider.id ? updatedProvider : { ...p, isActive: false }
    );
    if (!nextProviders.some(p => p.id === updatedProvider.id)) {
      nextProviders.push(updatedProvider);
    }

    onUpdateProviders(nextProviders);
    db.saveAIProviders(nextProviders);
    setCustomModelInputMode(false);
    toast.success('大模型配置已保存并激活，当前生效模型：' + modelToUse);
  };

  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTestLatency = async (prov: AIProvider) => {
    sound.playTap();
    setTestingId(prov.id);
    const res = await testProviderLatency(prov);
    const updated = providers.map(p =>
      p.id === prov.id
        ? {
            ...p,
            latency: res.ok ? res.latency : undefined,
            lastTestedAt: new Date().toISOString(),
          }
        : p
    );
    onUpdateProviders(updated);
    db.saveAIProviders(updated);
    setTestingId(null);
    if (res.ok) {
      toast.success(`${prov.name} ${res.message}`);
    } else {
      toast.error(`${prov.name} ${res.message}`);
    }
  };

  return (
    <Screen className="max-w-3xl mx-auto w-full">
      {/* Header Description Card */}
      <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sliders className="w-4 h-4 text-accent shrink-0" />
            <h4 className="text-headline font-bold text-ink truncate">自定义兼容大模型接口</h4>
          </div>
          <span className="text-caption px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold shrink-0">
            OpenAI 协议兼容
          </span>
        </div>
        <p className="text-caption text-ink-2 leading-relaxed">
          支持任意 OpenAI 格式的兼容端点。可一键拉取远端全部可用模型，无需繁杂厂商预设，统一极简管理。
        </p>
      </div>

      {/* Quick Test Switcher */}
      <div className="mt-4">
        <SectionHeader
          title="快速载入测试端点"
          action={<span className="text-caption text-ink-3">点击自动填入配置</span>}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_PRESETS.map(({ preset, label, host, match }) => {
            const isActive = currentCustomProvider.baseUrl.includes(match);
            return (
              <button
                key={match}
                type="button"
                onClick={() => handleQuickLoadPreset(preset)}
                className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 tactile-press ${
                  isActive
                    ? 'border-accent bg-accent/5 shadow-elev-1'
                    : 'border-line bg-surface hover:bg-surface-2/50'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sub font-bold text-ink truncate">{label}</div>
                  <div className="text-caption text-ink-3 font-mono truncate">{host}</div>
                </div>
                {isActive && <Check className="w-4 h-4 text-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 space-y-4 mt-4">
        {/* Field 1: 服务提供商 */}
        <Field label="服务提供商">
          <div className="px-3.5 py-2.5 rounded-xl bg-surface-2 text-sub font-semibold text-ink flex items-center justify-between gap-2">
            <span>自定义兼容接口 (Custom Endpoint)</span>
            <span className="text-caption text-ink-3 font-mono shrink-0">/v1/chat/completions</span>
          </div>
        </Field>

        {/* Field 2: API 接口地址 (Base URL) */}
        <Field label="API 接口地址 (Base URL)" required hint="支持 /v1 或兼容网关">
          <Input
            type="text"
            required
            value={activeBaseUrl}
            onChange={e => setActiveBaseUrl(e.target.value)}
            placeholder="例如：https://token.sensenova.cn/v1"
            className="font-mono"
          />
        </Field>

        {/* Field 3: API 密钥 (API Key) 带显隐切换 */}
        <Field label="API 密钥 (API Key)" hint="本地安全加密存储">
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={activeApiKey}
              onChange={e => setActiveApiKey(e.target.value)}
              placeholder="sk-… 或 API Key"
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-3 hover:text-ink transition"
              title={showApiKey ? '隐藏密钥' : '显示密钥'}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        {/* Field 4: 模型名称 (Model Identifier) + 获取模型按钮 */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="text-caption font-semibold text-ink-2 select-none">
              模型名称 (Model Identifier)
              <span className="text-danger ml-0.5">*</span>
            </label>
            <button
              type="button"
              onClick={() => setCustomModelInputMode(!customModelInputMode)}
              className="text-caption text-accent hover:underline font-semibold select-none"
            >
              {customModelInputMode ? '从已发现模型选择' : '手动自由输入'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {customModelInputMode ? (
              <Input
                type="text"
                value={customModelManualName || activeModel}
                onChange={e => {
                  setCustomModelManualName(e.target.value);
                  setActiveModel(e.target.value);
                }}
                placeholder="例如：deepseek-v4-flash 或 gemini-3.5-flash-lite"
                className="flex-1 font-mono"
              />
            ) : (
              <div className="relative flex-1">
                <Select
                  value={activeModel}
                  onChange={e => setActiveModel(e.target.value)}
                  className="pr-8 font-mono cursor-pointer"
                  aria-label="选择模型"
                >
                  {availableModelsList.length === 0 ? (
                    <option value="">未配置模型 (请点击「获取模型」或手动输入)</option>
                  ) : (
                    <>
                      {!activeModel && <option value="">-- 请选择模型 --</option>}
                      {availableModelsList.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </>
                  )}
                </Select>
                <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <Button
              type="button"
              variant="soft"
              size="md"
              onClick={handleFetchModels}
              disabled={isFetchingModels || !activeBaseUrl.trim()}
              className="shrink-0"
              title="发送请求至 /models 自动获取全部可用模型"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingModels ? 'animate-spin' : ''}`} />
              <span>{isFetchingModels ? '获取中…' : '获取模型'}</span>
            </Button>
          </div>

          {availableModelsList.length > 0 && (
            <p className="text-caption text-accent mt-1.5 font-medium">
              已获取 {availableModelsList.length} 个可用模型，已更新至选择列表
            </p>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="pt-3.5 flex items-center justify-between gap-2 border-t border-line/70">
          <Button
            type="button"
            variant="neutral"
            size="md"
            onClick={() =>
              handleTestLatency({
                ...currentCustomProvider,
                baseUrl: activeBaseUrl,
                apiKey: activeApiKey,
                defaultModel: activeModel,
              })
            }
            disabled={testingId !== null}
          >
            <Zap className={`w-4 h-4 text-warn ${testingId !== null ? 'animate-spin' : ''}`} />
            <span>{testingId !== null ? '测通中…' : '测通 (Ping)'}</span>
          </Button>

          <Button type="button" variant="primary" size="md" onClick={handleSaveCustomConfig} haptic="medium">
            <Check className="w-4 h-4" />
            <span>保存并立即生效</span>
          </Button>
        </div>
      </div>

      {/* Current Active Status Card */}
      <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="text-sub font-bold text-ink">当前对话生效模型</span>
          </div>
          <div className="text-caption text-ink-2 font-mono truncate">{currentCustomProvider.defaultModel || '（尚未配置模型）'}</div>
        </div>
        {currentCustomProvider.latency && (
          <div className="flex items-center gap-1 text-caption px-2 py-1 rounded-full bg-accent/10 text-accent font-mono font-bold shrink-0">
            <Zap className="w-3 h-3" />
            <span>{currentCustomProvider.latency}ms</span>
          </div>
        )}
      </div>
    </Screen>
  );
};
