// Persistent Storage Engine and Seed Data for 【猫步可爱】
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
  FullAppBackup,
  GoogleWarmingAccount,
} from '../types';
import { BUILTIN_SKILLS, PRESET_PROVIDERS } from './ai';

const STORAGE_KEYS = {
  PLANS: 'maobu_plans',
  NOTES: 'maobu_notes',
  PASSWORDS: 'maobu_passwords',
  TWO_FACTOR: 'maobu_2fa_tokens',
  HOTMAIL: 'maobu_hotmail_accounts',
  GOOGLE_WARMING: 'maobu_google_warming_accounts',
  GOOGLE_WARMING_CATEGORIES: 'maobu_google_warming_categories',
  AI_PROVIDERS: 'maobu_ai_providers',
  AI_SESSIONS: 'maobu_ai_sessions',
  AI_SKILLS: 'maobu_ai_skills',
  AI_IMAGES: 'maobu_ai_images',
  SETTINGS: 'maobu_settings',
  VAULT_VERIFIER: 'maobu_vault_verifier',
  PASSWORDS_VAULT_CIPHERTEXT: 'maobu_passwords_vault_ciphertext',
};

// Initial Seed Data - Pure Software Onboarding & Usage Guide (Zero Dummy Presets)
const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'p_readme',
    title: '【猫步可爱】全能个人助理使用说明',
    description: '欢迎使用猫步可爱！本条目为软件内置功能使用指南。你可以点击勾选子步骤体验进度，点击卡片直接编辑，或向左滑动卡片进行管理与删除。',
    priority: 'high',
    category: 'life',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    isCompleted: false,
    subtasks: [
      { id: 'st_guide_1', title: '1. 点击上方「智能规划」：让大模型为你深度推导并拆解行动目标', isDone: false },
      { id: 'st_guide_2', title: '2. 切换到「笔记」：体验高品质 Markdown 排版与灵感记录', isDone: false },
      { id: 'st_guide_3', title: '3. 体验「安全箱」：本地加密密码管理与 30 秒倒计时 2FA 动态令牌', isDone: false },
      { id: 'st_guide_4', title: '4. 探索「AI 助手」：在「模型配置」中管理端点密钥，或在「技能集市」安装插件', isDone: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'n_1',
    title: '欢迎使用【猫步可爱】个人全能助理',
    content: `# 欢迎来到【猫步可爱】(Maobu Cute)

这是为你量身定制的**现代化高能个人助理**，融合了 **微信的轻快极简** 与 **Apple iOS 的丝滑原生质感**。

### 核心功能导览：
1. **计划看板 (Plans)**：支持优先级、子任务进度、截止倒计时与完成反馈；
2. **灵感备忘录 (Notes)**：Markdown 实时编辑、分类置顶、快速全文搜索；
3. **安全密码箱 (Password Vault)**：客户端本地高强度加密保护你的核心凭证；
4. **2FA 动态验证码 (Authenticator)**：RFC 6238 标准 30 秒圆环倒计时与一键复制；
5. **微软邮箱协议中心 (Hotmail Hub)**：支持 \`email----password----client_id----refresh_token\` 批量导入导出、自动刷新令牌、一键提取邮件短信验证码；
6. **AI 对话与创作中心 (AI Companion)**：流式对话、自选大模型 API、自定义 Skill 扩展插件、DALL-E 3 高清生图；
7. **数据安全与备份**：纯本地储存，支持一键完整 JSON 导出与恢复。

*享受每一次轻巧优雅的体验！*`,
    category: '指南',
    tags: ['新手教程', '功能特色'],
    isPinned: true,
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_TWO_FACTOR: TwoFactorToken[] = [];

const DEFAULT_HOTMAIL: HotmailAccount[] = [];

const DEFAULT_GOOGLE_ACCOUNTS: GoogleWarmingAccount[] = [];

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  accentColor: 'apple',
  deviceFrame: 'desktop',
  soundEnabled: true,
  hapticsEnabled: true,
  hasMasterPassword: false,
  activeTab: 'plans',
  autoCheckUpdate: true,
};

// ── Memory-cached storage layer ─────────────────────────────────
// Reads are served from memory after first load (no JSON.parse on the
// render path). Writes update the cache immediately and coalesce into
// a single debounced localStorage flush, keeping rapid mutations off
// the interaction-critical path.
const memCache = new Map<string, unknown>();
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
const WRITE_DEBOUNCE_MS = 300;

function flushKey(key: string): void {
  const timer = flushTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    flushTimers.delete(key);
  }
  const value = memCache.get(key);
  if (value === undefined) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded: drop half of the heaviest collection (AI images)
    // and retry once; surface the failure to the UI layer either way.
    if (key === STORAGE_KEYS.AI_IMAGES && Array.isArray(value) && value.length > 4) {
      try {
        const trimmed = (value as unknown[]).slice(0, Math.floor(value.length / 2));
        memCache.set(key, trimmed);
        localStorage.setItem(key, JSON.stringify(trimmed));
      } catch {
        /* keep data in memory only */
      }
    }
    console.error(`Error flushing ${key} to storage:`, err);
    try {
      window.dispatchEvent(new CustomEvent('maobu-storage-quota', { detail: { key } }));
    } catch {
      /* non-DOM env */
    }
  }
}

