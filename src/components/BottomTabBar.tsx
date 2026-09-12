import React from 'react';
import { CalendarCheck, StickyNote, ShieldCheck, Bot, Settings as SettingsIcon } from 'lucide-react';
import { AppTab, AccentColor } from '../types';
import { sound } from '../utils/sound';
import { haptics } from '../utils/haptics';

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
        return 'bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-pink-500/10 text-[#FF6080] dark:bg-pink-500/25 border border-pink-500/20';
      case 'apple':
        return 'bg-gradient-to-r from-blue-500/15 via-sky-500/15 to-blue-500/10 text-[#0A84FF] dark:bg-blue-500/25 border border-blue-500/20';
      case 'orange':
        return 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 text-[#FF9500] dark:bg-amber-500/25 border border-amber-500/20';
      case 'purple':
        return 'bg-gradient-to-r from-purple-500/15 via-violet-500/15 to-purple-500/10 text-[#AF52DE] dark:bg-purple-500/25 border border-purple-500/20';
      case 'wechat':
      default:
        return 'bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/10 text-[#07C160] dark:bg-emerald-500/25 border border-emerald-500/20';
    }
  };

  const getAccentColorStyle = (isActive: boolean) => {
    if (!isActive) return 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300';
    switch (accentColor) {
      case 'catpaw':
        return 'text-[#FF6080] font-bold';
      case 'apple':
        return 'text-[#0A84FF] font-bold';
      case 'orange':
        return 'text-[#FF9500] font-bold';
      case 'purple':
        return 'text-[#AF52DE] font-bold';
      case 'wechat':
      default:
        return 'text-[#07C160] font-bold';
    }
  };

  const handleTabClick = (tabId: AppTab) => {
    haptics.selection();
    sound.playTap();
    onSelectTab(tabId);
  };

  return (
    <div className="w-full px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-1.5 z-30 shrink-0 select-none pointer-events-auto bg-transparent">
      {/* Suspended Glass Island Dock Container */}
      <nav className="h-[64px] max-w-md mx-auto bg-white/85 dark:bg-[#14141B]/90 backdrop-blur-3xl rounded-[32px] border border-white/80 dark:border-white/10 flex items-center justify-around px-2 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)_inset] transition-all">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isPlans = tab.id === 'plans';

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-[52px] mx-0.5 rounded-[24px] transition-all duration-200 relative tactile-press ${
                isActive ? `${getActivePillBg()} shadow-xs scale-100` : 'active:scale-95'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${getAccentColorStyle(isActive)} ${
                    isActive ? 'scale-110 -translate-y-0.5' : ''
                  }`}
                />
                {/* Badge for pending plans */}
                {isPlans && pendingPlansCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1 shadow-sm ring-2 ring-white dark:ring-[#14141B] animate-scale-in">
                    {pendingPlansCount > 99 ? '99+' : pendingPlansCount}
                  </span>
                )}
                {/* Subtle pulse dot for AI */}
                {tab.id === 'ai' && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full ring-1.5 ring-white dark:ring-[#14141B] animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10.5px] mt-0.5 tracking-tight transition-colors duration-200 leading-none ${getAccentColorStyle(
                  isActive
                )}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
