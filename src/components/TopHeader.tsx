import React, { useState } from 'react';
import { AppTab, AccentColor } from '../types';
import { Sparkles, Plus, Heart } from 'lucide-react';
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
  const [showCatLove, setShowCatLove] = useState(false);

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
        return 'bg-gradient-to-r from-[#FF6080] to-[#FF85A1] text-white shadow-[0_4px_14px_rgba(255,96,128,0.35)]';
      case 'apple':
        return 'bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] text-white shadow-[0_4px_14px_rgba(10,132,255,0.35)]';
      case 'orange':
        return 'bg-gradient-to-r from-[#FF9500] to-[#FFAA33] text-white shadow-[0_4px_14px_rgba(255,149,0,0.35)]';
      case 'purple':
        return 'bg-gradient-to-r from-[#AF52DE] to-[#C77DFF] text-white shadow-[0_4px_14px_rgba(175,82,222,0.35)]';
      case 'wechat':
      default:
        return 'bg-gradient-to-r from-[#07C160] to-[#34D399] text-white shadow-[0_4px_14px_rgba(7,193,96,0.35)]';
    }
  };

  const handleAvatarClick = () => {
    sound.playCatPurr();
    setShowCatLove(true);
    setTimeout(() => setShowCatLove(false), 1400);
  };

  return (
    <header className="glass-nav border-b border-zinc-200/60 dark:border-white/5 px-4 flex items-center justify-between z-20 shrink-0 select-none transition-colors pt-[env(safe-area-inset-top,0px)] h-[calc(54px+env(safe-area-inset-top,0px))] box-border">
      {/* Left branding with cute animated cat avatar */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button
            onClick={handleAvatarClick}
            className="relative group p-0.5 rounded-full tactile-press"
            title="点击摸摸猫猫 🐾"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-400 via-rose-300 to-amber-200 flex items-center justify-center text-base shadow-sm ring-2 ring-white/80 dark:ring-zinc-700/80 overflow-hidden animate-cat-float">
              🐱
            </div>
            {/* Online breathing dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900 shadow-sm"></span>
          </button>

          {/* Floating Heart Tooltip */}
          {showCatLove && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg animate-scale-in whitespace-nowrap z-50 pointer-events-none">
              <Heart className="w-2.5 h-2.5 fill-current animate-ping" />
              <span>呼噜呼噜 🐾</span>
            </div>
          )}
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-1.5">
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
              {getTabTitle()}
            </h1>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-pink-100/80 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 font-medium tracking-wide">
              猫步可爱
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal leading-tight mt-1">
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
            className={`w-7 h-7 rounded-full flex items-center justify-center ${getAccentBg()} hover:opacity-95 tactile-press`}
            title="新建"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