export function flushAll(): void {
  for (const key of Array.from(flushTimers.keys())) flushKey(key);
}

if (typeof document !== 'undefined') {
  // Lifecycle flushes: persisted data must survive quick app switches.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
  });
  window.addEventListener('pagehide', flushAll);
}

// Generic safe storage helper
function getStored<T>(key: string, fallback: T): T {
  if (memCache.has(key)) return memCache.get(key) as T;
  try {
    const item = localStorage.getItem(key);
    const value = item ? JSON.parse(item) : (typeof fallback === 'object' && fallback !== null ? JSON.parse(JSON.stringify(fallback)) : fallback);
    memCache.set(key, value);
    return value;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    memCache.set(key, fallback);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  memCache.set(key, value);
  const timer = flushTimers.get(key);
  if (timer) clearTimeout(timer);
  flushTimers.set(
    key,
    setTimeout(() => {
      flushTimers.delete(key);
      flushKey(key);
    }, WRITE_DEBOUNCE_MS)
  );
}

export const db = {
  flushAll,

  // Plans
  getPlans: (): PlanItem[] => {
    const plans = getStored(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    let mutated = false;
    const sanitized = plans.map(p => {
      if (p.title.includes('🐱') || p.subtasks?.some(st => st.title.includes('✨'))) {
        mutated = true;
        return {
          ...p,
          title: p.title.replace(/🐱/gu, '').trim(),
          subtasks: p.subtasks?.map(st => ({
            ...st,
            title: st.title.replace(/✨\s*/gu, '').trim(),
          })),
        };
      }
      return p;
    });
    if (mutated) {
      setStored(STORAGE_KEYS.PLANS, sanitized);
    }
    return sanitized;
  },
  savePlans: (plans: PlanItem[]) => setStored(STORAGE_KEYS.PLANS, plans),

  // Notes
  getNotes: (): NoteItem[] => {
    const notes = getStored(STORAGE_KEYS.NOTES, DEFAULT_NOTES);
    let mutated = false;
    const sanitized = notes.map(n => {
      let title = n.title;
      let content = n.content;
      if (title.includes('🐾') || title.includes('🐱')) {
        mutated = true;
        title = title.replace(/[🐾🐱]/gu, '').trim();
      }
      if (content.includes('🐾') || content.includes('🌟') || content.includes('✨') || content.includes('享受每一次轻巧优雅的点击与陪伴！')) {
        mutated = true;
        content = content
          .replace(/[🐾🌟✨]/gu, '')
          .replace('享受每一次轻巧优雅的点击与陪伴！', '享受每一次轻巧优雅的体验！');
      }
      return { ...n, title, content };
    });
    if (mutated) {
      setStored(STORAGE_KEYS.NOTES, sanitized);
    }
    return sanitized;
  },
  saveNotes: (notes: NoteItem[]) => setStored(STORAGE_KEYS.NOTES, notes),

  // Passwords & Master Password Encryption
  getPasswords: (): PasswordItem[] => {
    // When master password protection is active, plaintext storage is kept empty
    if (localStorage.getItem(STORAGE_KEYS.VAULT_VERIFIER)) {
      return [];
    }
    return getStored(STORAGE_KEYS.PASSWORDS, []);
  },
  savePasswords: (passwords: PasswordItem[]) => setStored(STORAGE_KEYS.PASSWORDS, passwords),
  hasMasterPassword: (): boolean => {
    return !!localStorage.getItem(STORAGE_KEYS.VAULT_VERIFIER);
  },
  getVaultVerifier: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.VAULT_VERIFIER);
  },
  saveVaultVerifier: (verifier: string): void => {
    localStorage.setItem(STORAGE_KEYS.VAULT_VERIFIER, verifier);
  },
  clearVaultVerifier: (): void => {
    localStorage.removeItem(STORAGE_KEYS.VAULT_VERIFIER);
  },
  getPasswordsCiphertext: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.PASSWORDS_VAULT_CIPHERTEXT);
  },
  savePasswordsCiphertext: (ciphertext: string): void => {
    localStorage.setItem(STORAGE_KEYS.PASSWORDS_VAULT_CIPHERTEXT, ciphertext);
  },
  clearPasswordsCiphertext: (): void => {
    localStorage.removeItem(STORAGE_KEYS.PASSWORDS_VAULT_CIPHERTEXT);
  },

  // 2FA
  get2FATokens: (): TwoFactorToken[] => getStored(STORAGE_KEYS.TWO_FACTOR, DEFAULT_TWO_FACTOR),
  save2FATokens: (tokens: TwoFactorToken[]) => setStored(STORAGE_KEYS.TWO_FACTOR, tokens),

  // Hotmail Accounts
  getHotmailAccounts: (): HotmailAccount[] => getStored(STORAGE_KEYS.HOTMAIL, DEFAULT_HOTMAIL),
  saveHotmailAccounts: (accounts: HotmailAccount[]) => setStored(STORAGE_KEYS.HOTMAIL, accounts),

  // Google Warming Accounts
  getGoogleAccounts: (): GoogleWarmingAccount[] => getStored(STORAGE_KEYS.GOOGLE_WARMING, DEFAULT_GOOGLE_ACCOUNTS),
  saveGoogleAccounts: (accounts: GoogleWarmingAccount[]) => setStored(STORAGE_KEYS.GOOGLE_WARMING, accounts),
  getGoogleCategories: (): string[] => getStored(STORAGE_KEYS.GOOGLE_WARMING_CATEGORIES, ['GCP', 'AdSense', '常规']),
  saveGoogleCategories: (categories: string[]) => setStored(STORAGE_KEYS.GOOGLE_WARMING_CATEGORIES, categories),

  // AI Providers
  getAIProviders: (): AIProvider[] => {
    const list = getStored(STORAGE_KEYS.AI_PROVIDERS, PRESET_PROVIDERS);
    let mutated = false;
    const sanitized = list.map(p => {
      const legacyMockModels = [
        'deepseek-chat',
        'deepseek-reasoner',
        'gpt-4o',
        'gpt-4o-mini',
        'claude-3-5-sonnet',
        'deepseek-v4-flash',
        'glm-5.2',
        'kimi-k3',
      ];
      const hasOnlyLegacyModels =
        p.availableModels &&
        p.availableModels.length > 0 &&
        p.availableModels.every(m => legacyMockModels.includes(m));

      if (!p.apiKey?.trim() || hasOnlyLegacyModels) {
        if (p.defaultModel || (p.availableModels && p.availableModels.length > 0)) {
          mutated = true;
          return {
            ...p,
            defaultModel: '',
            availableModels: [],
          };
        }
      }
      return p;
    });
    if (mutated) {
      setStored(STORAGE_KEYS.AI_PROVIDERS, sanitized);
    }
    return sanitized;
  },
  saveAIProviders: (providers: AIProvider[]) => setStored(STORAGE_KEYS.AI_PROVIDERS, providers),

  // AI Sessions
  getAISessions: (): AISession[] => {
    const rawSessions = getStored<AISession[]>(STORAGE_KEYS.AI_SESSIONS, [
      {
        id: 'sess_default',
        title: '新对话',
        activeSkillId: 'skill_cat',
        messages: [
          {
            id: 'msg_welcome',
            role: 'assistant',
            content: '你好！我是猫步智能助理。你可以让我帮你制定目标计划、撰写笔记文案、整理密码箱，或是探讨任何问题。',
            timestamp: new Date().toISOString(),
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]);

    let mutated = false;
    const sanitized = rawSessions.map(s => {
      let title = s.title;
      if (title.includes('猫步喵') || title.includes('初次相遇')) {
        mutated = true;
        title = '新对话';
      }
      return {
        ...s,
        title,
        messages: s.messages.map(m => {
          let content = m.content;
          if (content.includes('喵呜~') || content.includes('【猫步喵】') || content.includes('ฅ^•ﻌ•^ฅ')) {
            mutated = true;
            content = '你好！我是猫步智能助理。你可以让我帮你制定目标计划、撰写笔记文案、整理密码箱，或是探讨任何问题。';
          }
          return {
            ...m,
            content,
            isStreaming: false,
            isReasoning: false,
          };
        }),
      };
    });

    if (mutated) {
      setStored(STORAGE_KEYS.AI_SESSIONS, sanitized);
    }
    return sanitized;
  },
  saveAISessions: (sessions: AISession[]) => setStored(STORAGE_KEYS.AI_SESSIONS, sessions),

  // AI Skills
  getAISkills: (): AISkill[] => {
    const stored = getStored<AISkill[]>(STORAGE_KEYS.AI_SKILLS, BUILTIN_SKILLS);
    const builtinMap = new Map(BUILTIN_SKILLS.map(s => [s.id, s]));
    let mutated = false;
    const merged = stored.map(s => {
      if (builtinMap.has(s.id)) {
        mutated = true;
        return { ...s, ...builtinMap.get(s.id)! };
      }
      if (s.icon) {
        mutated = true;
        return { ...s, icon: '' };
      }
      return s;
    });
    // Ensure all builtin skills are present
    for (const b of BUILTIN_SKILLS) {
      if (!merged.some(m => m.id === b.id)) {
        mutated = true;
        merged.push(b);
      }
    }
    if (mutated) {
      setStored(STORAGE_KEYS.AI_SKILLS, merged);
    }
    return merged;
  },
  saveAISkills: (skills: AISkill[]) => setStored(STORAGE_KEYS.AI_SKILLS, skills),

  // AI Images
  getAIImages: (): AIImageGeneration[] => getStored(STORAGE_KEYS.AI_IMAGES, []),
  saveAIImages: (images: AIImageGeneration[]) => setStored(STORAGE_KEYS.AI_IMAGES, images),

  // Settings
  getSettings: (): AppSettings => {
    const s = getStored(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!s.accentColor || s.accentColor === 'wechat') {
      s.accentColor = 'apple';
      setStored(STORAGE_KEYS.SETTINGS, s);
    }
    return s;
  },
  saveSettings: (settings: AppSettings) => setStored(STORAGE_KEYS.SETTINGS, settings),

  // Full Export
  exportFullBackup: (): FullAppBackup => {
    flushAll();
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      plans: db.getPlans(),
      notes: db.getNotes(),
      passwords: db.getPasswords(),
      twoFactorTokens: db.get2FATokens(),
      hotmailAccounts: db.getHotmailAccounts(),
      googleWarmingAccounts: db.getGoogleAccounts(),
      aiProviders: db.getAIProviders(),
      aiSessions: db.getAISessions(),
      aiSkills: db.getAISkills(),
      aiImages: db.getAIImages(),
      settings: db.getSettings(),
      vaultVerifier: db.getVaultVerifier() || undefined,
      passwordsCiphertext: db.getPasswordsCiphertext() || undefined,
    };
  },

  // Full Import
  importFullBackup: (backup: FullAppBackup): boolean => {
    try {
      if (!backup || !backup.version) return false;
      if (Array.isArray(backup.plans)) db.savePlans(backup.plans);
      if (Array.isArray(backup.notes)) db.saveNotes(backup.notes);
      if (Array.isArray(backup.passwords)) db.savePasswords(backup.passwords);
      if (Array.isArray(backup.twoFactorTokens)) db.save2FATokens(backup.twoFactorTokens);
      if (Array.isArray(backup.hotmailAccounts)) db.saveHotmailAccounts(backup.hotmailAccounts);
      if (Array.isArray(backup.googleWarmingAccounts)) db.saveGoogleAccounts(backup.googleWarmingAccounts);
      if (Array.isArray(backup.aiProviders)) db.saveAIProviders(backup.aiProviders);
      if (Array.isArray(backup.aiSessions)) db.saveAISessions(backup.aiSessions);
      if (Array.isArray(backup.aiSkills)) db.saveAISkills(backup.aiSkills);
      if (Array.isArray(backup.aiImages)) db.saveAIImages(backup.aiImages);
      if (backup.settings) db.saveSettings(backup.settings);
      if (backup.vaultVerifier) {
        db.saveVaultVerifier(backup.vaultVerifier);
      } else {
        db.clearVaultVerifier();
      }
      if (backup.passwordsCiphertext) {
        db.savePasswordsCiphertext(backup.passwordsCiphertext);
      } else {
        db.clearPasswordsCiphertext();
      }
      flushAll();
      return true;
    } catch (err) {
      console.error('Backup import error:', err);
      return false;
    }
  },

  // Reset all data
  clearAllData: () => {
    for (const timer of flushTimers.values()) clearTimeout(timer);
    flushTimers.clear();
    memCache.clear();
    localStorage.clear();
  }
};
