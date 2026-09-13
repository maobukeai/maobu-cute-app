import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import {
  PlanItem,
  NoteItem,
  PasswordItem,
  TwoFactorToken,
  HotmailAccount,
  AIProvider,
  AISession,
  AISkill,
  AIImageGeneration,
  AppSettings,
  AppTab,
  DeviceFrame,
  GoogleWarmingAccount,
  AppUpdateInfo,
} from './types';
import { db } from './utils/storage';
import { sound } from './utils/sound';
import { perf } from './utils/perf';
import { applyAccent } from './utils/theme';
import { checkAppUpdate, CURRENT_VERSION } from './utils/updater';
import { MobileFrame } from './components/MobileFrame';
import { TopHeader } from './components/TopHeader';
import { BottomTabBar } from './components/BottomTabBar';
import { QuickSearchPalette } from './components/common/QuickSearchPalette';
import { AboutModal } from './components/modals/AboutModal';
import { UpdateModal } from './components/modals/UpdateModal';
import { ToastProvider, useToast, ErrorBoundary, HeaderScrollContext, useProvideHeaderScroll } from './components/ui';
import { useIsWideScreen } from './hooks/useMediaQuery';

const DashboardBentoView = React.lazy(() => import('./components/tabs/DashboardBentoView').then(m => ({ default: m.DashboardBentoView })));
const PlansTab = React.lazy(() => import('./components/tabs/PlansTab').then(m => ({ default: m.PlansTab })));
const NotesTab = React.lazy(() => import('./components/tabs/NotesTab').then(m => ({ default: m.NotesTab })));
const VaultTab = React.lazy(() => import('./components/tabs/VaultTab').then(m => ({ default: m.VaultTab })));
const AITab = React.lazy(() => import('./components/tabs/AITab').then(m => ({ default: m.AITab })));
const SettingsTab = React.lazy(() => import('./components/tabs/SettingsTab').then(m => ({ default: m.SettingsTab })));

const TabLoadingSkeleton: React.FC = () => (
  <div className="flex-1 px-4 pt-3 space-y-3 select-none animate-pulse">
    <div className="h-11 rounded-full bg-surface-2/70" />
    <div className="h-[88px] rounded-2xl bg-surface border border-line" />
    <div className="flex gap-2">
      <div className="h-8 w-20 rounded-full bg-surface-2/70" />
      <div className="h-8 w-16 rounded-full bg-surface-2/50" />
      <div className="h-8 w-16 rounded-full bg-surface-2/40" />
    </div>
    <div className="h-36 rounded-2xl bg-surface border border-line" />
    <div className="h-36 rounded-2xl bg-surface/70 border border-line" />
  </div>
);

/** Surfaces storage quota failures fired by the db layer. */
const StorageQuotaWatcher: React.FC = () => {
  const toast = useToast();
  React.useEffect(() => {
    let lastNotified = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastNotified < 5000) return;
      lastNotified = now;
      toast.warn('本地存储空间不足，较早的生成图片已被清理');
    };
    window.addEventListener('maobu-storage-quota', handler);
    return () => window.removeEventListener('maobu-storage-quota', handler);
  }, [toast]);
  return null;
};

const TAB_ORDER: Record<AppTab, number> = {
  dashboard: 0,
  plans: 1,
  notes: 2,
  vault: 3,
  ai: 4,
  settings: 5,
};

const pageVariants: Variants = {
  enter: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? 32 : -32,
    opacity: 0,
    pointerEvents: 'none' as const,
  }),
  center: {
    x: 0,
    opacity: 1,
    pointerEvents: 'auto' as const,
    transition: {
      x: { type: 'spring' as const, stiffness: 360, damping: 32, mass: 0.8 },
      opacity: { duration: 0.18, ease: 'easeOut' },
    },
  },
  exit: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? -26 : 26,
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: {
      x: { type: 'spring' as const, stiffness: 360, damping: 32, mass: 0.8 },
      opacity: { duration: 0.14, ease: 'easeIn' },
    },
  }),
};

