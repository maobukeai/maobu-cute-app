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
};

// Initial Seed Data
const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'p_1',
    title: '体验【猫步可爱】全能功能',
    description: '查看计划、笔记、安全密码箱、2FA动态码、微软邮箱、AI对话与生图',
    priority: 'urgent',
    category: 'life',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    isCompleted: false,
    subtasks: [
      { id: 'st_1', title: '测试微软邮箱刷新令牌与收件箱', isDone: false },
      { id: 'st_2', title: '体验 2FA 动态口令 30s 倒计时', isDone: false },
      { id: 'st_3', title: '在 AI 伴侣中切换技能对话', isDone: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p_2',
    title: '给猫咪梳毛并投喂冻干奖励 🐾',
    description: '每天下班陪伴猫咪 20 分钟互动',
    priority: 'high',
    category: 'cat',
    dueDate: new Date().toISOString().split('T')[0],
    isCompleted: false,
    subtasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p_3',
    title: '整理常用重要密码与两步验证备份',
    description: '存入加密密码箱，并导出离线备份文件',
    priority: 'medium',
    category: 'work',
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    isCompleted: false,
    subtasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'n_1',
    title: '🐾 欢迎使用【猫步可爱】个人全能助理',
    content: `# 欢迎来到【猫步可爱】(Maobu Cute) 🌟

这是为你量身定制的**现代化高能个人助理**，融合了 **微信的轻快极简** 与 **Apple iOS 的丝滑原生质感**。

### ✨ 核心功能导览：
1. **计划看板 (Plans)**：支持优先级、子任务进度、截止倒计时与庆祝音效；
2. **灵感备忘录 (Notes)**：Markdown 实时编辑、分类置顶、快速全文搜索；
3. **安全密码箱 (Password Vault)**：客户端本地高强度加密保护你的核心凭证；
4. **2FA 动态验证码 (Authenticator)**：RFC 6238 标准 30 秒圆环倒计时与一键复制；
5. **微软邮箱协议中心 (Hotmail Hub)**：支持 \`email----password----client_id----refresh_token\` 批量导入导出、自动刷新令牌、一键提取邮件短信验证码；
6. **AI 对话与创作中心 (AI Companion)**：流式对话、自选大模型 API、自定义 Skill 扩展插件、DALL-E 3 高清生图；
7. **数据安全与备份**：纯本地储存，支持一键完整 JSON 导出与恢复。

*享受每一次轻巧优雅的点击与陪伴！*`,
    category: '指南',
    tags: ['新手教程', '功能特色'],
    isPinned: true,
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'n_2',
    title: '常用大模型 Prompt 技巧与 Skill 设定',
    content: `## 优质 System Prompt 设定结构

1. **角色定义**：你是谁，具备什么领域权威背景；
2. **语调风格**：亲切温柔、专业严谨、还是幽默生动；
3. **输出格式**：Markdown 格式、分条目清晰列出、代码高亮；
4. **约束规则**：禁止废话，直奔主题，给出最小可行方案。`,
    category: '工作',
    tags: ['AI', 'Prompt'],
    isPinned: false,
    isFavorite: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_TWO_FACTOR: TwoFactorToken[] = [
  {
    id: '2fa_1',
    issuer: 'GitHub',
    account: 'developer@maobu.dev',
    secret: 'JBSWY3DPEHPK3PXP', // Sample standard Base32 key
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2fa_2',
    issuer: 'Microsoft',
    account: 'gkyhnzrzwmw@hotmail.com',
    secret: 'MZXW6YTBOI======',
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_HOTMAIL: HotmailAccount[] = [
  {
    id: 'ms_user_account_1',
    email: 'gkyhnzrzwmw@hotmail.com',
    password: 'zzbaftapfhdm53',
    clientId: '9e5f94bc-e8a4-4e73-b8be-63364c29d753',
    refreshToken: 'M.C514_BL2.0.U.MsaArtifacts.-Cjmy*zba8h9bSZ9gmInf!apAEU0mODjiG5OGR5AeiPmzKVGnCGUgNPg1Nbx!q2O4qwJGI6Ip5HQe6y3kzw1B6hNEMcEn9*ttWvEv2Ykw2p9OizxlOA5Uv1TjzvUBWsAqwXyMz5ZDWnHjiIC07XTn!QwOtTNImxIe7bUdUgszWNQRjP*RmACm4jL2jgkESPdRl4kSHjqYfRYFTo1AwoYls2vymWFJ7rLVOU*lwJ!0ERLFEuAZKw89tPFzfOEzfxMh*3H2UskQlRZ1!5eRsbdnTIxAol9Yw*X1!NlzaWaMoaesCRjwSHhYC9jN1z6GdtEuyn!VU*dwr8yXNPQQhfASsKkoYchfsdVEnkFLqPEwaVSVBlPZq1BhDAkAssks*RSc1mbetXKg6egXmKEVR8H5WaRVtOIopAcX3WntB7HZNWmOvBdRG7sEDupe0FH65LLE0w$$',
    status: 'idle',
    messages: [
      {
        id: 'msg_demo_1',
        subject: '【安全通知】您的登录验证码是 849201',
        from: 'security@accountprotection.microsoft.com',
        fromName: 'Microsoft 帐户团队',
        receivedDateTime: new Date().toISOString(),
        bodyPreview: '您正在进行安全验证。您的验证码是 849201。该验证码将在 15 分钟内有效。',
        extractedCode: '849201',
        folder: 'inbox',
      },
      {
        id: 'msg_demo_2',
        subject: 'Discord 动态验证口令: 519382 (垃圾邮件过滤示例)',
        from: 'noreply@discord.com',
        fromName: 'Discord Security',
        receivedDateTime: new Date(Date.now() - 1800000).toISOString(),
        bodyPreview: 'Hey! Your Discord login verification security code is 519382. Please do not share it with anyone.',
        extractedCode: '519382',
        folder: 'junkemail',
      }
    ],
  }
];

const DEFAULT_GOOGLE_ACCOUNTS: GoogleWarmingAccount[] = [
  {
    id: 'gw_demo_1',
    email: 'alex.developer.2026@gmail.com',
    password: 'P@ssw0rd2026!Cute',
    recoveryEmail: 'backup_alex@hotmail.com',
    twoFASecret: 'JBSWY3DPEHPK3PXP',
    country: '美国',
    note: 'GCP 主开发环境 / Gemini API 调用号',
    backupCodes: '3191 6344 6829 7625 9012 4321',
    category: 'GCP',
    status: 'warming',
    currentDay: 3,
    lastWarmedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'gw_demo_2',
    email: 'sarah.creator.hk@gmail.com',
    password: 'M@obuCute2026#Safe',
    recoveryEmail: 'gkyhnzrzwmw@hotmail.com',
    twoFASecret: 'MZXW6YTBOI======',
    country: '中国香港',
    note: 'YouTube 与 AdSense 创作者高权重老号',
    backupCodes: '5521 8892 1092 3341',
    category: 'AdSense',
    status: 'completed',
    currentDay: 14,
    lastWarmedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'gw_demo_3',
    email: 'kenji.tokyo.test@gmail.com',
    password: 'TokyoCat2026$Fast',
    recoveryEmail: '',
    twoFASecret: '',
    country: '日本',
    note: '备用账号（待配置辅助邮箱）',
    backupCodes: '',
    category: '未分类',
    status: 'paused',
    currentDay: 1,
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'light',
  accentColor: 'wechat',
  deviceFrame: 'mobile',
  soundEnabled: true,
  hasMasterPassword: false,
  activeTab: 'plans',
};

// Generic safe storage helper
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const db = {
  // Plans
  getPlans: (): PlanItem[] => getStored(STORAGE_KEYS.PLANS, DEFAULT_PLANS),
  savePlans: (plans: PlanItem[]) => setStored(STORAGE_KEYS.PLANS, plans),

  // Notes
  getNotes: (): NoteItem[] => getStored(STORAGE_KEYS.NOTES, DEFAULT_NOTES),
  saveNotes: (notes: NoteItem[]) => setStored(STORAGE_KEYS.NOTES, notes),

  // Passwords
  getPasswords: (): PasswordItem[] => getStored(STORAGE_KEYS.PASSWORDS, []),
  savePasswords: (passwords: PasswordItem[]) => setStored(STORAGE_KEYS.PASSWORDS, passwords),

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
    const stored = getStored<AIProvider[]>(STORAGE_KEYS.AI_PROVIDERS, PRESET_PROVIDERS);
    // If stored contains the old bloated multi-vendor presets, migrate to clean custom endpoints
    const hasOldBloated = stored.some(p => p.id === 'provider_deepseek' || p.id === 'provider_openai' || p.id === 'provider_moonshot');
    if (hasOldBloated || stored.length === 0) {
      setStored(STORAGE_KEYS.AI_PROVIDERS, PRESET_PROVIDERS);
      return PRESET_PROVIDERS;
    }
    return stored;
  },
  saveAIProviders: (providers: AIProvider[]) => setStored(STORAGE_KEYS.AI_PROVIDERS, providers),

  // AI Sessions
  getAISessions: (): AISession[] => getStored(STORAGE_KEYS.AI_SESSIONS, [
    {
      id: 'sess_default',
      title: '与猫步喵的初次相遇',
      activeSkillId: 'skill_cat',
      messages: [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: '喵呜~ (ฅ^•ﻌ•^ฅ) 主人你好呀！我是你的专属萌宠助理【猫步喵】！今天想做点什么计划，还是记录一些有趣的想法呢？我随时在这里陪伴你哦~',
          timestamp: new Date().toISOString(),
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ]),
  saveAISessions: (sessions: AISession[]) => setStored(STORAGE_KEYS.AI_SESSIONS, sessions),

  // AI Skills
  getAISkills: (): AISkill[] => {
    const stored = getStored<AISkill[]>(STORAGE_KEYS.AI_SKILLS, BUILTIN_SKILLS);
    const builtinMap = new Map(BUILTIN_SKILLS.map(s => [s.id, s]));
    const merged = stored.map(s => {
      if (builtinMap.has(s.id)) {
        return { ...s, ...builtinMap.get(s.id)! };
      }
      return s;
    });
    // Ensure all builtin skills are present
    for (const b of BUILTIN_SKILLS) {
      if (!merged.some(m => m.id === b.id)) {
        merged.push(b);
      }
    }
    return merged;
  },
  saveAISkills: (skills: AISkill[]) => setStored(STORAGE_KEYS.AI_SKILLS, skills),

  // AI Images
  getAIImages: (): AIImageGeneration[] => getStored(STORAGE_KEYS.AI_IMAGES, []),
  saveAIImages: (images: AIImageGeneration[]) => setStored(STORAGE_KEYS.AI_IMAGES, images),

  // Settings
  getSettings: (): AppSettings => getStored(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  saveSettings: (settings: AppSettings) => setStored(STORAGE_KEYS.SETTINGS, settings),

  // Full Export
  exportFullBackup: (): FullAppBackup => {
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
      return true;
    } catch (err) {
      console.error('Backup import error:', err);
      return false;
    }
  },

  // Reset all data
  clearAllData: () => {
    localStorage.clear();
  }
};
