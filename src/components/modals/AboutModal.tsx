import React from 'react';
import { X, Info } from 'lucide-react';
import { sound } from '../../utils/sound';
import { AppSettings } from '../../types';
import { AboutSection } from '../AboutSection';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50/95 dark:bg-[#0c0d12]/95 backdrop-blur-xl animate-fade-in select-none overflow-hidden">
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 pt-[calc(10px+env(safe-area-inset-top,0px))] pb-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#161822]/70 backdrop-blur-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2">
            <Info className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>关于猫步可爱</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Android
              </span>
            </h1>
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400">软件信息与自动更新</p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playTap();
            onClose();
          }}
          className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-transform active:scale-90"
          aria-label="关闭关于页面"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ── Scrollable Body Content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
        <AboutSection settings={settings} onUpdateSettings={onUpdateSettings} />
      </div>
    </div>
  );
};
