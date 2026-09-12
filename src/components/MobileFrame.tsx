import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Heart,
  Sun,
  Moon,
  Sparkles,
  HardDrive,
  Lightbulb,
  LayoutGrid,
} from 'lucide-react';
import { DeviceFrame, AppTab, AccentColor } from '../types';
import { sound } from '../utils/sound';
import { haptics } from '../utils/haptics';

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
  accentColor = 'wechat',
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
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [showCatLove, setShowCatLove] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isWideScreen = windowWidth >= 1024;
  const isDesktopWorkbench = isWideScreen && deviceFrame === 'desktop';

  const handleToggle = () => {
    haptics.selection();
    sound.playToggle();
    onToggleFrame();
  };

  const handleCatPurr = () => {
    haptics.impactLight();
    sound.playCatPurr();
    setShowCatLove(true);
    setTimeout(() => setShowCatLove(false), 1400);
  };

  const navItems: Array<{ id: AppTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: '全景看板', icon: LayoutGrid },
    { id: 'plans', label: '今日计划', icon: CalendarCheck },
    { id: 'notes', label: '灵感笔记', icon: StickyNote },
    { id: 'vault', label: '密码保险', icon: ShieldCheck },
    { id: 'ai', label: 'AI 伴侣', icon: Bot },
    { id: 'settings', label: '系统设置', icon: SettingsIcon },
  ];

  const getAccentPill = (isActive: boolean) => {
    if (!isActive) {
      return 'text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-zinc-900 dark:hover:text-zinc-100';
    }
    switch (accentColor) {
      case 'catpaw':
        return 'bg-gradient-to-r from-pink-500/15 to-rose-500/15 text-[#FF6080] font-bold shadow-xs border border-pink-500/20';
      case 'apple':
        return 'bg-gradient-to-r from-blue-500/15 to-sky-500/15 text-[#0A84FF] font-bold shadow-xs border border-blue-500/20';
      case 'orange':
        return 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-[#FF9500] font-bold shadow-xs border border-amber-500/20';
      case 'purple':
        return 'bg-gradient-to-r from-purple-500/15 to-violet-500/15 text-[#AF52DE] font-bold shadow-xs border border-purple-500/20';
      case 'wechat':
      default:
        return 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-[#07C160] font-bold shadow-xs border border-emerald-500/20';
    }
  };

  // 1. DESKTOP WORKBENCH MODE (≥1024px and deviceFrame === 'desktop')
  if (isDesktopWorkbench) {
    return (
      <div className="h-screen w-full cat-bg-canvas flex flex-col p-2 lg:p-3.5 antialiased selection:bg-pink-100 selection:text-pink-900 overflow-hidden">
        {/* macOS Sequoia Fluid Glass Window Chassis */}
        <div className="flex-1 w-full max-w-[1720px] mx-auto bg-white/80 dark:bg-[#121217]/85 backdrop-blur-2xl rounded-2xl lg:rounded-[30px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_24px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-all duration-300">
          
          {/* Top macOS Sequoia Header Toolbar */}
          <header className="h-14 border-b border-black/[0.06] dark:border-white/[0.08] px-4 lg:px-6 flex items-center justify-between z-20 shrink-0 select-none bg-white/60 dark:bg-[#16161F]/60 backdrop-blur-xl">
            {/* Left: Traffic Lights + Brand */}
            <div className="flex items-center space-x-3.5">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-2xs inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-2xs inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-2xs inline-block" />
              </div>
              <div className="h-4 w-px bg-zinc-300/80 dark:bg-zinc-700/80 mx-1" />
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                  <span>🐱 猫步可爱</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 font-medium">
                    工作台
                  </span>
                </span>
                <span className="hidden xl:inline-block text-xs text-zinc-400 dark:text-zinc-500">
                  灵动双模工作站
                </span>
              </div>
            </div>

            {/* Center: Cmd+K Global Quick Search Bar */}
            <div className="flex-1 max-w-md mx-4">
              <button
                onClick={onOpenSearch}
                className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 text-xs text-zinc-500 dark:text-zinc-400 transition-all group"
                title="按 Cmd+K / Ctrl+K 快速搜索"
              >
                <div className="flex items-center space-x-2">
                  <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-pink-500 transition-colors" />
                  <span>快速搜索待办、备忘、密码与2FA...</span>
                </div>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right: Sync Status + Cat Touch + Theme Toggle + Mode Toggle */}
            <div className="flex items-center space-x-2.5">
              {/* Cloud Sync Status */}
              <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/40 text-[11px] text-zinc-600 dark:text-zinc-300">
                <Cloud className={`w-3.5 h-3.5 ${webdavConfigured ? 'text-emerald-500' : 'text-zinc-400'}`} />
                <span>{webdavConfigured ? '坚果云已同步' : '本地加密存储'}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${webdavConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              </div>

              {/* Cat Touch Button */}
              <div className="relative">
                <button
                  onClick={handleCatPurr}
                  className="px-2.5 py-1 rounded-full bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 border border-pink-200/50 dark:border-pink-800/40 text-pink-700 dark:text-pink-300 text-xs font-medium flex items-center space-x-1 tactile-press transition-colors"
                  title="摸摸猫猫 🐾"
                >
                  <span className="animate-bounce-subtle">🐱</span>
                  <span>摸摸猫</span>
                </button>
                {showCatLove && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg animate-scale-in whitespace-nowrap z-50 pointer-events-none">
                    <Heart className="w-2.5 h-2.5 fill-current animate-ping" />
                    <span>呼噜呼噜 🐾</span>
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 tactile-press transition-colors"
                  title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
                </button>
              )}

              {/* Toggle to Phone Chassis Viewport */}
              <button
                onClick={handleToggle}
                className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center space-x-1 tactile-press border border-zinc-200/60 dark:border-zinc-700/50 transition-colors"
                title="切换为手机机身视口预览"
              >
                <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">手机机身</span>
              </button>
            </div>
          </header>

          {/* Workbench Body: Dual / Triple Split */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Navigation (~230px) */}
            <aside className="w-[230px] border-r border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.015] p-3 flex flex-col justify-between shrink-0 select-none">
              {/* Navigation buttons */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 py-1">
                  工作台导航
                </div>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isPlans = item.id === 'plans';
                  const isAI = item.id === 'ai';

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
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white min-w-[18px] text-center shadow-xs">
                          {pendingPlansCount}
                        </span>
                      )}
                      {isAI && (
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Cards: Storage & Daily Cat Tip */}
              <div className="space-y-2.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                {/* Storage Card */}
                <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-[#181820]/70 border border-black/[0.04] dark:border-white/[0.06] shadow-xs text-[11px] space-y-1 text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center justify-between font-medium text-zinc-800 dark:text-zinc-200">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-emerald-500" />
                      <span>本地安全资产</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">100% 本地</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>待办清单:</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">{plansCount} 项</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>灵感备忘:</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">{notesCount} 篇</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>密码与2FA:</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">{vaultCount} 条</span>
                  </div>
                </div>

                {/* Cat Tip Card */}
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-amber-500/10 border border-pink-500/15 text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start space-x-2">
                  <Lightbulb className="w-3.5 h-3.5 text-pink-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-pink-700 dark:text-pink-300 text-[10.5px]">今日猫咪小贴士</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      “按 Cmd+K 随时呼出全站搜索，劳逸结合效率更高喵~”
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Stage: Flex-1 Full Content */}
            <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-[#F8F9FA]/60 dark:bg-[#0E0E12]/60">
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
            ? 'sm:w-[428px] sm:h-[892px] sm:max-h-[96dvh] sm:rounded-[48px] sm:border-[8px] sm:border-zinc-900/90 dark:sm:border-zinc-800/90 sm:shadow-[0_28px_80px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.1)]'
            : 'h-full'
        } h-[100dvh] bg-white dark:bg-[#121217] overflow-hidden flex flex-col transition-all duration-300`}
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
        <div className="flex-1 w-full bg-[#F8F9FA] dark:bg-[#0A0A0C] overflow-hidden flex flex-col relative">
          {children}
        </div>
      </div>
    </div>
  );
};