export const App: React.FC = () => {
  // State from Local DB
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [tokens, setTokens] = useState<TwoFactorToken[]>([]);
  const [hotmailAccounts, setHotmailAccounts] = useState<HotmailAccount[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleWarmingAccount[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [skills, setSkills] = useState<AISkill[]>([]);
  const [images, setImages] = useState<AIImageGeneration[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const headerScroll = useProvideHeaderScroll(settings.activeTab);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        sound.playTap();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load all data on mount
  const refreshAllData = () => {
    setPlans(db.getPlans());
    setNotes(db.getNotes());
    setPasswords(db.getPasswords());
    setTokens(db.get2FATokens());
    setHotmailAccounts(db.getHotmailAccounts());
    setGoogleAccounts(db.getGoogleAccounts());
    setProviders(db.getAIProviders());
    setSessions(db.getAISessions());
    setSkills(db.getAISkills());
    setImages(db.getAIImages());
    const currentSettings = db.getSettings();
    setSettings(currentSettings);

    // Apply Sound setting
    sound.isEnabled = currentSettings.soundEnabled;

    // Apply Theme mode
    if (currentSettings.themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (currentSettings.themeMode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Apply Accent Color variables
    applyAccent(currentSettings.accentColor);
  };

  useEffect(() => {
    refreshAllData();
    perf.measure('app-boot', 'app-boot');

    // Prefetch the remaining tab chunks while idle, so the first tab
    // switch never shows the loading skeleton.
    const prefetch = () => {
      void import('./components/tabs/PlansTab');
      void import('./components/tabs/NotesTab');
      void import('./components/tabs/VaultTab');
      void import('./components/tabs/AITab');
      void import('./components/tabs/SettingsTab');
      void import('./components/tabs/DashboardBentoView');
    };
    const idleApi = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof idleApi.requestIdleCallback === 'function') {
      idleId = idleApi.requestIdleCallback(prefetch, { timeout: 3000 });
    } else {
      timeoutId = setTimeout(prefetch, 2000);
    }
    return () => {
      if (idleId !== undefined && idleApi.cancelIdleCallback) idleApi.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Tab transition timing (dev console only)
  useEffect(() => {
    perf.measure(`tab:${settings.activeTab}`, `tab:${settings.activeTab}:start`);
    perf.clear(`tab:${settings.activeTab}:start`);
  }, [settings.activeTab]);

  // Startup silent update check if autoCheckUpdate is enabled
  useEffect(() => {
    if (settings.autoCheckUpdate === false) return;
    let isMounted = true;
    const runCheck = async () => {
      try {
        const res = await checkAppUpdate(CURRENT_VERSION);
        if (!isMounted) return;
        if (res.hasUpdate && res.latest) {
          if (settings.dismissedVersion && settings.dismissedVersion === res.latest.version) {
            return;
          }
          setUpdateInfo(res.latest);
          setIsUpdateModalOpen(true);
        }
      } catch (err) {
        console.warn('Auto update check failed:', err);
      }
    };
    const timer = setTimeout(runCheck, 2500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [settings.autoCheckUpdate, settings.dismissedVersion]);

  const [tabDirection, setTabDirection] = useState<number>(0);
  const prevTabRef = useRef<AppTab>(settings.activeTab);

  // Sync direction if settings.activeTab is updated from any other place
  useEffect(() => {
    if (settings.activeTab !== prevTabRef.current) {
      const prevOrder = TAB_ORDER[prevTabRef.current] ?? 0;
      const nextOrder = TAB_ORDER[settings.activeTab] ?? 0;
      setTabDirection(nextOrder === prevOrder ? 0 : nextOrder > prevOrder ? 1 : -1);
      prevTabRef.current = settings.activeTab;
    }
  }, [settings.activeTab]);

  const handleSelectTab = (tab: AppTab) => {
    if (tab === settings.activeTab) return;
    const prevOrder = TAB_ORDER[prevTabRef.current] ?? 0;
    const nextOrder = TAB_ORDER[tab] ?? 0;
    const direction = nextOrder === prevOrder ? 0 : nextOrder > prevOrder ? 1 : -1;
    setTabDirection(direction);
    prevTabRef.current = tab;

    perf.mark(`tab:${tab}:start`);
    setSettings(prev => {
      const updated: AppSettings = { ...prev, activeTab: tab };
      db.saveSettings(updated);
      return updated;
    });
  };

  const handleToggleFrame = () => {
    sound.playToggle();
    setSettings(prev => {
      const nextFrame: DeviceFrame = prev.deviceFrame === 'mobile' ? 'desktop' : 'mobile';
      const updated: AppSettings = { ...prev, deviceFrame: nextFrame };
      db.saveSettings(updated);
      return updated;
    });
  };

  const handleToggleTheme = () => {
    sound.playTap();
    setSettings(prev => {
      const nextMode = prev.themeMode === 'dark' ? 'light' : 'dark';
      const updated: AppSettings = { ...prev, themeMode: nextMode };
      db.saveSettings(updated);
      if (nextMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return updated;
    });
  };

  const handleUpdateGoogleAccounts = (updated: GoogleWarmingAccount[]) => {
    setGoogleAccounts(updated);
    db.saveGoogleAccounts(updated);
  };

  // Pending plans badge count
  const pendingPlansCount = plans.filter(p => !p.isCompleted).length;
  const webdavConfigured = Boolean(settings.webdav?.serverUrl && settings.webdav?.username);
  const isWideScreen = useIsWideScreen();
  const isDesktopWorkbench = isWideScreen && settings.deviceFrame === 'desktop';
  const isDarkMode = settings.themeMode === 'dark' || (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const renderActiveTab = () => {
    switch (settings.activeTab) {
      case 'dashboard':
        return (
          <ErrorBoundary label="看板">
            <DashboardBentoView
              plans={plans}
              onUpdatePlans={setPlans}
              notes={notes}
              onUpdateNotes={setNotes}
              tokens={tokens}
              accentColor={settings.accentColor}
              onOpenPlansTab={() => handleSelectTab('plans')}
              onOpenNotesTab={() => handleSelectTab('notes')}
              onOpenVaultTab={() => handleSelectTab('vault')}
              onOpenAITab={() => handleSelectTab('ai')}
            />
          </ErrorBoundary>
        );
      case 'plans':
        return (
          <ErrorBoundary label="计划">
            <PlansTab
              plans={plans}
              onUpdatePlans={setPlans}
              accentColor={settings.accentColor}
              onSwitchToAITab={() => handleSelectTab('ai')}
              onSwitchToDashboard={() => handleSelectTab('dashboard')}
            />
          </ErrorBoundary>
        );
      case 'notes':
        return (
          <ErrorBoundary label="笔记">
            <NotesTab
              notes={notes}
              onUpdateNotes={setNotes}
              accentColor={settings.accentColor}
              onSwitchToAITab={() => handleSelectTab('ai')}
            />
          </ErrorBoundary>
        );
      case 'vault':
        return (
          <ErrorBoundary label="安全箱">
            <VaultTab
              passwords={passwords}
              onUpdatePasswords={setPasswords}
              tokens={tokens}
              onUpdateTokens={setTokens}
              hotmailAccounts={hotmailAccounts}
              onUpdateHotmailAccounts={setHotmailAccounts}
              googleAccounts={googleAccounts}
              onUpdateGoogleAccounts={handleUpdateGoogleAccounts}
              providers={providers}
              accentColor={settings.accentColor}
            />
          </ErrorBoundary>
        );
      case 'ai':
        return (
          <ErrorBoundary label="AI 助手">
            <AITab
              providers={providers}
              onUpdateProviders={setProviders}
              sessions={sessions}
              onUpdateSessions={setSessions}
              skills={skills}
              onUpdateSkills={setSkills}
              images={images}
              onUpdateImages={setImages}
              accentColor={settings.accentColor}
            />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary label="设置">
            <SettingsTab
              settings={settings}
              onUpdateSettings={setSettings}
              onRefreshAllData={refreshAllData}
              onOpenAbout={() => setIsAboutOpen(true)}
              hasUpdate={Boolean(updateInfo)}
            />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <ToastProvider>
      <StorageQuotaWatcher />
      <MobileFrame
        deviceFrame={settings.deviceFrame}
        onToggleFrame={handleToggleFrame}
        activeTab={settings.activeTab}
        onSelectTab={handleSelectTab}
        accentColor={settings.accentColor}
        pendingPlansCount={pendingPlansCount}
        plansCount={plans.length}
        notesCount={notes.length}
        vaultCount={passwords.length + tokens.length}
        onOpenSearch={() => setIsSearchOpen(true)}
        webdavConfigured={webdavConfigured}
        onToggleTheme={handleToggleTheme}
        isDarkMode={isDarkMode}
      >
        {/* Scroll-aware header + pages share the header-scroll channel */}
        <HeaderScrollContext.Provider value={headerScroll}>
        {/* Top Header: large-title mobile header, breadcrumb on desktop workbench */}
        <TopHeader
          activeTab={settings.activeTab}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleDashboard={() => handleSelectTab(settings.activeTab === 'dashboard' ? 'plans' : 'dashboard')}
          isDesktop={isDesktopWorkbench}
        />

        {/* Tab Pages with fluid directional transition */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <React.Suspense fallback={<TabLoadingSkeleton />}>
            <AnimatePresence mode="popLayout" initial={false} custom={tabDirection}>
              <motion.div
                key={settings.activeTab}
                custom={tabDirection}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full h-full flex-1 flex flex-col overflow-hidden"
                style={{ willChange: 'transform, opacity' }}
              >
                {renderActiveTab()}
              </motion.div>
            </AnimatePresence>
          </React.Suspense>
        </div>
        </HeaderScrollContext.Provider>

        {/* Bottom WeChat Tab Bar: Only on mobile / phone chassis viewports */}
        {!isDesktopWorkbench && (
          <BottomTabBar
            activeTab={settings.activeTab}
            onSelectTab={handleSelectTab}
            pendingPlansCount={pendingPlansCount}
          />
        )}
      </MobileFrame>

      {/* Global Cmd+K Search Palette */}
      <QuickSearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        plans={plans}
        notes={notes}
        passwords={passwords}
        tokens={tokens}
        onSelectTab={handleSelectTab}
        accentColor={settings.accentColor}
      />

      {/* About Modal (Android Fullscreen Flow) */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* Auto Update Notification Modal */}
      {updateInfo && (
        <UpdateModal
          isOpen={isUpdateModalOpen}
          updateInfo={updateInfo}
          onClose={() => setIsUpdateModalOpen(false)}
          onDismissForever={() => {
            if (updateInfo) {
              const updated = { ...settings, dismissedVersion: updateInfo.version };
              setSettings(updated);
              db.saveSettings(updated);
            }
            setIsUpdateModalOpen(false);
          }}
        />
      )}
    </ToastProvider>
  );
};

export default App;
