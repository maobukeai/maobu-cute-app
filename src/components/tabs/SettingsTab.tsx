import React, { useState, useMemo } from 'react';
import { AppSettings, ThemeMode, AccentColor, DeviceFrame } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { WebDAVSyncCard } from '../WebDAVSyncCard';
import {
  Sun,
  Moon,
  Laptop,
  Palette,
  Volume2,
  VolumeX,
  Smartphone,
  Download,
  Upload,
  RotateCcw,
  Check,
  ShieldCheck,
  HardDrive,
  Copy,
} from 'lucide-react';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onRefreshAllData: () => void;
}

type SettingsSection = 'all' | 'appearance' | 'sync' | 'data';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('all');
  const [copiedVersion, setCopiedVersion] = useState(false);
  const [catMoodIndex, setCatMoodIndex] = useState(0);

  const catMoods = [
    { text: '元气满满 😸', quote: '今天也要踏着轻巧的猫步向前走！' },
    { text: '离线守护 🛡️', quote: '所有数据纯本地存储，绝不泄露隐私。' },
    { text: '灵感爆棚 🐾', quote: '每一个好点子都值得被快速记录。' },
    { text: '温暖相伴 🍵', quote: '累了就摸摸猫猫，稍作休息吧。' },
  ];

  // Dynamic local storage metrics
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
  }, [settings]);

  // Handlers
  const handleThemeChange = (themeMode: ThemeMode) => {
    sound.playTap();
    onUpdateSettings({ ...settings, themeMode });
  };

  const handleAccentChange = (accentColor: AccentColor) => {
    sound.playTap();
    onUpdateSettings({ ...settings, accentColor });
  };

  const handleToggleSound = () => {
    const nextSound = !settings.soundEnabled;
    sound.toggleSound(nextSound);
    if (nextSound) sound.playTap();
    onUpdateSettings({ ...settings, soundEnabled: nextSound });
  };

  const handleTestSound = () => {
    sound.playCelebration();
  };

  const handleToggleDeviceFrame = () => {
    sound.playTap();
    const nextFrame: DeviceFrame = settings.deviceFrame === 'mobile' ? 'desktop' : 'mobile';
    onUpdateSettings({ ...settings, deviceFrame: nextFrame });
  };

  const handleExportData = () => {
    sound.playTap();
    try {
      const data = db.exportFullBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maobu_cute_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      sound.playSuccess();
    } catch {
      alert('导出备份失败');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playTap();
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (db.importFullBackup(json)) {
          sound.playSuccess();
          onRefreshAllData();
          alert('🎉 全量数据恢复成功！');
        } else {
          alert('备份文件格式不兼容');
        }
      } catch {
        alert('解析备份文件失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    sound.playTap();
    const confirmed = window.confirm('⚠️ 警告：此操作将清空所有本地数据并恢复出厂设置！\n\n确认重置？');
    if (confirmed) {
      db.clearAllData();
      sound.playSuccess();
      window.location.reload();
    }
  };

  const handlePetCat = () => {
    sound.playCelebration();
    setCatMoodIndex(prev => (prev + 1) % catMoods.length);
  };

  const copyVersion = () => {
    navigator.clipboard.writeText('v1.0.0 Release (AES-256 / React 19)');
    setCopiedVersion(true);
    sound.playTap();
    setTimeout(() => setCopiedVersion(false), 2000);
  };

  const accentColors: { id: AccentColor; label: string; bg: string }[] = [
    { id: 'wechat', label: '微信绿', bg: 'bg-[#07C160]' },
    { id: 'catpaw', label: '猫爪粉', bg: 'bg-pink-500' },
    { id: 'apple', label: '苹果蓝', bg: 'bg-blue-500' },
    { id: 'orange', label: '暖阳橙', bg: 'bg-amber-500' },
    { id: 'purple', label: '梦幻紫', bg: 'bg-purple-500' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#EDEDED] dark:bg-[#111111]">
      <div
        id="settings-scroll-container"
        className="flex-1 overflow-y-auto px-2.5 sm:px-3 py-2 space-y-2 pb-24"
      >
        {/* 1. Ultra-Compact Micro-Hero Bar (44px) */}
        <div className="glass-card px-2.5 py-1.5 rounded-xl flex items-center justify-between border border-white/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={handlePetCat}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-200 via-rose-200 to-pink-300 flex items-center justify-center text-base shadow-xs hover:scale-105 active:scale-95 transition shrink-0"
              title="轻触摸摸猫猫 🐾"
            >
              🐱
            </button>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">猫步可爱</span>
                <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-semibold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                {catMoods[catMoodIndex].text} · {catMoods[catMoodIndex].quote}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
            <ShieldCheck className="w-3 h-3" />
            <span>本地沙箱</span>
          </div>
        </div>

        {/* 2. Micro Segmented Filter (精凑快速定位标签) */}
        <div className="flex items-center justify-between bg-zinc-200/70 dark:bg-zinc-800/60 p-0.5 rounded-xl text-[11px]">
          {[
            { id: 'all', label: '全部' },
            { id: 'appearance', label: '🎨 外观' },
            { id: 'sync', label: '☁️ 同步' },
            { id: 'data', label: '💾 数据' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                sound.playTap();
                setActiveSection(tab.id as SettingsSection);
              }}
              className={`flex-1 py-1 text-center font-medium rounded-lg transition-all ${
                activeSection === tab.id
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. Section: Appearance & Audio (紧凑外观与音效) */}
        {(activeSection === 'all' || activeSection === 'appearance') && (
          <div className="glass-card p-2.5 rounded-2xl border border-white/80 dark:border-zinc-800/80 shadow-ios space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center space-x-1">
                <Palette className="w-3.5 h-3.5 text-pink-500" />
                <span>外观风格与触觉</span>
              </span>
              <button
                onClick={handleToggleDeviceFrame}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5"
              >
                <Smartphone className="w-3 h-3" />
                <span>{settings.deviceFrame === 'mobile' ? '手机机身' : '宽屏模式'}</span>
              </button>
            </div>

            {/* Theme 3-Way Segmented Row */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-[11px]">
              <button
                onClick={() => handleThemeChange('light')}
                className={`py-1 rounded-lg flex items-center justify-center space-x-1 transition ${
                  settings.themeMode === 'light'
                    ? 'bg-white text-zinc-900 shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>浅色</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`py-1 rounded-lg flex items-center justify-center space-x-1 transition ${
                  settings.themeMode === 'dark'
                    ? 'bg-zinc-700 text-white shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Moon className="w-3 h-3 text-blue-400" />
                <span>深色</span>
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`py-1 rounded-lg flex items-center justify-center space-x-1 transition ${
                  settings.themeMode === 'system'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Laptop className="w-3 h-3 text-zinc-500" />
                <span>跟随</span>
              </button>
            </div>

            {/* Accent Color Dot Row + Sound Toggle Row (Integrated) */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
              {/* 5 Dots */}
              <div className="flex items-center space-x-1.5">
                {accentColors.map(color => {
                  const isSelected = (settings.accentColor || 'wechat') === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => handleAccentChange(color.id)}
                      title={color.label}
                      className={`w-6 h-6 rounded-full ${color.bg} flex items-center justify-center transition transform active:scale-90 ${
                        isSelected ? 'ring-2 ring-offset-1 ring-zinc-400 dark:ring-zinc-600 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              {/* Sound switch & Preview */}
              <div className="flex items-center space-x-1 text-[10px]">
                <button
                  onClick={handleTestSound}
                  className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                >
                  ▷ 试听
                </button>
                <button
                  onClick={handleToggleSound}
                  className={`px-2 py-0.5 rounded-full font-medium flex items-center space-x-0.5 transition ${
                    settings.soundEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {settings.soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  <span>{settings.soundEnabled ? '音效开' : '静音'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Section: WebDAV Cloud Sync (高密度紧凑 WebDAV) */}
        {(activeSection === 'all' || activeSection === 'sync') && (
          <WebDAVSyncCard onDataRestored={onRefreshAllData} accentColor={settings.accentColor} />
        )}

        {/* 5. Section: Data Management (紧凑数据指标与管理) */}
        {(activeSection === 'all' || activeSection === 'data') && (
          <div className="glass-card p-2.5 rounded-2xl border border-white/80 dark:border-zinc-800/80 shadow-ios space-y-2 text-xs">
            {/* Header & Single-line Stats Bar */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center space-x-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                <span>本地数据资产</span>
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                占用约 <strong className="text-zinc-800 dark:text-zinc-200">{storageMetrics.estimatedKB} KB</strong>
              </span>
            </div>

            {/* Ultra-Compact 4-Pill Stats Strip */}
            <div className="grid grid-cols-4 gap-1 text-center bg-zinc-100/90 dark:bg-zinc-800/80 p-1.5 rounded-xl">
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{storageMetrics.plansTotal}</div>
                <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">计划({storageMetrics.pendingPlans})</div>
              </div>
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{storageMetrics.notesCount}</div>
                <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">灵感笔记</div>
              </div>
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{storageMetrics.credentialsCount}</div>
                <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">密码/2FA</div>
              </div>
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{storageMetrics.cloudAccountsCount}</div>
                <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">微软/谷歌</div>
              </div>
            </div>

            {/* Quick Action Buttons (Export & Import in 1 Row) */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={handleExportData}
                className="h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-[11px] flex items-center justify-center space-x-1 transition active:scale-95"
              >
                <Download className="w-3 h-3 text-blue-500" />
                <span>全量导出 (JSON)</span>
              </button>

              <label className="h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition active:scale-95">
                <Upload className="w-3 h-3 text-emerald-500" />
                <span>导入备份恢复</span>
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
            </div>

            {/* Compact Danger Reset Row */}
            <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px]">
              <span className="text-zinc-400">恢复出厂或清空缓存</span>
              <button
                onClick={handleResetData}
                className="text-rose-500 hover:text-rose-600 font-semibold flex items-center space-x-0.5 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>清空数据重置</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. Footer: About Info (单行折叠式) */}
        <div className="py-1 px-2 text-center text-[10px] text-zinc-400 space-y-0.5">
          <button
            onClick={copyVersion}
            className="hover:text-zinc-600 dark:hover:text-zinc-200 transition inline-flex items-center space-x-1"
          >
            <span>猫步可爱 v1.0.0 Release · React 19 + AES-256</span>
            {copiedVersion ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-zinc-400" />}
          </button>
          <div className="text-zinc-400/80">🐾 让每一个重要目标与灵感都能轻巧落地</div>
        </div>
      </div>
    </div>
  );
};
