import React, { useState, useMemo } from 'react';
import { AppSettings, ThemeMode, AccentColor, DeviceFrame } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { ACCENTS, ACCENT_ORDER, applyAccent } from '../../utils/theme';
import { WebDAVSyncCard } from '../WebDAVSyncCard';
import { AboutSection } from '../AboutSection';
import { Screen, SegmentedControl, Switch, Button, useToast } from '../ui';
import {
  RotateCcw,
  Check,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onRefreshAllData: () => void;
  onOpenAbout?: () => void;
  hasUpdate?: boolean;
}

type SettingsSection = 'all' | 'appearance' | 'sync' | 'data' | 'about';

/** Inset grouped list row (iOS settings style). */
const Row: React.FC<{
  label: string;
  hint?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}> = ({ label, hint, right, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3.5 ${onClick ? 'cursor-pointer active:bg-surface-2/60 transition' : ''} ${
      hint ? 'items-start' : ''
    }`}
  >
    <div className="flex-1 min-w-0">
      <div className="text-sub font-medium text-ink">{label}</div>
      {hint && <div className="text-caption text-ink-3 mt-0.5 leading-snug">{hint}</div>}
    </div>
    {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
  </div>
);

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
  onOpenAbout: _onOpenAbout,
  hasUpdate,
}) => {
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>('all');

  const storageMetrics = useMemo(() => {
    try {
      const plans = db.getPlans();
      const notes = db.getNotes();
      const passwords = db.getPasswords();
      const tokens = db.get2FATokens();
      const hotmails = db.getHotmailAccounts();
      const googleAccounts = db.getGoogleAccounts?.() || [];

      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('maobu_')) {
          totalBytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
        }
      }

      return {
        plansTotal: plans.length,
        pendingPlans: plans.filter(p => !p.completedAt).length,
        notesCount: notes.length,
        credentialsCount: passwords.length + tokens.length,
        cloudAccountsCount: hotmails.length + googleAccounts.length,
        estimatedKB: Math.max(1, Math.round(totalBytes / 1024)),
      };
    } catch {
      return {
        plansTotal: 0,
        pendingPlans: 0,
        notesCount: 0,
        credentialsCount: 0,
        cloudAccountsCount: 0,
        estimatedKB: 12,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // ── Handlers (persist + apply immediately) ───────────────────
  const commit = (updated: AppSettings) => {
    db.saveSettings(updated);
    onUpdateSettings(updated);
  };

  const handleThemeChange = (themeMode: ThemeMode) => {
    commit({ ...settings, themeMode });
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeMode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.toggle(
        'dark',
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
  };

  const handleAccentChange = (accentColor: AccentColor) => {
    haptics.selection();
    sound.playTap();
    commit({ ...settings, accentColor });
    applyAccent(accentColor);
  };

  const handleToggleSound = () => {
    const nextSound = !settings.soundEnabled;
    sound.toggleSound(nextSound);
    haptics.selection();
    if (nextSound) sound.playTap();
    commit({ ...settings, soundEnabled: nextSound });
  };

  const handleToggleHaptics = () => {
    const nextHaptics = !(settings.hapticsEnabled !== false);
    haptics.setEnabled(nextHaptics);
    if (nextHaptics) haptics.notificationSuccess();
    sound.playTap();
    commit({ ...settings, hapticsEnabled: nextHaptics });
  };

  const handleTestSound = () => {
    haptics.notificationSuccess();
    sound.playCelebration();
  };

  const handleToggleDeviceFrame = () => {
    const nextFrame: DeviceFrame = settings.deviceFrame === 'mobile' ? 'desktop' : 'mobile';
    commit({ ...settings, deviceFrame: nextFrame });
  };

  const handleExportData = () => {
    try {
      const data = db.exportFullBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maobu_cute_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('备份已导出');
    } catch {
      toast.error('导出备份失败');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (db.importFullBackup(json)) {
          onRefreshAllData();
          toast.success('全量数据恢复成功');
        } else {
          toast.error('备份文件格式不兼容');
        }
      } catch {
        toast.error('解析备份文件失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = async () => {
    const confirmed = await toast.confirm({
      title: '清空所有数据？',
      message: '此操作将清除全部本地数据并恢复出厂设置，且无法撤销。',
      confirmText: '清空重置',
      danger: true,
    });
    if (confirmed) {
      db.clearAllData();
      sound.playSuccess();
      window.location.reload();
    }
  };

  const showSection = (s: SettingsSection) => activeSection === 'all' || activeSection === s;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden cat-bg-canvas">
      <Screen className="max-w-2xl mx-auto w-full">
        {/* Profile hero */}
        <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-hover text-white flex items-center justify-center font-bold text-base shadow-sm border border-line/40 shrink-0 select-none">
              MB
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-headline font-bold text-ink truncate">猫步可爱</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold font-mono">
                  v0.1.1
                </span>
              </div>
              <p className="text-caption text-ink-3 mt-0.5 truncate">
                本地沙箱加密存储 · 离线全功能
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-ok font-semibold text-caption shrink-0 bg-ok/10 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">本地沙箱</span>
          </div>
        </div>

        {/* Section filter */}
        <SegmentedControl
          groupId="settings-sections"
          size="sm"
          className="mb-4"
          value={activeSection}
          onChange={id => setActiveSection(id as SettingsSection)}
          items={[
            { id: 'all', label: '全部' },
            { id: 'appearance', label: '外观' },
            { id: 'sync', label: '同步' },
            { id: 'data', label: '数据' },
            { id: 'about', label: '关于' },
          ]}
        />

        {/* ── Appearance ─────────────────────────────────────── */}
        {showSection('appearance') && (
          <div className="bg-surface rounded-2xl border border-line shadow-elev-1 divide-y divide-line/70 mb-4 overflow-hidden">
            <Row
              label="外观模式"
              right={
                <SegmentedControl
                  groupId="settings-theme"
                  size="sm"
                  value={settings.themeMode}
                  onChange={id => handleThemeChange(id as ThemeMode)}
                  items={[
                    { id: 'light', label: '浅色' },
                    { id: 'dark', label: '深色' },
                    { id: 'system', label: '跟随' },
                  ]}
                />
              }
            />
            <Row
              label="主题色"
              hint="应用于全局强调色、按钮与进度环"
              right={
                <div className="flex items-center gap-2">
                  {ACCENT_ORDER.map(id => {
                    const def = ACCENTS[id];
                    const isSelected = (settings.accentColor || 'apple') === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleAccentChange(id)}
                        title={id}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                          isSelected ? 'ring-2 ring-offset-2 ring-accent scale-105' : 'opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: def.hex }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              }
            />
            <Row
              label="提示音"
              hint="轻触、完成的合成音效"
              right={
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestSound}
                    className="text-caption font-semibold text-accent px-2.5 py-1 rounded-full bg-accent/10 tactile-press"
                  >
                    试听
                  </button>
                  <Switch checked={settings.soundEnabled} onChange={handleToggleSound} />
                </div>
              }
            />
            <Row
              label="触感反馈"
              hint="操作时的轻微震动"
              right={<Switch checked={settings.hapticsEnabled !== false} onChange={handleToggleHaptics} />}
            />
            <Row
              label="宽屏工作台预览"
              hint="仅在宽屏浏览器窗口生效，手机端始终全屏"
              right={<Switch checked={settings.deviceFrame === 'desktop'} onChange={handleToggleDeviceFrame} />}
            />
          </div>
        )}

        {/* ── Sync ───────────────────────────────────────────── */}
        {showSection('sync') && (
          <div className="mb-4">
            <WebDAVSyncCard onDataRestored={onRefreshAllData} accentColor={settings.accentColor} />
          </div>
        )}

        {/* ── Data ───────────────────────────────────────────── */}
        {showSection('data') && (
          <>
            <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sub font-semibold text-ink">本地数据</span>
                <span className="text-caption text-ink-3">占用约 {storageMetrics.estimatedKB} KB</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: storageMetrics.plansTotal, label: `计划（待办 ${storageMetrics.pendingPlans}）` },
                  { value: storageMetrics.notesCount, label: '笔记' },
                  { value: storageMetrics.credentialsCount, label: '密码/2FA' },
                  { value: storageMetrics.cloudAccountsCount, label: '云账号' },
                ].map(item => (
                  <div key={item.label} className="bg-surface-2/70 rounded-xl py-2.5 px-1 text-center">
                    <div className="text-headline font-bold text-ink">{item.value}</div>
                    <div className="text-[11px] text-ink-3 mt-0.5 truncate px-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface rounded-2xl border border-line shadow-elev-1 divide-y divide-line/70 mb-4 overflow-hidden">
              <Row
                label="导出全量备份"
                hint="包含计划、笔记、凭据的 JSON 文件"
                onClick={handleExportData}
                right={<span className="text-caption text-ink-3">导出</span>}
              />
              <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-surface-2/60 transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sub font-medium text-ink">导入备份恢复</div>
                  <div className="text-caption text-ink-3 mt-0.5">选择此前导出的 JSON 备份文件</div>
                </div>
                <span className="text-caption text-accent font-semibold shrink-0">选择文件</span>
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
            </div>

            <Button variant="danger-soft" size="lg" className="w-full" haptic="medium" onClick={handleResetData}>
              <RotateCcw className="w-4 h-4" />
              <span>清空数据并重置</span>
            </Button>
          </>
        )}

        {/* ── About Section / Content ────────────────────────────── */}
        {activeSection === 'about' ? (
          <div className="pt-1 pb-6">
            <AboutSection
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        ) : (
          (showSection('about') || activeSection === 'all') && (
            <div className="bg-surface rounded-2xl border border-line shadow-elev-1 divide-y divide-line/70 mb-4 overflow-hidden">
              <Row
                label="关于猫步可爱"
                hint="软件信息、架构特性与自动更新检查"
                onClick={() => {
                  sound.playTap();
                  setActiveSection('about');
                }}
                right={
                  <div className="flex items-center gap-1.5 text-caption text-ink-3">
                    {hasUpdate && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                    <span className="font-semibold text-ink-2">v0.1.1 (Android)</span>
                    <ChevronRight className="w-4 h-4 text-ink-3" />
                  </div>
                }
              />
            </div>
          )
        )}

        {/* Footer */}
        {activeSection !== 'about' && (
          <div className="py-5 text-center text-caption text-ink-3 space-y-1">
            <button
              onClick={() => {
                sound.playTap();
                setActiveSection('about');
              }}
              className="hover:text-accent transition inline-flex items-center gap-1.5 font-medium"
            >
              <span>关于猫步可爱 v0.1.1 (Android 正式版)</span>
            </button>
            <div className="text-ink-3/70">让每一个重要目标与灵感都能轻巧落地</div>
          </div>
        )}
      </Screen>
    </div>
  );
};
