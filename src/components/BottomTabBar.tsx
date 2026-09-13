import React from 'react';
import { motion } from 'motion/react';
import { CalendarCheck, StickyNote, ShieldCheck, Bot, Settings as SettingsIcon } from 'lucide-react';
import { AppTab } from '../types';
import { sound } from '../utils/sound';
import { haptics } from '../utils/haptics';

interface BottomTabBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  pendingPlansCount: number;
}

const TABS: Array<{ id: AppTab; label: string; icon: React.FC<{ className?: string; strokeWidth?: number }> }> = [
  { id: 'plans', label: '计划', icon: CalendarCheck },
  { id: 'notes', label: '笔记', icon: StickyNote },
  { id: 'vault', label: '安全箱', icon: ShieldCheck },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'settings', label: '设置', icon: SettingsIcon },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  pendingPlansCount,
}) => {
  return (
    <div className="w-full px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-1.5 z-30 shrink-0 select-none pointer-events-auto bg-transparent">
      <nav className="h-[64px] max-w-md mx-auto bg-surface/85 dark:bg-surface/90 backdrop-blur-3xl rounded-island border border-white/70 dark:border-white/10 flex items-center justify-around px-2 shadow-elev-3 transition-colors">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isActive) return;
                haptics.selection();
                sound.playTap();
                onSelectTab(tab.id);
              }}
              className="relative flex flex-col items-center justify-center flex-1 h-[52px] mx-0.5 rounded-[24px] tactile-press"
            >
              {isActive && (
                <motion.span
                  layoutId="tabbar-active-pill"
                  className="absolute inset-0 rounded-[24px] bg-accent/[0.13]"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              )}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: isActive ? 1.12 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                  className="relative flex items-center justify-center"
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 relative z-10 ${
                      isActive ? 'text-accent' : 'text-ink-3'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </motion.div>
                {tab.id === 'plans' && pendingPlansCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-danger text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-elev-1 ring-2 ring-surface animate-scale-in z-20">
                    {pendingPlansCount > 99 ? '99+' : pendingPlansCount}
                  </span>
                )}
              </div>
              <span
                className={`text-caption font-semibold mt-0.5 tracking-tight transition-colors duration-200 leading-none relative z-10 ${
                  isActive ? 'text-accent' : 'text-ink-3'
                }`}
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
