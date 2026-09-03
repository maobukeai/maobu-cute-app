import React, { useState } from 'react';
import { AppSettings, FullAppBackup, AccentColor, ThemeMode, DeviceFrame } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import {
  Palette,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Download,
  Upload,
  Trash2,
  Shield,
  Info,
  ChevronRight,
  Sparkles,
  Check,
  Moon,
  Sun,
  Laptop,
  Globe,
} from 'lucide-react';
import { WebDAVSyncCard } from '../WebDAVSyncCard';
import { importGoogleAccountsFromJSON } from '../../utils/googleWarming';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onRefreshAllData: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
}) => {
  const [copiedStatus, setCopiedStatus] = useState(false);

  // Sound toggle
  const handleToggleSound = () => {
    const nextVal = !settings.soundEnabled;
    sound.isEnabled = nextVal;
    if (nextVal) sound.playSuccess();
    const updated: AppSettings = { ...settings, soundEnabled: nextVal };
    onUpdateSettings(updated);
    db.saveSettings(updated);
  };

  // Theme mode toggle
  const handleSelectTheme = (mode: ThemeMode) => {
    sound.playToggle();
    const updated: AppSettings = { ...settings, themeMode: mode };
    onUpdateSettings(updated);
    db.saveSettings(updated);

    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Accent color selector
  const handleSelectAccent = (accent: AccentColor) => {
    sound.playTap();
    const updated: AppSettings = { ...settings, accentColor: accent };
    onUpdateSettings(updated);
    db.saveSettings(updated);

    // Update CSS custom properties
    let hex = '#07C160';
    let light = '#E8F8F0';
    let bubble = '#95EC69';

    if (accent === 'catpaw') {
      hex = '#FF6B8B';
      light = '#FFF0F3';
      bubble = '#FF8DA6';
    } else if (accent === 'apple') {
      hex = '#007AFF';
      light = '#EBF4FF';
      bubble = '#5AC8FA';
    } else if (accent === 'orange') {
      hex = '#FF9500';
      light = '#FFF6EB';
      bubble = '#FFB340';
    } else if (accent === 'purple') {
      hex = '#AF52DE';
      light = '#F8EDFF';
      bubble = '#DA8FFF';
    }

    document.documentElement.style.setProperty('--theme-accent', hex);
    document.documentElement.style.setProperty('--theme-accent-light', light);
    document.documentElement.style.setProperty('--theme-bubble', bubble);
  };

  // Device frame toggle
  const handleToggleDeviceFrame = () => {
    sound.playToggle();
    const nextFrame: DeviceFrame = settings.deviceFrame === 'mobile' ? 'desktop' : 'mobile';
    const updated: AppSettings = { ...settings, deviceFrame: nextFrame };
    onUpdateSettings(updated);
    db.saveSettings(updated);
  };

  // Export Full Backup
  const handleExportBackup = () => {
    sound.playSuccess();
    const backup = db.exportFullBackup();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maobu_cute_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Backup (Smart multi-format detection: Maobu Full Backup or 3D Platform Export)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Case 1: Standard Maobu FullAppBackup
        if (parsed && parsed.version && (parsed.plans || parsed.notes || parsed.passwords || parsed.googleWarmingAccounts)) {
          const success = db.importFullBackup(parsed);
          if (success) {
            sound.playSuccess();
            onRefreshAllData();
            alert('🎉 数据恢复成功！所有计划、笔记、密码、2FA、微软邮箱与谷歌养号数据已完整还原。');
            return;
          }
        }

        // Case 2: 3D Platform Google Warming Backup (version: 1, accounts: [...]) OR raw array
        const rawList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.accounts)
          ? parsed.accounts
          : null;

        if (rawList && rawList.length > 0) {
          // Check if it's Microsoft Hotmail accounts
          const isHotmail = rawList.some((item: any) => item.clientId || item.refreshToken);
          if (isHotmail) {
            const currentHotmail = db.getHotmailAccounts();
            const existingEmailSet = new Set(currentHotmail.map(a => a.email.toLowerCase()));
            const newHotmail = rawList.filter((item: any) => item.email && !existingEmailSet.has(item.email.toLowerCase()));
            db.saveHotmailAccounts([...newHotmail, ...currentHotmail]);
            sound.playSuccess();
            onRefreshAllData();
            alert(`🎉 成功导入 ${newHotmail.length} 个微软邮箱账号！`);
            return;
          } else {
            // Google Warming accounts
            const currentGoogle = db.getGoogleAccounts();
            const res = importGoogleAccountsFromJSON(text, currentGoogle);
            db.saveGoogleAccounts(res.updatedAccounts);
            sound.playSuccess();
            onRefreshAllData();
            alert(`🎉 成功导入 3D 平台谷歌养号数据！\n已成功录入 ${res.importedCount} 个账号 (跳过重复 ${res.skippedCount} 个)`);
            return;
          }
        }

        alert('未识别到兼容的备份数据格式');
      } catch (err: any) {
        alert('解析备份 JSON 失败，请检查文件完整性: ' + (err.message || ''));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear all data
  const handleClearAll = () => {
    const confirmed = window.confirm(
      '⚠️ 危险操作警告：\n确定要清空全部本地数据吗？此操作无法撤销，建议先导出备份！'
    );
    if (confirmed) {
      db.clearAllData();
      sound.playTap();
      onRefreshAllData();
      alert('所有本地数据已重置清空');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#EDEDED] dark:bg-[#111111]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {/* Profile Card (WeChat / iOS Settings Hero) */}
        <div className="glass-card p-4 rounded-3xl shadow-ios border border-white/80 dark:border-zinc-800/80 flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6B8B] via-pink-300 to-amber-200 flex items-center justify-center text-2xl shadow-sm ring-2 ring-white dark:ring-zinc-700">
            🐱
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                猫步可爱 (Maobu Cute)
              </h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 font-bold">
                PRO MAX
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              微信极简苹果质感 · 本地优先离线加密
            </p>
            <div className="flex items-center space-x-2 mt-1 text-[10px] text-zinc-400">
              <span className="flex items-center space-x-0.5 text-[#07C160]">
                <Shield className="w-3 h-3 mr-0.5" />
                本地加密防护
              </span>
              <span>·</span>
              <span>100% 隐私无泄露</span>
            </div>
          </div>
        </div>

        {/* Group 1: 外观与交互 (Appearance & Audio) */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-2 uppercase tracking-wider">
            外观风格与触觉
          </h4>
          <div className="glass-card rounded-2xl shadow-ios border border-white/80 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {/* Theme mode */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">深浅色主题</span>
              </div>
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
                {[
                  { id: 'light', label: '浅色', icon: Sun },
                  { id: 'dark', label: '深色', icon: Moon },
                  { id: 'system', label: '跟随', icon: Laptop },
                ].map(item => {
                  const isCur = settings.themeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTheme(item.id as ThemeMode)}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                        isCur
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <item.icon className="w-3 h-3" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent color */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Palette className="w-4 h-4 text-[#FF6B8B]" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">系统主色调</span>
              </div>
              <div className="flex items-center space-x-2">
                {[
                  { id: 'wechat', color: '#07C160', name: '微信绿' },
                  { id: 'catpaw', color: '#FF6B8B', name: '猫爪粉' },
                  { id: 'apple', color: '#007AFF', name: '苹果蓝' },
                  { id: 'orange', color: '#FF9500', name: '暖阳橙' },
                  { id: 'purple', color: '#AF52DE', name: '梦幻紫' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectAccent(c.id as AccentColor)}
                    style={{ backgroundColor: c.color }}
                    className={`w-6 h-6 rounded-full shadow-xs transition-transform flex items-center justify-center text-white ${
                      settings.accentColor === c.id ? 'scale-115 ring-2 ring-offset-2 ring-zinc-400' : 'hover:scale-105'
                    }`}
                    title={c.name}
                  >
                    {settings.accentColor === c.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound toggle */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#07C160]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                )}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  按键与庆祝微音效 (Web Audio)
                </span>
              </div>
              <button
                onClick={handleToggleSound}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  settings.soundEnabled ? 'bg-[#07C160]' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            {/* Frame mode switch */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {settings.deviceFrame === 'mobile' ? (
                  <Smartphone className="w-4 h-4 text-blue-500" />
                ) : (
                  <Monitor className="w-4 h-4 text-purple-500" />
                )}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  机身仿真模式
                </span>
              </div>
              <button
                onClick={handleToggleDeviceFrame}
                className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold transition"
              >
                {settings.deviceFrame === 'mobile' ? '切换为宽屏桌面' : '切换为手机机身'}
              </button>
            </div>
          </div>
        </div>

        {/* WebDAV Cloud Sync Card (Matches user reference exactly) */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-2 uppercase tracking-wider">
            云端备份与跨设备同步
          </h4>
          <WebDAVSyncCard onDataRestored={onRefreshAllData} />
        </div>

        {/* Group 2: 本地数据与离线备份 (Data & Backup) */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-2 uppercase tracking-wider">
            本地数据与离线导出
          </h4>
          <div className="glass-card rounded-2xl shadow-ios border border-white/80 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {/* Export */}
            <button
              onClick={handleExportBackup}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
            >
              <div className="flex items-center space-x-2.5">
                <Download className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                    一键导出全量数据 (JSON)
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    备份所有计划、笔记、密码箱、2FA、微软邮箱与 AI 记录
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Import */}
            <label className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <Upload className="w-4 h-4 text-[#07C160]" />
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5">
                    <span>从备份文件恢复数据</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                      兼容3D平台
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    支持猫步全量备份或 3D 学习平台导出的谷歌养号与微软邮箱 JSON 文件
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </label>

            {/* Clear All */}
            <button
              onClick={handleClearAll}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-red-50 dark:hover:bg-red-950/30 transition text-red-600"
            >
              <div className="flex items-center space-x-2.5">
                <Trash2 className="w-4 h-4" />
                <div>
                  <div className="font-semibold">重置清空全部数据</div>
                  <p className="text-[10px] text-red-400">
                    清除本地存储并恢复出厂初始状态
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Group 3: 关于与技术栈规范 (About & Specs) */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-2 uppercase tracking-wider">
            关于与前沿架构
          </h4>
          <div className="glass-card p-3.5 rounded-2xl shadow-ios border border-white/80 dark:border-zinc-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">系统架构</span>
              <span className="font-mono text-zinc-500">React 19 + TypeScript + Vite 6</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">加密引擎</span>
              <span className="font-mono text-zinc-500">PBKDF2 + AES-256-GCM + TOTP RFC 6238</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">微软接口转发</span>
              <span className="font-mono text-zinc-500">Vite Zero-CORS Local Proxy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">版本号</span>
              <span className="font-mono text-zinc-500">v1.0.0 (Release)</span>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 leading-relaxed text-center">
              🐾 【猫步可爱】让每一个重要目标与生活灵感都能轻巧落地。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
