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

    if (currentSettings.accentColor === 'catpaw') {
      hex = '#FF6B8B';
      light = '#FFF0F3';
      bubble = '#FF8DA6';
    } else if (currentSettings.accentColor === 'apple') {
      hex = '#007AFF';
      light = '#EBF4FF';
      bubble = '#5AC8FA';
    } else if (currentSettings.accentColor === 'orange') {
      hex = '#FF9500';
      light = '#FFF6EB';
      bubble = '#FFB340';
    } else if (currentSettings.accentColor === 'purple') {
      hex = '#AF52DE';
      light = '#F8EDFF';
      bubble = '#DA8FFF';
    }

    document.documentElement.style.setProperty('--theme-accent', hex);
    document.documentElement.style.setProperty('--theme-accent-light', light);
    document.documentElement.style.setProperty('--theme-bubble', bubble);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleSelectTab = (tab: AppTab) => {
    const updated: AppSettings = { ...settings, activeTab: tab };
    setSettings(updated);
    db.saveSettings(updated);
  };

  const handleToggleFrame = () => {
    sound.playToggle();
    const nextFrame: DeviceFrame = settings.deviceFrame === 'mobile' ? 'desktop' : 'mobile';
    const updated: AppSettings = { ...settings, deviceFrame: nextFrame };
    setSettings(updated);
    db.saveSettings(updated);
  };

  // Pending plans badge count
  const pendingPlansCount = plans.filter(p => !p.isCompleted).length;

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
            onUpdateGoogleAccounts={setGoogleAccounts}
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
