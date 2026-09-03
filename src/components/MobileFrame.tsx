import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { DeviceFrame } from '../types';

interface MobileFrameProps {
  deviceFrame: DeviceFrame;
  onToggleFrame: () => void;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  deviceFrame,
  onToggleFrame,
  children,
}) => {
  if (deviceFrame === 'desktop') {
    return (
      <div className="min-h-screen w-full bg-[#EDEDED] dark:bg-black flex flex-col transition-colors duration-300">
        {/* Top desktop bar */}
        <header className="h-10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between z-30 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 ml-2">
              🐾 猫步可爱 (Maobu Cute) · 宽屏桌面模式
            </span>
          </div>
          <button
            onClick={onToggleFrame}
            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition"
            title="切换到手机模式"
          >
            <Smartphone className="w-3.5 h-3.5 mr-1" />
            <span>切换为手机模式</span>
          </button>
        </header>

        {/* Content container */}
        <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-40px)] shadow-lg bg-white dark:bg-[#111111] overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  // Pure Mobile View (No fake OS status bar, no fake chin bar)
  return (
    <div className="min-h-screen w-full bg-[#EDEDED] sm:bg-gradient-to-br sm:from-zinc-200 sm:via-zinc-100 sm:to-zinc-300 dark:bg-[#111111] dark:sm:from-zinc-950 dark:sm:via-black dark:sm:to-zinc-900 flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 transition-colors duration-300">
      {/* Floating frame toggle toolbar on top (Desktop preview only) */}
      <div className="hidden sm:flex items-center space-x-3 mb-3 z-30">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white/80 dark:bg-zinc-800/80 px-3 py-1 rounded-full backdrop-blur-md shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
          📱 极简移动端体验
        </span>
        <button
          onClick={onToggleFrame}
          className="flex items-center space-x-1 text-xs px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm border border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
        >
          <Monitor className="w-3.5 h-3.5 mr-1" />
          <span>切换为宽屏桌面模式</span>
        </button>
      </div>

      {/* App Container: True edge-to-edge on mobile, sleek bezel-less frame on desktop */}
      <div className="relative w-full sm:w-[414px] h-screen sm:h-[840px] sm:max-h-[94vh] bg-[#EDEDED] dark:bg-[#111111] sm:rounded-[28px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:border sm:border-zinc-300/80 dark:sm:border-zinc-800 overflow-hidden flex flex-col">
        {/* App Content: starts directly with header, ends directly with tab bar */}
        <div className="flex-1 w-full bg-[#EDEDED] dark:bg-[#111111] overflow-hidden flex flex-col relative">
          {children}
        </div>
      </div>
    </div>
  );
};
