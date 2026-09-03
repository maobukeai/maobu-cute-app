import React from 'react';
import { Smartphone } from 'lucide-react';
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
      <div className="min-h-screen w-full cat-bg-canvas flex flex-col transition-colors duration-300 antialiased selection:bg-pink-100 selection:text-pink-900">
        {/* Top desktop bar */}
        <header className="h-11 bg-white/70 dark:bg-[#15151C]/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-white/5 px-4 flex items-center justify-between z-30 select-none">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 inline-block shadow-sm"></span>
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 inline-block shadow-sm"></span>
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 inline-block shadow-sm"></span>
            </div>
            <div className="h-3.5 w-px bg-zinc-300 dark:bg-zinc-700/60 mx-1"></div>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 tracking-tight flex items-center gap-1.5">
              <span className="text-sm">🐾</span>
              <span className="font-semibold">猫步可爱</span>
              <span className="text-[10px] text-zinc-400 font-normal px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                Desktop Pro
              </span>
            </span>
          </div>

          <button
            onClick={onToggleFrame}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all tactile-press border border-zinc-200/70 dark:border-white/5 shadow-ios-sm"
            title="切换到手机模拟视口"
          >
            <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-medium">模拟手机视口</span>
          </button>
        </header>

        {/* Content container */}
        <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-44px)] my-0 sm:my-3 sm:rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-zinc-200/70 dark:border-white/5 bg-white dark:bg-[#121217] overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  // Pure Mobile View (True edge-to-edge on mobile, sleek bezel frame on desktop)
  return (
    <div className="min-h-screen w-full cat-bg-canvas flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 transition-colors duration-300 antialiased selection:bg-pink-100 selection:text-pink-900">
      {/* App Container: True edge-to-edge on mobile, sleek bezel-less frame on desktop */}
      <div className="relative w-full sm:w-[414px] h-[100dvh] sm:h-[844px] sm:max-h-[94vh] bg-white dark:bg-[#121217] sm:rounded-[40px] sm:shadow-[0_24px_70px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)] dark:sm:shadow-[0_24px_70px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden flex flex-col">
        {/* App Content: starts directly with header, ends directly with tab bar */}
        <div className="flex-1 w-full bg-[#F8F9FA] dark:bg-[#101014] overflow-hidden flex flex-col relative">
          {children}
        </div>
      </div>
    </div>
  );
};
