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

  const getAccentClass = (isActive: boolean) => {
    if (!isActive) return 'text-zinc-500 dark:text-zinc-400';
    switch (accentColor) {
      case 'catpaw':
        return 'text-[#FF6B8B] font-medium';
      case 'apple':
        return 'text-[#007AFF] font-medium';
      case 'orange':
        return 'text-[#FF9500] font-medium';
      case 'purple':
        return 'text-[#AF52DE] font-medium';
      case 'wechat':
      default:
        return 'text-[#07C160] font-medium';
    }
  };

  const handleTabClick = (tabId: AppTab) => {
    sound.playTap();
    onSelectTab(tabId);
  };
  return (
    <nav className="h-[56px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] select-none z-30 shrink-0">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isPlans = tab.id === 'plans';

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 relative ${
              isActive ? 'scale-105' : 'hover:opacity-80 active:scale-95'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-colors duration-200 ${getAccentClass(isActive)}`} />
              {/* Badge for unfinished plans */}
              {isPlans && pendingPlansCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 shadow-sm animate-scale-in">
                  {pendingPlansCount > 99 ? '99+' : pendingPlansCount}
                </span>
              )}
              {/* Cute dot for AI */}
              {tab.id === 'ai' && !isActive && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#FF6B8B] rounded-full"></span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight transition-colors duration-200 ${getAccentClass(isActive)}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
