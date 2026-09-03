import React from 'react';
import { AppTab, AccentColor } from '../types';
import { Sparkles, Plus } from 'lucide-react';
import { sound } from '../utils/sound';

interface TopHeaderProps {
  activeTab: AppTab;
  accentColor: AccentColor;
  onQuickAdd?: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  accentColor,
  onQuickAdd,
  titleOverride,
  subtitleOverride,
}) => {
  const getTabTitle = () => {
    if (titleOverride) return titleOverride;
    switch (activeTab) {
      case 'plans':
        return '我的计划清单';
      case 'notes':
        return '灵感与备忘录';
      case 'vault':
        return '安全箱与密钥';
      case 'ai':
        return 'AI 伴侣与生图';
      case 'settings':
        return '设置与备份';
      default:
        return '猫步可爱';
    }
  };

  const getTabSubtitle = () => {
    if (subtitleOverride) return subtitleOverride;
    switch (activeTab) {
      case 'plans':
        return '今日事，今日毕 🐾';
      case 'notes':
        return '记录生活与灵感火花';
      case 'vault':
        return '密码 · 2FA · 微软邮箱';
      case 'ai':
        return '智能对话 · 技能插件 · 灵感生图';
      case 'settings':
        return '外观样式 · 数据备份与恢复';
      default:
        return '极简高能个人空间';
    }
  };

  const getAccentBg = () => {
    switch (accentColor) {
      case 'catpaw':
        return 'bg-[#FF6B8B] text-white';
      case 'apple':
        return 'bg-[#007AFF] text-white';
      case 'orange':
        return 'bg-[#FF9500] text-white';
      case 'purple':
        return 'bg-[#AF52DE] text-white';
      case 'wechat':
      default:
        return 'bg-[#07C160] text-white';
    }
  };

  const handleAvatarClick = () => {
    sound.playCatPurr();
  };

  return (
    <header className="h-[52px] glass-nav border-b border-zinc-200/70 dark:border-zinc-800/70 px-4 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left branding with cute animated cat avatar */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={handleAvatarClick}
          className="relative group p-0.5 rounded-full hover:scale-105 active:scale-95 transition-transform"
          title="点击摸摸猫猫 🐾"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 via-rose-300 to-amber-200 flex items-center justify-center text-sm shadow-sm ring-2 ring-white/60 dark:ring-zinc-700/60 overflow-hidden">
            🐱
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-zinc-900"></span>
        </button>

        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-1.5">
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-none">
              {getTabTitle()}
            </h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 font-medium">
              猫步可爱
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
            {getTabSubtitle()}
          </span>
        </div>
      </div>

      {/* Right action */}
      <div className="flex items-center space-x-2">
        {onQuickAdd && (
          <button
            onClick={() => {
              sound.playTap();
              onQuickAdd();
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${getAccentBg()} shadow-sm hover:opacity-90 active:scale-90 transition-all`}
            title="新建"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
