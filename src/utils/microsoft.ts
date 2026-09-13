// Microsoft Hotmail / Outlook Hub Engine for 【猫步可爱】
import { HotmailAccount, EmailMessage } from '../types';

export function parseHotmailLine(line: string): Omit<HotmailAccount, 'id' | 'messages' | 'status'> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // Delimiters: ----, ---, \t, |, ,
  let parts: string[] = [];
  if (trimmed.includes('----')) {
    parts = trimmed.split('----');
  } else if (trimmed.includes('---')) {
    parts = trimmed.split('---');
  } else if (trimmed.includes('\t')) {
    parts = trimmed.split('\t');
  } else if (trimmed.includes('|')) {
    parts = trimmed.split('|');
  } else if (trimmed.includes(',')) {
    parts = trimmed.split(',');
  }

  if (parts.length >= 4) {
    return {
      email: parts[0].trim(),
      password: parts[1].trim(),
      clientId: parts[2].trim(),
      refreshToken: parts.slice(3).join('----').trim(), // in case token contains separator
    };
  } else if (parts.length === 3) {
    return {
      email: parts[0].trim(),
      password: parts[1].trim(),
      clientId: '',
      refreshToken: parts[2].trim(),
    };
  }
  return null;
}

export function parseBatchHotmailAccounts(rawText: string): HotmailAccount[] {
  const lines = rawText.split('\n');
  const accounts: HotmailAccount[] = [];

  for (const line of lines) {
    const parsed = parseHotmailLine(line);
    if (parsed && parsed.email) {
      accounts.push({
        id: 'ms_' + Math.random().toString(36).substring(2, 9),
        email: parsed.email,
        password: parsed.password,
        clientId: parsed.clientId || '9e5f94bc-e8a4-4e73-b8be-63364c29d753', // standard default client id
        refreshToken: parsed.refreshToken,
        status: 'idle',
        messages: [],
      });
    }
  }
  return accounts;
}

export function exportHotmailAccountsToText(accounts: HotmailAccount[]): string {
  return accounts
    .map(acc => `${acc.email}----${acc.password}----${acc.clientId}----${acc.refreshToken}`)
    .join('\n');
}

// Extract 4-8 digit SMS / Verification codes from subject and content
export function extractVerificationCode(subject: string, bodyText: string): string | undefined {
  const combined = `${subject} \n ${bodyText}`;

  // Priority 1: explicitly labeled codes
  const labeledRegex = /(?:验证码|动态码|安全码|PIN码|授权码|登录代码|临时代码|PIN|code|verification\s*code|security\s*code|one-time\s*code|login\s*code)[^\d]{0,12}([0-9]{4,8})\b/i;
  const labeledMatch = combined.match(labeledRegex);
  if (labeledMatch && labeledMatch[1]) {
    return labeledMatch[1];
  }

  // Priority 2: "is 123456" / "为 123456" / "以继续：\n\n123456"
  const isRegex = /(?:是|为|is|is:|以继续[：:]?\s*)\s*([0-9]{4,8})\b/i;
  const isMatch = combined.match(isRegex);
  if (isMatch && isMatch[1]) {
    return isMatch[1];
  }

  // Priority 3: any isolated 4-8 digit number that looks like a token
  const standaloneRegex = /\b([0-9]{4,8})\b/g;
  const matches = [...combined.matchAll(standaloneRegex)];
  for (const m of matches) {
    const val = m[1];
    // Skip likely years like 2024, 2025, 2026
    if (val.length === 4 && (val.startsWith('19') || val.startsWith('20'))) continue;
    return val;
  }

  return undefined;
}

