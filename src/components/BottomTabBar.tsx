import React from 'react';
import { CalendarCheck, StickyNote, ShieldCheck, Bot, Settings as SettingsIcon } from 'lucide-react';
import { AppTab, AccentColor } from '../types';
import { sound } from '../utils/sound';

interface BottomTabBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  accentColor: AccentColor;
  pendingPlansCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  accentColor,
  pendingPlansCount,
}) => {
  const tabs: Array<{ id: AppTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'plans', label: '计划', icon: CalendarCheck },
    { id: 'notes', label: '笔记', icon: StickyNote },
    { id: 'vault', label: '安全箱', icon: ShieldCheck },
    { id: 'ai', label: 'AI伴侣', icon: Bot },
    { id: 'settings', label: '设置', icon: SettingsIcon },
  ];

  const getActivePillBg = () => {
    switch (accentColor) {
      case 'catpaw':
        return 'bg-rose-50 dark:bg-rose-950/40 text-[#FF6080]';
      case 'apple':
        return 'bg-blue-50 dark:bg-blue-950/40 text-[#0A84FF]';
      case 'orange':
        return 'bg-amber-50 dark:bg-amber-950/40 text-[#FF9500]';
      case 'purple':
        return 'bg-purple-50 dark:bg-purple-950/40 text-[#AF52DE]';
      case 'wechat':
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-[#07C160]';
    }
  };

  const getAccentClass = (isActive: boolean) => {
    if (!isActive) return 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300';
    switch (accentColor) {
      case 'catpaw':
        return 'text-[#FF6080] font-semibold';
      case 'apple':
        return 'text-[#0A84FF] font-semibold';
      case 'orange':
        return 'text-[#FF9500] font-semibold';
      case 'purple':
        return 'text-[#AF52DE] font-semibold';
      case 'wechat':
      default:
        return 'text-[#07C160] font-semibold';
    }
  };

  const handleTabClick = (tabId: AppTab) => {
    sound.playTap();
    onSelectTab(tabId);
  };

  return (
    <nav className="min-h-[58px] h-[calc(58px+env(safe-area-inset-bottom,0px))] bg-white/90 dark:bg-[#15151C]/90 backdrop-blur-2xl border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-around px-3 pt-1.5 pb-[env(safe-area-inset-bottom,0px)] select-none z-30 shrink-0 transition-colors shadow-tabbar dark:shadow-tabbar-dark">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isPlans = tab.id === 'plans';

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-2xl transition-all duration-200 relative tactile-press ${
              isActive ? `${getActivePillBg()} shadow-sm` : ''
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-all duration-200 ${getAccentClass(isActive)} ${isActive ? 'scale-110 -translate-y-0.5' : ''}`} />
              {/* Badge for unfinished plans */}
              {isPlans && pendingPlansCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9.5px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 shadow-sm ring-1.5 ring-white dark:ring-[#15151C] animate-scale-in">
                  {pendingPlansCount > 99 ? '99+' : pendingPlansCount}
                </span>
              )}
              {/* Cute dot for AI */}
              {tab.id === 'ai' && !isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full ring-1.5 ring-white dark:ring-[#15151C] animate-pulse"></span>
              )}
            </div>
            <span className={`text-[10.5px] mt-0.5 tracking-tight transition-all duration-200 ${getAccentClass(isActive)}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
