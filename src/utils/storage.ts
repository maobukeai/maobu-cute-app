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

// Initial Seed Data - Pure Software Onboarding & Usage Guide (Zero Dummy Presets)
const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'p_readme',
    title: '🐱【猫步可爱】全能个人助理使用说明',
    description: '欢迎使用猫步可爱！本条目为软件内置功能使用指南。你可以点击勾选子步骤体验进度，也可以随时编辑或点击垃圾桶删除。',
    priority: 'high',
    category: 'life',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    isCompleted: false,
    subtasks: [
      { id: 'st_guide_1', title: '1. 点击上方「✨ AI 规划」：让真实大模型为你深度推导并拆解行动目标', isDone: false },
      { id: 'st_guide_2', title: '2. 切换到「笔记」：体验高品质 Markdown 排版与 AI 实时干活动态流', isDone: false },
      { id: 'st_guide_3', title: '3. 体验「安全箱」：本地加密密码管理与 30 秒倒计时 2FA 动态令牌', isDone: false },
      { id: 'st_guide_4', title: '4. 探索「AI 伴侣」：在「模型配置」中管理端点密钥，或在「技能市场」安装插件', isDone: false },
    ],
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
];

const DEFAULT_TWO_FACTOR: TwoFactorToken[] = [];

const DEFAULT_HOTMAIL: HotmailAccount[] = [];

const DEFAULT_GOOGLE_ACCOUNTS: GoogleWarmingAccount[] = [];

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
  getPlans: (): PlanItem[] => {
    const stored = getStored<PlanItem[]>(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
    // Remove legacy dummy presets ("给猫咪梳毛", "整理常用重要密码", etc.) per user directive
    const hasOldDummy = stored.some(
      p => p.id === 'p_2' || p.id === 'p_3' || p.title.includes('给猫咪梳毛') || p.title.includes('整理常用重要密码') || p.id === 'p_1'
    );
    if (hasOldDummy) {
      const filtered = stored.filter(
        p => !p.title.includes('给猫咪梳毛') && !p.title.includes('整理常用重要密码') && p.id !== 'p_1'
      );
      const hasReadme = filtered.some(p => p.id === 'p_readme');
      const finalPlans = hasReadme ? filtered : [DEFAULT_PLANS[0], ...filtered];
      setStored(STORAGE_KEYS.PLANS, finalPlans);
      return finalPlans;
    }
    if (!stored.some(p => p.id === 'p_readme')) {
      const withReadme = [DEFAULT_PLANS[0], ...stored];
      setStored(STORAGE_KEYS.PLANS, withReadme);
      return withReadme;
    }
    return stored;
  },
  savePlans: (plans: PlanItem[]) => setStored(STORAGE_KEYS.PLANS, plans),

  // Notes
  getNotes: (): NoteItem[] => {
    const stored = getStored<NoteItem[]>(STORAGE_KEYS.NOTES, DEFAULT_NOTES);
    const hasOldDummy = stored.some(
      n => n.id === 'n_2' || n.title.includes('常用大模型 Prompt 技巧与 Skill 设定')
    );
    if (hasOldDummy) {
      const filtered = stored.filter(
        n => n.id !== 'n_2' && !n.title.includes('常用大模型 Prompt 技巧与 Skill 设定')
      );
      const finalNotes = filtered.length > 0 ? filtered : DEFAULT_NOTES;
      setStored(STORAGE_KEYS.NOTES, finalNotes);
      return finalNotes;
    }
    return stored;
  },
  saveNotes: (notes: NoteItem[]) => setStored(STORAGE_KEYS.NOTES, notes),

  // Passwords
  getPasswords: (): PasswordItem[] => getStored(STORAGE_KEYS.PASSWORDS, []),
  savePasswords: (passwords: PasswordItem[]) => setStored(STORAGE_KEYS.PASSWORDS, passwords),

  // 2FA
  get2FATokens: (): TwoFactorToken[] => getStored(STORAGE_KEYS.TWO_FACTOR, DEFAULT_TWO_FACTOR),
  save2FATokens: (tokens: TwoFactorToken[]) => setStored(STORAGE_KEYS.TWO_FACTOR, tokens),

  // Hotmail Accounts
  getHotmailAccounts: (): HotmailAccount[] => {
    const raw = getStored<HotmailAccount[]>(STORAGE_KEYS.HOTMAIL, DEFAULT_HOTMAIL);
    let hasDirty = false;
    const sanitized = raw.map(acc => {
      const filtered = (acc.messages || []).filter(
        m => m.id !== 'msg_demo_1' && m.id !== 'msg_demo_2' && !m.subject.includes('Discord 动态验证口令') && !m.subject.includes('【安全通知】您的登录验证码是 849201')
      );
      if (filtered.length !== (acc.messages || []).length) {
        hasDirty = true;
        return { ...acc, messages: filtered };
      }
      return acc;
    });
    if (hasDirty) {
      setStored(STORAGE_KEYS.HOTMAIL, sanitized);
    }
    return sanitized;
  },
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
