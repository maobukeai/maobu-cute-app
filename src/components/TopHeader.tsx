import React, { useState } from 'react';
import { AppTab, AccentColor } from '../types';
import { Sparkles, Plus, Heart, Search, Bot, LayoutGrid } from 'lucide-react';
import { sound } from '../utils/sound';
import { haptics } from '../utils/haptics';

interface TopHeaderProps {
  activeTab: AppTab;
  accentColor: AccentColor;
  onQuickAdd?: () => void;
  onOpenSearch?: () => void;
  onOpenAI?: () => void;
  onToggleDashboard?: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
  isDesktop?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  accentColor,
  onQuickAdd,
  onOpenSearch,
  onOpenAI,
  onToggleDashboard,
  titleOverride,
  subtitleOverride,
  isDesktop = false,
}) => {
  const [showCatLove, setShowCatLove] = useState(false);

  const getTabTitle = () => {
    if (titleOverride) return titleOverride;
    switch (activeTab) {
      case 'dashboard':
        return '灵动全景看板';
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
      case 'dashboard':
        return 'Bento Grid · 待办 / 灵感 / 2FA 聚合';
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
    haptics.impactLight();
    sound.playCatPurr();
    setShowCatLove(true);
    setTimeout(() => setShowCatLove(false), 1400);
  };

  if (isDesktop) {
    return (
      <header className="h-12 border-b border-black/[0.06] dark:border-white/[0.08] px-6 flex items-center justify-between z-10 shrink-0 select-none bg-white/60 dark:bg-[#15151C]/60 backdrop-blur-xl">
        {/* Left: Breadcrumb and title */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center text-xs text-zinc-400 dark:text-zinc-500">
            <span>工作台</span>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{getTabTitle()}</span>
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            · {getTabSubtitle()}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {onOpenAI && activeTab !== 'ai' && (
            <button
              onClick={() => {
                haptics.impactLight();
                sound.playTap();
                onOpenAI();
              }}
              className="px-2.5 py-1 rounded-full bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 text-pink-600 dark:text-pink-300 text-xs font-medium flex items-center space-x-1 tactile-press transition-colors"
              title="呼出 AI 伴侣"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 伴侣</span>
            </button>
          )}

          {onQuickAdd && (
            <button
              onClick={() => {
                haptics.impactMedium();
                sound.playTap();
                onQuickAdd();
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${getAccentBg()} hover:opacity-95 tactile-press shadow-xs`}
              title="新建"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>新建</span>
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="glass-nav border-b border-black/[0.06] dark:border-white/[0.08] px-4 flex items-center justify-between z-20 shrink-0 select-none transition-all pt-[env(safe-area-inset-top,0px)] h-[calc(56px+env(safe-area-inset-top,0px))] box-border shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      {/* Left branding with cute animated cat avatar */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button
            onClick={handleAvatarClick}
            className="relative group p-0.5 rounded-full tactile-press"
            title="点击摸摸猫猫 🐾"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-400 via-rose-300 to-amber-200 flex items-center justify-center text-base shadow-sm ring-2 ring-white/90 dark:ring-zinc-700/80 overflow-hidden animate-cat-float">
              🐱
            </div>
            {/* Online breathing dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900 shadow-sm"></span>
          </button>

          {/* Floating Heart Tooltip */}
          {showCatLove && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg animate-scale-in whitespace-nowrap z-50 pointer-events-none">
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

      {/* Right actions */}
      <div className="flex items-center space-x-2">
        {onOpenSearch && (
          <button
            onClick={() => {
              haptics.impactLight();
              sound.playTap();
              onOpenSearch();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 tactile-press transition-colors"
            title="快速全局搜索 (Cmd+K)"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {onToggleDashboard && (
          <button
            onClick={() => {
              haptics.impactLight();
              sound.playTap();
              onToggleDashboard();
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center tactile-press transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300'
            }`}
            title={activeTab === 'dashboard' ? '返回清单' : '查看全景看板 (Bento Grid)'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        )}

        {onOpenAI && activeTab !== 'ai' && (
          <button
            onClick={() => {
              haptics.impactLight();
              sound.playTap();
              onOpenAI();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 text-pink-600 dark:text-pink-300 tactile-press transition-colors"
            title="AI 伴侣"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {onQuickAdd && (
          <button
            onClick={() => {
              haptics.impactMedium();
              sound.playTap();
              onQuickAdd();
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${getAccentBg()} hover:opacity-95 tactile-press`}
            title="新建"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </header>
  );
};
