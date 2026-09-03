import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Smartphone, Monitor } from 'lucide-react';
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
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
            title="切换到手机仿真模式"
          >
            <Smartphone className="w-3.5 h-3.5 mr-1" />
            <span>切换为手机仿真</span>
          </button>
        </header>

        {/* Content container */}
        <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-40px)] shadow-lg bg-white dark:bg-[#111111] overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  // Mobile iPhone 16 Pro mockup frame
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300 dark:from-zinc-950 dark:via-black dark:to-zinc-900 flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 transition-colors duration-300">
      {/* Floating frame toggle toolbar on top */}
      <div className="hidden sm:flex items-center space-x-3 mb-3 z-30">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white/80 dark:bg-zinc-800/80 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
          📱 iPhone 16 Pro 微信极简风格仿真
        </span>
        <button
          onClick={onToggleFrame}
          className="flex items-center space-x-1 text-xs px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
        >
          <Monitor className="w-3.5 h-3.5 mr-1" />
          <span>切换为宽屏桌面模式</span>
        </button>
      </div>

      {/* iPhone Outer Hardware Frame */}
      <div className="relative w-full sm:w-[400px] h-screen sm:h-[820px] sm:max-h-[94vh] bg-black sm:rounded-[50px] sm:ring-[10px] sm:ring-zinc-800 sm:shadow-[0_25px_70px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col">
        {/* Dynamic Island on Phone */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 flex items-center justify-between px-3 pointer-events-none hidden sm:flex">
          <div className="w-3 h-3 rounded-full bg-zinc-900 ring-1 ring-zinc-800"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 animate-pulse"></div>
        </div>

        {/* iOS Status Bar */}
        <div className="h-11 pt-1 px-7 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200 z-40 select-none bg-white/70 dark:bg-black/70 backdrop-blur-md shrink-0">
          <span>{currentTime || '12:00'}</span>
          <div className="flex items-center space-x-1.5">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Phone Content Screen */}
        <div className="flex-1 w-full bg-[#EDEDED] dark:bg-[#111111] overflow-hidden flex flex-col relative">
          {children}
        </div>

        {/* iOS Bottom Home Indicator Bar */}
        <div className="h-5 w-full flex items-center justify-center bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md shrink-0 select-none">
          <div className="w-32 h-1 bg-zinc-400 dark:bg-zinc-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
