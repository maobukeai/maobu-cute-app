// Types and Data Models for 【猫步可爱】 (Maobu Cute App)

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';
export type PlanCategory = 'work' | 'study' | 'life' | 'health' | 'cat' | 'other';

export interface SubTask {
  id: string;
  title: string;
  isDone: boolean;
}

export interface PlanItem {
  id: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  category: PlanCategory | string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  subtasks: SubTask[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordItem {
  id: string;
  title: string;
  username: string;
  password: string; // Master-key or client encrypted
  website?: string;
  category: 'social' | 'email' | 'finance' | 'work' | 'game' | 'other';
  notes?: string;
  strength?: 'weak' | 'fair' | 'strong' | 'very_strong';
  createdAt: string;
  updatedAt: string;
}

export interface TwoFactorToken {
  id: string;
  issuer: string;
  account: string;
  secret: string; // Base32
  digits: number; // usually 6
  period: number; // usually 30
  algorithm: 'SHA1' | 'SHA256';
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  receivedDateTime: string;
  bodyPreview: string;
  bodyHtml?: string;
  bodyText?: string;
  extractedCode?: string; // 4-8 digit verification code/SMS
  folder?: 'inbox' | 'junkemail';
}

export interface HotmailAccount {
  id: string;
  email: string;
  password: string;
  clientId: string;
  refreshToken: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  status: 'idle' | 'valid' | 'expired' | 'error';
  lastCheckedAt?: string;
  lastErrorMessage?: string;
  messages: EmailMessage[];
}

export interface GoogleWarmingAccount {
  id: string;
  email: string;
  password?: string;
  recoveryEmail?: string;
  twoFASecret?: string;
  country?: string;
  note?: string;
  backupCodes?: string;
  category?: string;
  status: 'warming' | 'completed' | 'paused';
  currentDay: number; // 1 ~ 14
  lastWarmedAt?: string;
  createdAt: string;
}

export interface GoogleWarmingBackupData {
  version: number;
  exportedAt: string;
  total: number;
  accounts: GoogleWarmingAccount[];
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  availableModels: string[];
  isActive: boolean;
  latency?: number; // ms
  lastTestedAt?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
  isReasoning?: boolean;
  reasoningDurationSeconds?: number;
  timestamp: string;
  isStreaming?: boolean;
  error?: string;
}

export interface AISession {
  id: string;
  title: string;
  activeSkillId?: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AISkill {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
  isBuiltin: boolean;
  tags: string[];
  // Real GitHub metadata
  repo?: string;
  repoUrl?: string;
  author?: string;
  stars?: string;
  branch?: string;
  license?: string;
}

export interface AIImageGeneration {
  id: string;
  prompt: string;
  revisedPrompt?: string;
  imageUrl: string;
  size: string;
  style?: string;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'wechat' | 'catpaw' | 'apple' | 'orange' | 'purple';
export type DeviceFrame = 'mobile' | 'desktop';
export type AppTab = 'plans' | 'notes' | 'vault' | 'ai' | 'settings';

export interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  remoteDir: string;
  retentionDays: number; // 7, 15, 30, 0
  lastUploadedAt?: string;
  lastRestoredAt?: string;
  isReady: boolean;
}

export interface WebDAVBackupItem {
  name: string;
  size: number;
  lastModified: string;
  url: string;
}

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  deviceFrame: DeviceFrame;
  soundEnabled: boolean;
  hasMasterPassword: boolean;
  activeTab: AppTab;
  webdav?: WebDAVConfig;
}

export interface FullAppBackup {
  version: string;
  exportedAt: string;
  plans: PlanItem[];
  notes: NoteItem[];
  passwords: PasswordItem[];
  twoFactorTokens: TwoFactorToken[];
  hotmailAccounts: HotmailAccount[];
  aiProviders: AIProvider[];
  aiSessions: AISession[];
  aiSkills: AISkill[];
  aiImages: AIImageGeneration[];
  googleWarmingAccounts?: GoogleWarmingAccount[];
  settings: AppSettings;
}
