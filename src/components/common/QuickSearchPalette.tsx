import React, { useState, useEffect, useRef } from 'react';
import { Search, CalendarCheck, StickyNote, ShieldCheck, Bot, Compass, ArrowRight, X, LayoutGrid } from 'lucide-react';
import { PlanItem, NoteItem, PasswordItem, TwoFactorToken, AppTab, AccentColor } from '../../types';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';

interface QuickSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  plans: PlanItem[];
  notes: NoteItem[];
  passwords: PasswordItem[];
  tokens: TwoFactorToken[];
  onSelectTab: (tab: AppTab) => void;
  accentColor: AccentColor;
}

export const QuickSearchPalette: React.FC<QuickSearchPaletteProps> = ({
  isOpen,
  onClose,
  plans,
  notes,
  passwords,
  tokens,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          sound.playTap();
          // open triggered from caller
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredPlans = q
    ? plans.filter(p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)))
    : plans.slice(0, 3);

  const filteredNotes = q
    ? notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    : notes.slice(0, 3);

  const filteredVault = q
    ? [
        ...passwords.filter(pw => pw.title.toLowerCase().includes(q) || pw.username.toLowerCase().includes(q)).map(pw => ({ type: 'password' as const, item: pw })),
        ...tokens.filter(tk => tk.issuer.toLowerCase().includes(q) || tk.account.toLowerCase().includes(q)).map(tk => ({ type: 'token' as const, item: tk })),
      ]
    : [];

  const handleNavigate = (tab: AppTab) => {
    haptics.selection();
    sound.playTap();
    onSelectTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 dark:bg-black/65 backdrop-blur-md animate-scale-in">
      {/* Background dismissal */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-2xl bg-surface/95 backdrop-blur-2xl rounded-3xl border border-line shadow-[0_24px_60px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-line/70">
          <Search className="w-5 h-5 text-ink-3 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="全站全局极速搜索：待办、Markdown笔记、密码箱、2FA密钥..."
            className="flex-1 bg-transparent text-sm sm:text-base text-ink placeholder:text-ink-3 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-ink-3 hover:text-ink rounded-full mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-caption font-mono text-ink-3 bg-surface-2 border border-line rounded-lg">
            ESC 退出
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Quick Tab Jump Bar */}
          {!q && (
            <div>
              <div className="text-caption font-semibold text-ink-3 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-accent" />
                <span>快速前往模块</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { tab: 'dashboard' as AppTab, label: '全景看板', icon: LayoutGrid, desc: 'Bento Grid 综合' },
                  { tab: 'plans' as AppTab, label: '计划清单', icon: CalendarCheck, desc: `${plans.length} 条待办` },
                  { tab: 'notes' as AppTab, label: '灵感备忘', icon: StickyNote, desc: `${notes.length} 篇笔记` },
                  { tab: 'vault' as AppTab, label: '密码与2FA', icon: ShieldCheck, desc: `${passwords.length + tokens.length} 项安全资产` },
                  { tab: 'ai' as AppTab, label: 'AI 助手', icon: Bot, desc: '对话与生图' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleNavigate(item.tab)}
                      className="flex flex-col items-start p-2.5 rounded-2xl bg-surface-2/60 hover:bg-surface-2 border border-line/60 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon className="w-4 h-4 text-ink-2 group-hover:text-accent transition-colors" />
                        <ArrowRight className="w-3 h-3 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <span className="text-xs font-semibold text-ink">{item.label}</span>
                      <span className="text-caption text-ink-3 mt-0.5">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plans Section */}
          {filteredPlans.length > 0 && (
            <div>
              <div className="text-caption font-semibold text-ink-3 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="w-3 h-3 text-emerald-500" />
                  <span>待办计划</span>
                </span>
                <button
                  onClick={() => handleNavigate('plans')}
                  className="text-caption text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  查看全部
                </button>
              </div>
              <div className="space-y-1.5">
                {filteredPlans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => handleNavigate('plans')}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-surface-2 text-left transition-colors group border border-transparent hover:border-line/60"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${plan.isCompleted ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-emerald-500'}`} />
                      <div className="truncate">
                        <p className={`text-xs font-medium text-ink truncate ${plan.isCompleted ? 'line-through text-ink-3' : ''}`}>
                          {plan.title}
                        </p>
                        {plan.description && (
                          <p className="text-caption text-ink-3 truncate">{plan.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-caption px-2 py-0.5 rounded-full bg-surface-2 text-ink-2 shrink-0 ml-2">
                      {plan.priority}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {filteredNotes.length > 0 && (
            <div>
              <div className="text-caption font-semibold text-ink-3 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <StickyNote className="w-3 h-3 text-amber-500" />
                  <span>灵感笔记</span>
                </span>
                <button
                  onClick={() => handleNavigate('notes')}
                  className="text-caption text-amber-600 dark:text-amber-400 hover:underline"
                >
                  查看全部
                </button>
              </div>
              <div className="space-y-1.5">
                {filteredNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => handleNavigate('notes')}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-surface-2 text-left transition-colors group border border-transparent hover:border-line/60"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-medium text-ink truncate">{note.title}</p>
                        <p className="text-caption text-ink-3 truncate">{note.content.replace(/[#*`]/g, '').slice(0, 60)}</p>
                      </div>
                    </div>
                    <span className="text-caption px-2 py-0.5 rounded-full bg-surface-2 text-ink-2 shrink-0 ml-2">
                      {note.category || '笔记'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vault Section */}
          {filteredVault.length > 0 && (
            <div>
              <div className="text-caption font-semibold text-ink-3 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                  <span>安全箱资产</span>
                </span>
                <button
                  onClick={() => handleNavigate('vault')}
                  className="text-caption text-blue-600 dark:text-blue-400 hover:underline"
                >
                  查看全部
                </button>
              </div>
              <div className="space-y-1.5">
                {filteredVault.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleNavigate('vault')}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-surface-2 text-left transition-colors group border border-transparent hover:border-line/60"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <div className="truncate">
                        {item.type === 'password' ? (
                          <>
                            <p className="text-xs font-medium text-ink truncate">{item.item.title}</p>
                            <p className="text-caption text-ink-3 truncate">账号: {item.item.username}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-ink truncate">{item.item.issuer} 2FA</p>
                            <p className="text-caption text-ink-3 truncate">{item.item.account}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-caption px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0 ml-2 font-mono">
                      {item.type === 'password' ? '密码' : '2FA 令牌'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && filteredPlans.length === 0 && filteredNotes.length === 0 && filteredVault.length === 0 && (
            <div className="py-12 text-center text-ink-3 text-xs">
              没有匹配到 “{query}” 的相关内容
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-surface-2/60 border-t border-line/70 flex items-center justify-between text-caption text-ink-3">
          <span className="flex items-center gap-1.5">
            <span>猫步可爱 · 全站搜索</span>
          </span>
          <span className="hidden sm:inline">按 ESC 关闭</span>
          <span className="sm:hidden">点击空白处关闭</span>
        </div>
      </div>
    </div>
  );
};