// Parse and translate Microsoft error descriptions into user-friendly Chinese messages
export function formatMicrosoftErrorMessage(rawError: string): string {
  if (!rawError) return '微软服务请求异常';

  const lower = rawError.toLowerCase();

  // 1. Account security lock / compromised
  if (lower.includes('compromised') || lower.includes('account security interrupt') || lower.includes('collecting proof')) {
    return '微软风控锁定：该账号已被微软系统判定异常活动(Compromised)，需前往微软官网登录完成安全人机验证';
  }

  // 2. Account disabled or locked by too many attempts
  if (rawError.includes('AADSTS50053')) {
    return '错误密码尝试次数过多，该微软账号已被临时锁定';
  }
  if (rawError.includes('AADSTS50057')) {
    return '该微软账号已被禁用或处于挂起状态';
  }

  // 3. Credentials reset / Password changed
  if (rawError.includes('AADSTS50173') || lower.includes('password has been changed') || lower.includes('recent password change')) {
    return '账号密码近期已修改，原有刷新令牌全部作废，请重新登录获取';
  }

  // 4. MFA required
  if (rawError.includes('AADSTS50076') || rawError.includes('AADSTS50079') || lower.includes('multi-factor authentication')) {
    return '账号需要二次多因素安全验证(MFA)，请在微软官网完成验证';
  }

  // 5. Conditional access block
  if (rawError.includes('AADSTS53003')) {
    return '已被微软条件访问策略拦截，请更换网络 IP 节点';
  }

  // 6. Token expired
  if (rawError.includes('AADSTS700082') || lower.includes('has expired')) {
    return '刷新令牌已自然过期（超过最长有效生命周期），需重新获取并导入';
  }

  // 7. General invalid token
  if (rawError.includes('AADSTS70000') || rawError.includes('invalid_grant')) {
    return '刷新令牌(RefreshToken)无效或已被撤回，请重新获取并导入';
  }

  if (rawError.includes('invalid_client') || rawError.includes('AADSTS700016')) {
    return '应用客户端标识(Client ID)无效或应用不存在';
  }

  if (rawError.includes('Failed to fetch') || rawError.includes('NetworkError') || rawError.includes('net::ERR_')) {
    return '网络无法直连微软认证服务器，请检查网络连接或科学代理设置';
  }

  if (rawError.includes('HTML') || rawError.includes('<!DOCTYPE') || rawError.includes('<!doctype') || rawError.includes('<html')) {
    return '接口返回了网页内容而非认证数据，可能受网络代理拦截或路由回退';
  }

  return rawError;
}

export interface SafeJsonResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  isHtml?: boolean;
}

// Safely parse JSON responses, strictly intercepting HTML (SPA fallbacks / error pages)
export async function safeParseJsonResponse<T = any>(res: Response): Promise<SafeJsonResult<T>> {
  try {
    const text = await res.text();
    const trimmed = text.trim();
    if (
      trimmed.startsWith('<') ||
      trimmed.includes('<!DOCTYPE') ||
      trimmed.includes('<!doctype') ||
      trimmed.toLowerCase().includes('<html')
    ) {
      return {
        ok: false,
        isHtml: true,
        error: `服务端返回了网页(HTML)而非数据 (HTTP ${res.status})`,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return {
        ok: false,
        error: `响应非有效 JSON 格式: ${trimmed.slice(0, 100)}`,
      };
    }

    if (!res.ok) {
      const rawDesc = parsed.error_description || parsed.error?.message || parsed.error || `HTTP ${res.status}`;
      return {
        ok: false,
        data: parsed,
        error: formatMicrosoftErrorMessage(rawDesc),
      };
    }

    return {
      ok: true,
      data: parsed as T,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: `读取响应内容失败: ${err.message || String(err)}`,
    };
  }
}

// Refresh Microsoft OAuth Access Token
export async function refreshMicrosoftToken(account: HotmailAccount): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams();
  params.append('client_id', account.clientId || '9e5f94bc-e8a4-4e73-b8be-63364c29d753');
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', account.refreshToken);

  // Multi-tier endpoints:
  // 1. Consumers endpoint: best for personal @hotmail.com / @outlook.com / @live.com accounts
  // 2. Common endpoint: standard universal endpoint
  // 3. Local proxy endpoint: fallback for dev/desktop proxy
  const endpoints = [
    'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    '/api/ms-oauth/token',
  ];

  let bestErrorMessage = '';
  let tokenData: any = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const parsed = await safeParseJsonResponse<{
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      }>(res);

      if (parsed.ok && parsed.data?.access_token) {
        tokenData = parsed.data;
        break;
      }

      if (parsed.error && !parsed.isHtml) {
        // Prefer specific business errors (like invalid_grant) over HTML proxy errors
        bestErrorMessage = parsed.error;
      } else if (!bestErrorMessage && parsed.error) {
        bestErrorMessage = parsed.error;
      }
    } catch (e: any) {
      const friendly = formatMicrosoftErrorMessage(e.message || String(e));
      if (!bestErrorMessage) bestErrorMessage = friendly;
    }
  }

  if (!tokenData?.access_token) {
    throw new Error(bestErrorMessage || '刷新微软令牌失败，请检查 RefreshToken 是否有效');
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || account.refreshToken,
    expiresIn: tokenData.expires_in || 3600,
  };
}

