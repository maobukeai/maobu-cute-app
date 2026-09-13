import React from 'react';
import {
  Smartphone,
  Maximize2,
  CalendarCheck,
  StickyNote,
  ShieldCheck,
  Bot,
  Settings as SettingsIcon,
  Search,
  Cloud,
  Sun,
  Moon,
  HardDrive,
  Lightbulb,
  LayoutGrid,
} from 'lucide-react';
import { DeviceFrame, AppTab, AccentColor } from '../types';
import { Capacitor } from '@capacitor/core';
import { sound } from '../utils/sound';
import { haptics } from '../utils/haptics';
import { useIsWideScreen } from '../hooks/useMediaQuery';

interface MobileFrameProps {
  deviceFrame: DeviceFrame;
  onToggleFrame: () => void;
  activeTab?: AppTab;
  onSelectTab?: (tab: AppTab) => void;
  accentColor?: AccentColor;
  pendingPlansCount?: number;
  plansCount?: number;
  notesCount?: number;
  vaultCount?: number;
  onOpenSearch?: () => void;
  webdavConfigured?: boolean;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  deviceFrame,
  onToggleFrame,
  activeTab = 'plans',
  onSelectTab = () => {},
  accentColor: _accentColor = 'apple',
  pendingPlansCount = 0,
  plansCount = 0,
  notesCount = 0,
  vaultCount = 0,
  onOpenSearch = () => {},
  webdavConfigured = false,
  onToggleTheme,
  isDarkMode = false,
  children,
}) => {
  // Native Android always renders the full-screen mobile branch —
  // desktop workbench / phone chassis are desktop-browser preview only.
  const isWideScreenQuery = useIsWideScreen();
  const isWideScreen = !Capacitor.isNativePlatform() && isWideScreenQuery;
  const isDesktopWorkbench = isWideScreen && deviceFrame === 'desktop';

  const handleToggle = () => {
    haptics.selection();
    sound.playToggle();
    onToggleFrame();
  };

  const navItems: Array<{ id: AppTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: '全景看板', icon: LayoutGrid },
    { id: 'plans', label: '今日计划', icon: CalendarCheck },
    { id: 'notes', label: '灵感笔记', icon: StickyNote },
    { id: 'vault', label: '密码保险', icon: ShieldCheck },
    { id: 'ai', label: 'AI 助手', icon: Bot },
    { id: 'settings', label: '系统设置', icon: SettingsIcon },
  ];

  const getAccentPill = (isActive: boolean) => {
    if (!isActive) {
      return 'text-ink-2 hover:bg-surface-2 hover:text-ink';
    }
    return 'bg-accent/10 text-accent font-bold border border-accent/20';
  };

  // 1. DESKTOP WORKBENCH MODE (≥1024px and deviceFrame === 'desktop')
  if (isDesktopWorkbench) {
    return (
      <div className="h-screen w-full cat-bg-canvas flex flex-col p-2 lg:p-3.5 antialiased selection:bg-pink-100 selection:text-pink-900 overflow-hidden">
        {/* macOS Sequoia Fluid Glass Window Chassis */}
        <div className="flex-1 w-full max-w-[1720px] mx-auto bg-surface/85 backdrop-blur-2xl rounded-2xl lg:rounded-[30px] border border-line shadow-[0_24px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-all duration-300">
          
          {/* Top macOS Sequoia Header Toolbar */}
          <header className="h-14 border-b border-line px-4 lg:px-6 flex items-center justify-between z-20 shrink-0 select-none bg-surface/60 backdrop-blur-xl">
            {/* Left: Traffic Lights + Brand */}
            <div className="flex items-center space-x-3.5">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-2xs inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-2xs inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-2xs inline-block" />
              </div>
              <div className="h-4 w-px bg-line mx-1" />
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-xs shadow-2xs select-none">
                  MB
                </div>
                <span className="text-base font-bold text-ink tracking-tight flex items-center gap-1.5">
                  <span>猫步可爱</span>
                  <span className="text-caption font-mono px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    工作台
                  </span>
                </span>
                <span className="hidden xl:inline-block text-xs text-ink-3">
                  灵动双模工作站
                </span>
              </div>
            </div>

            {/* Center: Cmd+K Global Quick Search Bar */}
            <div className="flex-1 max-w-md mx-4">
              <button
                onClick={onOpenSearch}
                className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-surface-2/70 hover:bg-surface-2 border border-line text-xs text-ink-2 transition-all group"
                title="按 Cmd+K / Ctrl+K 快速搜索"
              >
                <div className="flex items-center space-x-2">
                  <Search className="w-3.5 h-3.5 text-ink-3 group-hover:text-accent transition-colors" />
                  <span>快速搜索待办、备忘、密码与2FA...</span>
                </div>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-caption font-mono text-ink-3 bg-surface border border-line rounded">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right: Sync Status + Cat Touch + Theme Toggle + Mode Toggle */}
            <div className="flex items-center space-x-2.5">
              {/* Cloud Sync Status */}
              <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surface-2/70 border border-line text-caption text-ink-2">
                <Cloud className={`w-3.5 h-3.5 ${webdavConfigured ? 'text-emerald-500' : 'text-ink-3'}`} />
                <span>{webdavConfigured ? '坚果云已同步' : '本地加密存储'}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${webdavConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              </div>

              {/* Theme toggle */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-2 hover:bg-surface-2/80 text-ink-2 tactile-press transition-colors"
                  title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-2" />}
                </button>
              )}

              {/* Toggle to Phone Chassis Viewport */}
              <button
                onClick={handleToggle}
                className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-2/80 text-ink-2 text-xs font-medium flex items-center space-x-1 tactile-press border border-line transition-colors"
                title="切换为手机机身视口预览"
              >
                <Smartphone className="w-3.5 h-3.5 text-ink-2" />
                <span className="hidden sm:inline">手机机身</span>
              </button>
            </div>
          </header>

          {/* Workbench Body: Dual / Triple Split */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Navigation (~230px) */}
            <aside className="w-[230px] border-r border-line bg-surface/30 p-3 flex flex-col justify-between shrink-0 select-none">
              {/* Navigation buttons */}
              <div className="space-y-1.5">
                <div className="text-caption font-semibold text-ink-3 uppercase tracking-wider px-3 py-1">
                  工作台导航
                </div>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isPlans = item.id === 'plans';

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        haptics.selection();
                        sound.playTap();
                        onSelectTab(item.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs transition-all duration-200 tactile-press ${getAccentPill(
                        isActive
                      )}`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {isPlans && pendingPlansCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-caption font-bold bg-rose-500 text-white min-w-[18px] text-center shadow-xs">
                          {pendingPlansCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Cards: Storage & Daily Cat Tip */}
              <div className="space-y-2.5 pt-3 border-t border-line">
                {/* Storage Card */}
                <div className="p-2.5 rounded-2xl bg-surface/70 border border-line shadow-xs text-caption space-y-1 text-ink-2">
                  <div className="flex items-center justify-between font-medium text-ink">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-emerald-500" />
                      <span>本地安全资产</span>
                    </span>
                    <span className="text-caption text-emerald-600 dark:text-emerald-400 font-mono">100% 本地</span>
                  </div>
                  <div className="text-caption text-ink-3 flex items-center justify-between">
                    <span>待办清单:</span>
                    <span className="font-mono text-ink-2">{plansCount} 项</span>
                  </div>
                  <div className="text-caption text-ink-3 flex items-center justify-between">
                    <span>灵感备忘:</span>
                    <span className="font-mono text-ink-2">{notesCount} 篇</span>
                  </div>
                  <div className="text-caption text-ink-3 flex items-center justify-between">
                    <span>密码与2FA:</span>
                    <span className="font-mono text-ink-2">{vaultCount} 条</span>
                  </div>
                </div>

                {/* Tip Card */}
                <div className="p-2.5 rounded-2xl bg-surface-2/60 border border-line text-caption text-ink-2 flex items-start space-x-2">
                  <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-ink text-caption">快捷小贴士</p>
                    <p className="text-caption text-ink-3 leading-tight">
                      按 ⌘K 随时呼出全站搜索，轻快高效
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Stage: Flex-1 Full Content */}
            <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-[#F8F9FA]/60 dark:bg-canvas/60">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  // 2. MOBILE NATIVE VIEWPORT (<1024px OR deviceFrame === 'mobile')
  const isSimulatedChassis = isWideScreen && deviceFrame === 'mobile';

  return (
    <div
      className={`h-[100dvh] w-full cat-bg-canvas flex flex-col items-center justify-center transition-colors duration-300 antialiased selection:bg-pink-100 selection:text-pink-900 overflow-hidden ${
        isSimulatedChassis ? 'p-3 sm:p-5' : 'p-0'
      }`}
    >
      {/* Container: Full edge-to-edge on mobile, simulated sleek phone chassis on desktop preview */}
      <div
        className={`relative w-full ${
          isSimulatedChassis
            ? 'sm:w-[428px] sm:h-[892px] sm:max-h-[96dvh] sm:rounded-[48px] sm:border-[8px] sm:border-zinc-900/90 dark:sm:border-line/90 sm:shadow-[0_28px_80px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.1)]'
            : 'h-full'
        } h-[100dvh] bg-white dark:bg-canvas overflow-hidden flex flex-col transition-all duration-300`}
      >
        {/* Dynamic Island hint for desktop phone preview */}
        {isSimulatedChassis && (
          <div className="hidden sm:flex absolute top-2.5 left-1/2 -translate-x-1/2 z-40 w-28 h-5 bg-black rounded-full items-center justify-center space-x-2 pointer-events-none shadow-sm opacity-90">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111] ring-1 ring-zinc-800 inline-block" />
            <span className="w-2 h-2 rounded-full bg-[#0d1b2a] inline-block" />
          </div>
        )}

        {/* Floating Desktop Toggle Helper when in simulated phone mode */}
        {isSimulatedChassis && (
          <div className="hidden sm:block absolute top-3.5 right-3.5 z-50">
            <button
              onClick={handleToggle}
              className="px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 dark:bg-white/20 dark:hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center space-x-1.5 transition-all tactile-press shadow-lg"
              title="切换到宽屏双模工作台"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>展开工作台</span>
            </button>
          </div>
        )}

        {/* Inner Mobile Viewport: 100% responsive fluid */}
        <div className="flex-1 w-full bg-canvas overflow-hidden flex flex-col relative">
          {children}
        </div>
      </div>
    </div>
  );
};
