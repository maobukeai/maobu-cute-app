import React, { useState, useEffect } from 'react';
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
} from './types';
import { db } from './utils/storage';
import { sound } from './utils/sound';
import { MobileFrame } from './components/MobileFrame';
import { TopHeader } from './components/TopHeader';
import { BottomTabBar } from './components/BottomTabBar';
import { QuickSearchPalette } from './components/common/QuickSearchPalette';

const DashboardBentoView = React.lazy(() => import('./components/tabs/DashboardBentoView').then(m => ({ default: m.DashboardBentoView })));
const PlansTab = React.lazy(() => import('./components/tabs/PlansTab').then(m => ({ default: m.PlansTab })));
const NotesTab = React.lazy(() => import('./components/tabs/NotesTab').then(m => ({ default: m.NotesTab })));
const VaultTab = React.lazy(() => import('./components/tabs/VaultTab').then(m => ({ default: m.VaultTab })));
const AITab = React.lazy(() => import('./components/tabs/AITab').then(m => ({ default: m.AITab })));
const SettingsTab = React.lazy(() => import('./components/tabs/SettingsTab').then(m => ({ default: m.SettingsTab })));

const TabLoadingSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-6 select-none animate-pulse">
    <div className="w-12 h-12 rounded-3xl bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center text-2xl shadow-inner">
      🐾
    </div>
    <div className="space-y-1.5 text-center">
      <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto" />
      <div className="h-2.5 w-40 bg-zinc-100 dark:bg-zinc-800/60 rounded-full mx-auto" />
    </div>
  </div>
);

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
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    let hex = '#07C160';
    let light = '#E8F8F0';
    let bubble = '#95EC69';
    let glow = 'rgba(7, 193, 96, 0.25)';

    if (currentSettings.accentColor === 'catpaw') {
      hex = '#FF6B8B';
      light = '#FFF0F3';
      bubble = '#FF8DA6';
      glow = 'rgba(255, 107, 139, 0.3)';
    } else if (currentSettings.accentColor === 'apple') {
      hex = '#0A84FF';
      light = '#EFF6FF';
      bubble = '#5AC8FA';
      glow = 'rgba(10, 132, 255, 0.28)';
    } else if (currentSettings.accentColor === 'orange') {
      hex = '#FF9500';
      light = '#FFF7ED';
      bubble = '#FFB340';
      glow = 'rgba(255, 149, 0, 0.28)';
    } else if (currentSettings.accentColor === 'purple') {
      hex = '#AF52DE';
      light = '#FAF5FF';
      bubble = '#DA8FFF';
      glow = 'rgba(175, 82, 222, 0.28)';
    }

    document.documentElement.style.setProperty('--theme-accent', hex);
    document.documentElement.style.setProperty('--theme-accent-light', light);
    document.documentElement.style.setProperty('--theme-accent-glow', glow);
    document.documentElement.style.setProperty('--theme-bubble', bubble);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleSelectTab = (tab: AppTab) => {
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
  const isWideScreen = windowWidth >= 1024;
  const isDesktopWorkbench = isWideScreen && settings.deviceFrame === 'desktop';
  const isDarkMode = settings.themeMode === 'dark' || (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <>
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
        {/* Top Header: iOS 18 fluid glass style on mobile, content header on desktop */}
        <TopHeader
          activeTab={settings.activeTab}
          accentColor={settings.accentColor}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAI={() => handleSelectTab('ai')}
          onToggleDashboard={() => handleSelectTab(settings.activeTab === 'dashboard' ? 'plans' : 'dashboard')}
          isDesktop={isDesktopWorkbench}
        />

        {/* Tab Pages: Responsive Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <React.Suspense fallback={<TabLoadingSkeleton />}>
            {settings.activeTab === 'dashboard' && (
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
            )}

            {settings.activeTab === 'plans' && (
              <PlansTab
                plans={plans}
                onUpdatePlans={setPlans}
                accentColor={settings.accentColor}
                onSwitchToAITab={() => handleSelectTab('ai')}
                onSwitchToDashboard={() => handleSelectTab('dashboard')}
              />
            )}

            {settings.activeTab === 'notes' && (
              <NotesTab
                notes={notes}
                onUpdateNotes={setNotes}
                accentColor={settings.accentColor}
                onSwitchToAITab={() => handleSelectTab('ai')}
              />
            )}

            {settings.activeTab === 'vault' && (
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
            )}

            {settings.activeTab === 'ai' && (
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
            )}

            {settings.activeTab === 'settings' && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={setSettings}
                onRefreshAllData={refreshAllData}
              />
            )}
          </React.Suspense>
        </div>

        {/* Bottom WeChat Tab Bar: Only on mobile / phone chassis viewports */}
        {!isDesktopWorkbench && (
          <BottomTabBar
            activeTab={settings.activeTab}
            onSelectTab={handleSelectTab}
            accentColor={settings.accentColor}
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
    </>
  );
};

export default App;