// Fetch messages from specific folder (inbox or junkemail)
export async function fetchFolderMessages(
  accessToken: string,
  folder: 'inbox' | 'junkemail' = 'inbox'
): Promise<EmailMessage[]> {
  const folderPath = folder === 'junkemail' ? 'junkemail' : 'inbox';
  let rawList: any[] = [];
  let fetchSucceeded = false;
  let lastError = '';

  // 1. Microsoft Graph API (v1.0) - modern standard recommended by Microsoft
  const graphEndpoints = [
    `https://graph.microsoft.com/v1.0/me/mailFolders/${folderPath}/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
    `https://graph.microsoft.com/v1.0/me/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
    `/api/ms-graph/me/mailFolders/${folderPath}/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
    `/api/ms-graph/me/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
  ];

  for (const endpoint of graphEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      const parsed = await safeParseJsonResponse<any>(res);
      if (parsed.ok && parsed.data && Array.isArray(parsed.data.value)) {
        rawList = parsed.data.value;
        fetchSucceeded = true;
        break;
      } else if (parsed.error && !parsed.isHtml) {
        lastError = parsed.error;
      }
    } catch (e: any) {
      lastError = formatMicrosoftErrorMessage(e.message || String(e));
    }
  }

  // 2. Outlook REST API (v2.0) - legacy fallback
  if (!fetchSucceeded) {
    const outlookEndpoints = [
      `https://outlook.office.com/api/v2.0/me/mailFolders/${folderPath}/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`,
      `https://outlook.office.com/api/v2.0/me/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`,
      `/api/ms-outlook/me/mailFolders/${folderPath}/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`,
      `/api/ms-outlook/me/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`,
    ];

    for (const endpoint of outlookEndpoints) {
      try {
        const res = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        const parsed = await safeParseJsonResponse<any>(res);
        if (parsed.ok && parsed.data && Array.isArray(parsed.data.value)) {
          rawList = parsed.data.value;
          fetchSucceeded = true;
          break;
        } else if (parsed.error && !parsed.isHtml) {
          lastError = parsed.error;
        }
      } catch (e: any) {
        lastError = formatMicrosoftErrorMessage(e.message || String(e));
      }
    }
  }

  if (!fetchSucceeded && rawList.length === 0 && lastError) {
    throw new Error(`获取${folder === 'junkemail' ? '垃圾邮件箱' : '收件箱'}失败: ${lastError}`);
  }

  return rawList.map((msg: any) => {
    const subject = msg.Subject || msg.subject || '(无主题)';
    const preview = msg.BodyPreview || msg.bodyPreview || '';
    const bodyObj = msg.Body || msg.body || {};
    const bodyContent = bodyObj.Content || bodyObj.content || '';
    const contentType = bodyObj.ContentType || bodyObj.contentType || 'Text';
    const isHtml = String(contentType).toLowerCase() === 'html';
    
    // Extract verification code
    const code = extractVerificationCode(subject, preview + '\n' + bodyContent);

    const fromObj = msg.From || msg.from;
    const emailAddressObj = fromObj?.EmailAddress || fromObj?.emailAddress;
    const fromAddress = emailAddressObj?.Address || emailAddressObj?.address || 'noreply@service';
    const fromName = emailAddressObj?.Name || emailAddressObj?.name || fromAddress;

    return {
      id: msg.Id || msg.id || 'msg_' + Math.random().toString(36).substring(2, 9),
      subject,
      from: fromAddress,
      fromName: fromName,
      receivedDateTime: msg.ReceivedDateTime || msg.receivedDateTime || new Date().toISOString(),
      bodyPreview: preview || (bodyContent ? bodyContent.replace(/<[^>]+>/g, '').slice(0, 150) : ''),
      bodyHtml: isHtml ? bodyContent : undefined,
      bodyText: isHtml ? undefined : bodyContent,
      extractedCode: code,
      folder,
    };
  });
}

