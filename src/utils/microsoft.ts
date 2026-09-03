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
  // CRITICAL FIX: DO NOT append hardcoded scope!
  // In OAuth2 standard RFC 6749 Section 6, omitting the scope parameter automatically
  // inherits the scopes originally granted to this refresh token.
  // Passing an arbitrary/unconsented scope causes Azure AD to fail with:
  // "AADSTS70000: The request was denied because one or more scopes requested are unauthorized or invalid."

  let response: Response | null = null;
  let lastErrorText = '';

  // 1. Try local dev proxy /api/ms-oauth/token
  try {
    const res = await fetch('/api/ms-oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (res.ok) {
      response = res;
    } else {
      const errJson = await res.json().catch(() => ({}));
      lastErrorText = errJson.error_description || errJson.error || `Proxy error (${res.status})`;
    }
  } catch (e: any) {
    lastErrorText = e.message || String(e);
  }

  // 2. If proxy failed or not in dev server, try direct Microsoft common endpoint
  if (!response) {
    try {
      const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (res.ok) {
        response = res;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastErrorText = errJson.error_description || errJson.error || `Direct error (${res.status})`;
      }
    } catch (e: any) {
      lastErrorText = e.message || String(e);
    }
  }

  // 3. Try consumers endpoint fallback
  if (!response) {
    try {
      const res = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (res.ok) {
        response = res;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastErrorText = errJson.error_description || errJson.error || `Consumers error (${res.status})`;
      }
    } catch (e: any) {
      lastErrorText = e.message || String(e);
    }
  }

  if (!response) {
    throw new Error(lastErrorText || '刷新微软令牌失败，请检查 RefreshToken 是否有效');
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || '未能获取有效的 AccessToken');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || account.refreshToken,
    expiresIn: data.expires_in || 3600,
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

  // Method 1: Try Outlook REST API (v2.0) - standard for tokens issued to Outlook clients (client ID 9e5f94bc-...)
  const outlookEndpoints = [
    `/api/ms-outlook/me/mailFolders/${folderPath}/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`,
    `https://outlook.office.com/api/v2.0/me/mailFolders/${folderPath}/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`,
    `/api/ms-outlook/me/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`,
    `https://outlook.office.com/api/v2.0/me/messages?$top=30&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body`
  ];

  for (const endpoint of outlookEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.value)) {
          rawList = data.value;
          fetchSucceeded = true;
          break;
        }
      } else {
        lastError = `Outlook API (${res.status})`;
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }

  // Method 2: If Outlook API did not succeed, try Microsoft Graph API (v1.0)
  if (!fetchSucceeded) {
    const graphEndpoints = [
      `/api/ms-graph/me/mailFolders/${folderPath}/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
      `https://graph.microsoft.com/v1.0/me/mailFolders/${folderPath}/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
      `/api/ms-graph/me/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`,
      `https://graph.microsoft.com/v1.0/me/messages?$top=30&$select=id,subject,from,receivedDateTime,bodyPreview,body`
    ];

    for (const endpoint of graphEndpoints) {
      try {
        const res = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.value)) {
            rawList = data.value;
            fetchSucceeded = true;
            break;
          }
        } else {
          lastError = `Graph API (${res.status})`;
        }
      } catch (e: any) {
        lastError = e.message;
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

// Send an Email via Microsoft API
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

  // Try Outlook REST API first
  let ok = false;
  try {
    const res = await fetch('/api/ms-outlook/me/sendmail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) ok = true;
  } catch {}

  if (!ok) {
    // Try Graph API
    const res = await fetch('/api/ms-graph/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`发送邮件失败 (${res.status})`);
    }
  }
}

