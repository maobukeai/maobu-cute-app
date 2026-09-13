import React from 'react';
import { AppTab } from '../types';
import { Plus, Search, LayoutGrid } from 'lucide-react';
import { sound } from '../utils/sound';
import { haptics } from '../utils/haptics';
import { useHeaderScroll } from './ui/HeaderScroll';

interface TopHeaderProps {
  activeTab: AppTab;
  onQuickAdd?: () => void;
  onOpenSearch?: () => void;
  onToggleDashboard?: () => void;
  isDesktop?: boolean;
}

const TAB_META: Record<AppTab, { title: string; subtitle: string }> = {
  dashboard: { title: '看板', subtitle: '今天的一切，一眼看尽' },
  plans: { title: '计划', subtitle: '今日事，今日毕' },
  notes: { title: '笔记', subtitle: '记录与灵感' },
  vault: { title: '安全箱', subtitle: '密码 · 2FA · 邮箱' },
  ai: { title: 'AI 助手', subtitle: '对话 · 生图 · 技能' },
  settings: { title: '设置', subtitle: '偏好与备份' },
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatToday(): string {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 · 周${WEEKDAYS[now.getDay()]}`;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onQuickAdd,
  onOpenSearch,
  onToggleDashboard,
  isDesktop = false,
}) => {
  const meta = TAB_META[activeTab] ?? TAB_META.plans;
  const subtitle = activeTab === 'plans' ? formatToday() : meta.subtitle;
  const { scrolled } = useHeaderScroll();
  // 看板页有自己的内联大标题——未滚动时顶栏让出标题位，避免重复
  const pageOwnsTitle = activeTab === 'dashboard';
  const showTitle = scrolled || !pageOwnsTitle;

  const iconBtn =
    'w-9 h-9 rounded-full flex items-center justify-center bg-surface-2/80 text-ink-2 tactile-press transition-colors hover:text-ink';

  if (isDesktop) {
    return (
      <header className="h-12 border-b border-line px-6 flex items-center justify-between z-10 shrink-0 select-none bg-surface/60 backdrop-blur-xl">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center text-caption text-ink-3">
            <span>工作台</span>
            <span className="mx-1.5 text-ink-3/60">/</span>
            <span className="font-semibold text-ink">{meta.title}</span>
          </div>
          <span className="text-caption text-ink-3 hidden sm:inline">· {meta.subtitle}</span>
        </div>

        <div className="flex items-center space-x-2">
          {onQuickAdd && (
            <button
              onClick={() => {
                haptics.impactMedium();
                sound.playTap();
                onQuickAdd();
              }}
              className="px-3 py-1 rounded-full text-caption font-semibold flex items-center space-x-1 bg-accent text-white shadow-glow-accent tactile-press"
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
    <header
      className={`glass-nav border-b px-4 flex items-center justify-between z-20 shrink-0 select-none pt-[env(safe-area-inset-top,0px)] h-[calc(60px+env(safe-area-inset-top,0px))] box-border transition-[border-color,box-shadow] duration-200 ${
        scrolled
          ? 'border-line shadow-elev-1'
          : 'border-transparent shadow-none'
      }`}
    >
      {/* Left: clean large title (collapses while scrolling) */}
      <div className="flex items-center min-w-0">
        <div className={`flex flex-col text-left min-w-0 justify-center transition-all duration-200 overflow-hidden ${
          showTitle ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <h1 className={`text-ink tracking-tight leading-tight truncate transition-all duration-200 origin-left ${
            scrolled ? 'text-sub font-semibold scale-[0.98]' : 'text-title font-bold'
          }`}>
            {meta.title}
          </h1>
          {subtitle && (
            <span className={`text-caption text-ink-3 leading-tight truncate transition-all duration-200 overflow-hidden ${
              scrolled ? 'max-h-0 opacity-0' : 'max-h-5 opacity-100 mt-0.5'
            }`}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center space-x-2 shrink-0">
        {onOpenSearch && (
          <button
            onClick={() => {
              haptics.impactLight();
              sound.playTap();
              onOpenSearch();
            }}
            className={iconBtn}
            title="快速全局搜索"
          >
            <Search className="w-[17px] h-[17px]" />
          </button>
        )}

        {onToggleDashboard && (
          <button
            onClick={() => {
              haptics.impactLight();
              sound.playTap();
              onToggleDashboard();
            }}
            className={`${iconBtn} ${
              activeTab === 'dashboard' ? 'bg-accent text-white shadow-glow-accent' : ''
            }`}
            title={activeTab === 'dashboard' ? '返回清单' : '全景看板'}
          >
            <LayoutGrid className="w-[17px] h-[17px]" />
          </button>
        )}

        {onQuickAdd && (
          <button
            onClick={() => {
              haptics.impactMedium();
              sound.playTap();
              onQuickAdd();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-white shadow-glow-accent tactile-press"
            title="新建"
          >
            <Plus className="w-[18px] h-[18px] stroke-[2.5]" />
          </button>
        )}
      </div>
    </header>
  );
};