// Fetch Messages from Microsoft API (supports inbox, junkemail, or parallel all)
export async function fetchInboxMessages(
  accessToken: string,
  folder: 'inbox' | 'junkemail' | 'all' = 'all'
): Promise<EmailMessage[]> {
  if (folder === 'all') {
    // Fetch both inbox and junkemail in parallel!
    const results = await Promise.allSettled([
      fetchFolderMessages(accessToken, 'inbox'),
      fetchFolderMessages(accessToken, 'junkemail'),
    ]);

    const allMsgs: EmailMessage[] = [];
    const seenIds = new Set<string>();

    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const msg of r.value) {
          if (!seenIds.has(msg.id)) {
            seenIds.add(msg.id);
            allMsgs.push(msg);
          }
        }
      }
    }

    return allMsgs.sort(
      (a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
    );
  }

  return fetchFolderMessages(accessToken, folder);
}

// Ensure account has a valid, non-expired accessToken. Auto-refreshes if needed.
export async function ensureValidAccessToken(account: HotmailAccount): Promise<{
  accessToken: string;
  account: HotmailAccount;
  refreshed: boolean;
}> {
  const bufferMs = 60 * 1000; // 1 minute safety buffer
  const isExpired = !account.accessToken || !account.tokenExpiresAt || (Date.now() + bufferMs >= account.tokenExpiresAt);

  if (!isExpired && account.accessToken) {
    return {
      accessToken: account.accessToken,
      account,
      refreshed: false,
    };
  }

  const res = await refreshMicrosoftToken(account);
  const tokenExpiresAt = Date.now() + Math.max(300, (res.expiresIn - 60)) * 1000;

  const updatedAccount: HotmailAccount = {
    ...account,
    accessToken: res.accessToken,
    refreshToken: res.refreshToken || account.refreshToken,
    tokenExpiresAt,
    status: 'valid',
    lastCheckedAt: new Date().toISOString(),
    lastErrorMessage: undefined,
  };

  return {
    accessToken: res.accessToken,
    account: updatedAccount,
    refreshed: true,
  };
}

// Send an Email via Microsoft API with full proxy and direct fallbacks
export async function sendMicrosoftEmail(
  accessToken: string,
  toEmail: string,
  subject: string,
  content: string
): Promise<void> {
  const payload = {
    message: {
      subject,
      body: {
        contentType: 'Text',
        content,
      },
      toRecipients: [
        {
          emailAddress: {
            address: toEmail,
          },
        },
      ],
    },
    saveToSentItems: 'true',
  };

  const endpoints = [
    // 1. Microsoft Graph API direct (Modern standard)
    'https://graph.microsoft.com/v1.0/me/sendMail',
    // 2. Microsoft Graph API via proxy
    '/api/ms-graph/me/sendMail',
    // 3. Outlook REST API direct (Legacy fallback)
    'https://outlook.office.com/api/v2.0/me/sendmail',
    // 4. Outlook REST API via proxy
    '/api/ms-outlook/me/sendmail',
  ];

  let lastError = '';
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok || res.status === 202) {
        return;
      }
      const parsed = await safeParseJsonResponse(res);
      if (parsed.error && !parsed.isHtml) {
        lastError = parsed.error;
      } else if (!lastError && parsed.error) {
        lastError = parsed.error;
      }
    } catch (e: any) {
      lastError = formatMicrosoftErrorMessage(e.message || String(e));
    }
  }

  throw new Error(`发送邮件失败: ${lastError || '所有发信端点均无法连接'}`);
}

