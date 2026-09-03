import { GoogleWarmingAccount, GoogleWarmingBackupData, AIProvider } from '../types';

export interface WarmingDayTask {
  day: number;
  title: string;
  description: string;
  actions: Array<{ key: string; text: string }>;
}

export const GOOGLE_WARMING_SCHEDULE: Record<number, WarmingDayTask> = {
  1: {
    day: 1,
    title: '第 1 天：安全初登与收件箱激活',
    description: '在新设备或独立指纹环境中完成首次安全登录，建立最基础的环境信誉。',
    actions: [
      { key: 'act_1_1', text: '在新设备或独立指纹浏览器中完成首次安全登录' },
      { key: 'act_1_2', text: '进入 Gmail 收件箱，浏览点击 2~3 封初始未读邮件' },
    ],
  },
  2: {
    day: 2,
    title: '第 2 天：设备巡检与多媒体浏览',
    description: '确认安全中心设备列表，并开始在 YouTube 上产生自然的行为指纹与关联平台注册。',
    actions: [
      { key: 'act_2_1', text: '进入谷歌安全中心，查看并登出所有不认识的陌生设备' },
      { key: 'act_2_2', text: '打开 Gmail 浏览收件箱垃圾邮件和收信' },
      { key: 'act_2_3', text: '打开 YouTube 浏览或随机播放视频 10~15 分钟' },
      { key: 'act_2_4', text: '使用当前谷歌账号一键注册并登录 Spotify 音乐平台' },
    ],
  },
  3: {
    day: 3,
    title: '第 3 天：辅助安全配置与 AI 对话互动',
    description: '设置辅助恢复邮箱并体验 Gemini AI 对话，提升账号的真人权重。',
    actions: [
      { key: 'act_3_1', text: '设置并绑定辅助邮箱（恢复邮箱）以增强信誉' },
      { key: 'act_3_2', text: '正常收发几封 Gmail 邮件并归档' },
      { key: 'act_3_3', text: '在 YouTube 观看视频并随机点击喜欢或订阅频道' },
      { key: 'act_3_4', text: '打开 Gemini AI，发送 2~3 句话进行 AI 对话互动' },
      { key: 'act_3_5', text: '使用当前谷歌账号一键授权登录 Twitter (X) 社交平台' },
    ],
  },
  4: {
    day: 4,
    title: '第 4 天：2FA 双重验证与社交矩阵',
    description: '完善两步验证，并进一步拓展三方权重平台绑定。',
    actions: [
      { key: 'act_4_1', text: '管理两步验证 (2FA) 或其他安全辅助设置' },
      { key: 'act_4_2', text: '阅读 Gmail 邮件，清理垃圾邮件分类' },
      { key: 'act_4_3', text: '打开 YouTube 观看视频，搜索感兴趣的内容' },
      { key: 'act_4_4', text: '用 Gemini AI 随机生成一段关于学习路线的文本' },
      { key: 'act_4_5', text: '使用当前谷歌账号一键注册并登录 TikTok 视频平台' },
    ],
  },
  5: {
    day: 5,
    title: '第 5 天：密保手机绑定与生产力工具',
    description: '建议配置密保手机防风控，并联动生产力平台建立真人画像。',
    actions: [
      { key: 'act_5_1', text: '绑定密保手机号（建议长期养号使用以防异常风控）' },
      { key: 'act_5_2', text: '正常浏览接收邮件，向外部发送一封常规邮件' },
      { key: 'act_5_3', text: '观看 YouTube 视频，建立正常的视频推流推荐模型' },
      { key: 'act_5_4', text: '向 Gemini AI 提问一些日常开发或工作问题' },
      { key: 'act_5_5', text: '使用当前谷歌账号一键注册并登录 Notion 笔记知识库' },
    ],
  },
  6: {
    day: 6,
    title: '第 6 天：自然搜索与设计平台联动',
    description: '进行自然网页搜索与主流设计平台的一键授权。',
    actions: [
      { key: 'act_6_1', text: '进入 Gmail 正常浏览邮件，收发几封日常邮件' },
      { key: 'act_6_2', text: '打开 YouTube 浏览并随机点赞/评论几个视频' },
      { key: 'act_6_3', text: '在 Google 搜索引擎中进行少量网页搜索与浏览' },
      { key: 'act_6_4', text: '使用当前谷歌账号一键注册并登录 Canva 设计工具平台' },
    ],
  },
  7: {
    day: 7,
    title: '第 7 天：安全改密与地区锁定',
    description: '养号半程节点：建议更新登录密码并锁定归属地区。',
    actions: [
      { key: 'act_7_1', text: '安全更改谷歌账户的登录密码，记录最新密码' },
      { key: 'act_7_2', text: '浏览收发 Gmail，整理垃圾邮件' },
      { key: 'act_7_3', text: 'YouTube 观看并对优质内容进行评论互动' },
      { key: 'act_7_4', text: '使用 Gemini AI 翻译一小段英文文章' },
      { key: 'act_7_5', text: '使用当前谷歌账号一键注册并登录 Figma 设计平台' },
      { key: 'act_7_6', text: '检查谷歌账号真实地区，并在系统中更新账号归属国家' },
    ],
  },
  8: {
    day: 8,
    title: '第 8 天：长视频观看与团队协作工具',
    description: '模拟高时长观看习惯并拓展协作平台。',
    actions: [
      { key: 'act_8_1', text: '进入 Gmail，阅读最新收件，回复 1 封常规邮件' },
      { key: 'act_8_2', text: '打开 YouTube 累计观看至少 10~15 分钟视频' },
      { key: 'act_8_3', text: '访问 Gemini AI 体验聊天互动' },
      { key: 'act_8_4', text: '使用当前谷歌账号一键注册并登录 Miro 协作白板平台' },
    ],
  },
  9: {
    day: 9,
    title: '第 9 天：内容创作与画板草图',
    description: '在已授权的三方平台产生实际内容数据。',
    actions: [
      { key: 'act_9_1', text: '进入 Gmail 处理信件，清扫不需要的推广邮件' },
      { key: 'act_9_2', text: '打开 YouTube 观看视频点赞并订阅 1 个博主' },
      { key: 'act_9_3', text: '访问 Gemini AI 进行一些技术问题问答交流' },
      { key: 'act_9_4', text: '使用当前谷歌账号在 Miro 中创建新画板并绘制基础图形' },
    ],
  },
  10: {
    day: 10,
    title: '第 10 天：长期画像建立与团队协同',
    description: '强化账号的企业级协作特征。',
    actions: [
      { key: 'act_10_1', text: '进入 Gmail，阅读最新收件，回复 1 封常规邮件' },
      { key: 'act_10_2', text: '打开 YouTube 累计观看至少 10~15 分钟视频' },
      { key: 'act_10_3', text: '访问 Gemini AI 体验聊天互动' },
      { key: 'act_10_4', text: '使用当前谷歌账号一键注册并登录 Slack 团队协同平台' },
    ],
  },
  11: {
    day: 11,
    title: '第 11 天：外部通信与顶尖 AI 平台',
    description: '向陌生域发送邮件并授权登录主流 AI 产品。',
    actions: [
      { key: 'act_11_1', text: '进入 Gmail 处理信件，与陌生邮箱做一次日常通信' },
      { key: 'act_11_2', text: '打开 YouTube 累计观看至少 10~15 分钟视频' },
      { key: 'act_11_3', text: '访问 Gemini AI 体验聊天互动' },
      { key: 'act_11_4', text: '使用当前谷歌账号一键注册并登录 ChatGPT 开启对话' },
    ],
  },
  12: {
    day: 12,
    title: '第 12 天：极客开发者平台绑定',
    description: '绑定全球最大开发者社区，权重极大提升。',
    actions: [
      { key: 'act_12_1', text: '进入 Gmail，阅读最新收件，回复 1 封常规邮件' },
      { key: 'act_12_2', text: '打开 YouTube 累计观看至少 10~15 分钟视频' },
      { key: 'act_12_3', text: '访问 Gemini AI 体验聊天互动' },
      { key: 'act_12_4', text: '使用当前谷歌账号一键注册并登录 GitHub 开发者托管平台' },
    ],
  },
  13: {
    day: 13,
    title: '第 13 天：云端代码运行环境与终极自测',
    description: '进行深层环境认证与备用邮箱交叉验证。',
    actions: [
      { key: 'act_13_1', text: '进入 Gmail，给自己的备用邮箱发送一封日常日志' },
      { key: 'act_13_2', text: '打开 YouTube 累计观看至少 10~15 分钟视频' },
      { key: 'act_13_3', text: '访问 Gemini AI 体验聊天互动' },
      { key: 'act_13_4', text: '使用当前谷歌账号一键注册并登录 Replit 云端开发环境' },
    ],
  },
  14: {
    day: 14,
    title: '第 14 天：圆满出师！晋升成熟权重老号',
    description: '完成最后一项全球主流论坛绑定，14 天养号全周期圆满达成！',
    actions: [
      { key: 'act_14_1', text: '进入 Gmail，阅读最新收件并归档全部通知' },
      { key: 'act_14_2', text: '打开 YouTube 累计观看至少 10~15 分钟视频' },
      { key: 'act_14_3', text: '访问 Gemini AI 体验聊天互动' },
      { key: 'act_14_4', text: '使用当前谷歌账号一键注册并登录 Reddit 社区交流论坛' },
    ],
  },
};

