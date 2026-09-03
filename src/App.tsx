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

import { PlansTab } from './components/tabs/PlansTab';
import { NotesTab } from './components/tabs/NotesTab';
import { VaultTab } from './components/tabs/VaultTab';
import { AITab } from './components/tabs/AITab';
import { SettingsTab } from './components/tabs/SettingsTab';

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

  // Pending plans badge count
  const pendingPlansCount = plans.filter(p => !p.isCompleted).length;

  const handleUpdateGoogleAccounts = (updated: GoogleWarmingAccount[]) => {
    setGoogleAccounts(updated);
    db.saveGoogleAccounts(updated);
  };

  return (
    <MobileFrame deviceFrame={settings.deviceFrame} onToggleFrame={handleToggleFrame}>
      {/* Top WeChat/Apple Header */}
      <TopHeader
        activeTab={settings.activeTab}
        accentColor={settings.accentColor}
      />

      {/* Tab Pages */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {settings.activeTab === 'plans' && (
          <PlansTab
            plans={plans}
            onUpdatePlans={setPlans}
            accentColor={settings.accentColor}
            onSwitchToAITab={() => handleSelectTab('ai')}
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
      </div>

      {/* Bottom WeChat Tab Bar */}
      <BottomTabBar
        activeTab={settings.activeTab}
        onSelectTab={handleSelectTab}
        accentColor={settings.accentColor}
        pendingPlansCount={pendingPlansCount}
      />
    </MobileFrame>
  );
};

export default App;