// ---------------------------------------------------------------
// Delimiter-based parsing for multi-line text (Compatible with 3D Learning Platform)
// Format: email----password----recoveryEmail----twoFASecret----country----backupCodes----category----note
// ---------------------------------------------------------------
export function parseGoogleAccountsText(
  text: string,
  defaultCategory: string = '未分类'
): Partial<GoogleWarmingAccount>[] {
  if (!text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const delimiters = ['----', '|', '\t', ',', ';'];
  let bestDelimiter = '----';
  let maxParts = 0;

  // Auto-detect best delimiter from first few lines
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    for (const d of delimiters) {
      const count = lines[i].split(d).length;
      if (count > maxParts) {
        maxParts = count;
        bestDelimiter = d;
      }
    }
  }

  const results: Partial<GoogleWarmingAccount>[] = [];

  for (const line of lines) {
    const parts = line.split(bestDelimiter).map(p => p.trim());
    if (parts.length < 1 || !parts[0].includes('@')) continue;

    const email = parts[0] || '';
    const password = parts[1] || '';
    const recoveryEmail = parts[2] || '';
    const twoFASecret = parts[3] || '';
    const country = parts[4] || '';
    let backupCodes = '';
    let parsedCat = defaultCategory !== '未分类' ? defaultCategory : '未分类';
    let note = '';

    if (parts.length >= 8) {
      backupCodes = parts[5] || '';
      parsedCat = parts[6] || defaultCategory;
      note = parts[7] || '';
    } else if (parts.length === 7) {
      backupCodes = parts[5] || '';
      note = parts[6] || '';
    } else if (parts.length === 6) {
      note = parts[5] || '';
    }

    results.push({
      id: 'gw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      email,
      password,
      recoveryEmail,
      twoFASecret,
      country: translateCountryName(country),
      backupCodes,
      category: parsedCat || '未分类',
      note,
      status: 'warming',
      currentDay: 1,
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}

// Country normalization helper (translates "US" -> "美国", "HK" -> "中国香港", etc.)
export function translateCountryName(country?: string): string {
  if (!country) return '';
  const c = country.trim().toUpperCase();
  const map: Record<string, string> = {
    US: '美国',
    USA: '美国',
    'UNITED STATES': '美国',
    HK: '中国香港',
    'HONG KONG': '中国香港',
    TW: '中国台湾',
    TAIWAN: '中国台湾',
    JP: '日本',
    JAPAN: '日本',
    SG: '新加坡',
    SINGAPORE: '新加坡',
    UK: '英国',
    GB: '英国',
    'UNITED KINGDOM': '英国',
    CA: '加拿大',
    CANADA: '加拿大',
    AU: '澳大利亚',
    AUSTRALIA: '澳大利亚',
    DE: '德国',
    GERMANY: '德国',
    FR: '法国',
    FRANCE: '法国',
    KR: '韩国',
    KOREA: '韩国',
    MY: '马来西亚',
    MALAYSIA: '马来西亚',
    TH: '泰国',
    THAILAND: '泰国',
    PH: '菲律宾',
    PHILIPPINES: '菲律宾',
    IN: '印度',
    INDIA: '印度',
  };
  return map[c] || country;
}

// ---------------------------------------------------------------
// AI-assisted parsing (Call active LLM or heuristic regex)
// ---------------------------------------------------------------
export async function aiParseGoogleAccounts({
  text,
  provider,
  defaultCategory = '未分类',
}: {
  text: string;
  provider?: AIProvider;
  defaultCategory?: string;
}): Promise<Partial<GoogleWarmingAccount>[]> {
  if (!text.trim()) return [];

  if (provider && provider.apiKey) {
    try {
      const systemPrompt = `You are a professional Google account data parsing assistant.
Extract all Google accounts from the unstructured or semi-structured text.
For each account, extract:
- email: Google email address (required)
- password: password
- recoveryEmail: recovery email address
- twoFASecret: 2FA secret key (Base32 format)
- country: Translate country name into Chinese (e.g. US -> 美国, HK -> 中国香港, JP -> 日本)
- backupCodes: 8-digit backup codes (space-separated)
- category: group/category label
- note: extra notes or tags

Return ONLY a valid JSON array of objects without markdown fences:
[
  {
    "email": "...",
    "password": "...",
    "recoveryEmail": "...",
    "twoFASecret": "...",
    "country": "...",
    "backupCodes": "...",
    "category": "...",
    "note": "..."
  }
]`;

      const payload = {
        model: provider.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
      };

      const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch('/api/ai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: payload,
          }),
        });
      }

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content || '';
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return parsed.map((item: any) => ({
            id: 'gw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            email: item.email || '',
            password: item.password || '',
            recoveryEmail: item.recoveryEmail || '',
            twoFASecret: item.twoFASecret || '',
            country: translateCountryName(item.country),
            backupCodes: item.backupCodes || '',
            category: item.category || defaultCategory,
            note: item.note || '',
            status: 'warming' as const,
            currentDay: 1,
            createdAt: new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      console.warn('AI Google Account parsing failed, falling back to standard parsing:', e);
    }
  }

  // Fallback to standard parsing
  return parseGoogleAccountsText(text, defaultCategory);
}

// ---------------------------------------------------------------
// JSON Backup Export & Import (100% Compatible with 3D Learning Platform)
// ---------------------------------------------------------------
export function exportGoogleAccountsToJSON(accounts: GoogleWarmingAccount[]): string {
  const payload: GoogleWarmingBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    total: accounts.length,
    accounts: accounts.map(acc => ({
      id: acc.id,
      email: acc.email,
      password: acc.password || '',
      recoveryEmail: acc.recoveryEmail || '',
      twoFASecret: acc.twoFASecret || '',
      country: acc.country || '',
      note: acc.note || '',
      backupCodes: acc.backupCodes || '',
      category: acc.category || '未分类',
      status: acc.status || 'warming',
      currentDay: acc.currentDay || 1,
      lastWarmedAt: acc.lastWarmedAt || '',
      createdAt: acc.createdAt || new Date().toISOString(),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function importGoogleAccountsFromJSON(
  jsonText: string,
  existingAccounts: GoogleWarmingAccount[]
): {
  importedCount: number;
  skippedCount: number;
  updatedAccounts: GoogleWarmingAccount[];
} {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err: any) {
    throw new Error('无效的 JSON 文件格式');
  }

  // Accept { version: 1, accounts: [...] } OR [ {...}, ... ]
  const rawList: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.accounts)
    ? parsed.accounts
    : [];

  if (rawList.length === 0) {
    throw new Error('未在备份文件中找到有效的账号数据');
  }

  const existingEmailSet = new Set(existingAccounts.map(a => a.email.toLowerCase().trim()));
  const newAccounts: GoogleWarmingAccount[] = [];
  let skipped = 0;

  for (const item of rawList) {
    if (!item.email || typeof item.email !== 'string') {
      skipped++;
      continue;
    }
    const cleanEmail = item.email.trim();
    if (existingEmailSet.has(cleanEmail.toLowerCase())) {
      skipped++;
      continue;
    }

    existingEmailSet.add(cleanEmail.toLowerCase());
    newAccounts.push({
      id: item.id || 'gw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      email: cleanEmail,
      password: item.password || '',
      recoveryEmail: item.recoveryEmail || '',
      twoFASecret: item.twoFASecret || '',
      country: translateCountryName(item.country),
      backupCodes: item.backupCodes || '',
      category: item.category || '未分类',
      status: item.status && ['warming', 'completed', 'paused'].includes(item.status) ? item.status : 'warming',
      currentDay: typeof item.currentDay === 'number' && item.currentDay >= 1 && item.currentDay <= 14 ? item.currentDay : 1,
      lastWarmedAt: item.lastWarmedAt || undefined,
      createdAt: item.createdAt || new Date().toISOString(),
    });
  }

  const updated = [...newAccounts, ...existingAccounts];
  return {
    importedCount: newAccounts.length,
    skippedCount: skipped,
    updatedAccounts: updated,
  };
}
