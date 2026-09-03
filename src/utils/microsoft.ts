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
  const labeledRegex = /(?:验证码|动态码|安全码|PIN码|授权码|PIN|code|verification\s*code|security\s*code|one-time\s*code)[^\d]{0,12}([0-9]{4,8})\b/i;
  const labeledMatch = combined.match(labeledRegex);
  if (labeledMatch && labeledMatch[1]) {
    return labeledMatch[1];
  }

  // Priority 2: "is 123456" / "为 123456"
  const isRegex = /(?:是|为|is|is:)\s*([0-9]{4,8})\b/i;
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
  params.append('scope', 'offline_access https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send');

  // Try local proxy first to avoid browser CORS, with fallback
  let response: Response;
  try {
    response = await fetch('/api/ms-oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  } catch {
    // If proxy failed, attempt direct request
    response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || errorData.error || `令牌刷新失败 (${response.status})`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  };
}

// Fetch messages from specific folder (inbox or junkemail)
export async function fetchFolderMessages(
  accessToken: string,
  folder: 'inbox' | 'junkemail' = 'inbox'
): Promise<EmailMessage[]> {
  const folderPath = folder === 'junkemail' ? 'junkemail' : 'inbox';
  const url = `/api/ms-graph/me/mailFolders/${folderPath}/messages?$top=25&$select=id,subject,from,receivedDateTime,bodyPreview,body`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Fallback direct call
    response = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/${folderPath}/messages?$top=25&$select=id,subject,from,receivedDateTime,bodyPreview,body`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }

  if (!response.ok) {
    throw new Error(`获取${folder === 'junkemail' ? '垃圾邮件箱' : '收件箱'}失败 (${response.status})`);
  }

  const data = await response.json();
  const rawList = data.value || [];

  return rawList.map((msg: any) => {
    const subject = msg.subject || '(无主题)';
    const preview = msg.bodyPreview || '';
    const bodyContent = msg.body?.content || '';
    const code = extractVerificationCode(subject, preview + ' ' + bodyContent);

    return {
      id: msg.id,
      subject,
      from: msg.from?.emailAddress?.address || '未知发件人',
      fromName: msg.from?.emailAddress?.name,
      receivedDateTime: msg.receivedDateTime,
      bodyPreview: preview,
      bodyHtml: msg.body?.contentType === 'html' ? bodyContent : undefined,
      extractedCode: code,
      folder,
    };
  });
}

// Fetch Messages from Microsoft Graph API (supports inbox, junkemail, or parallel all)
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
    for (const r of results) {
      if (r.status === 'fulfilled') {
        allMsgs.push(...r.value);
      }
    }

    return allMsgs.sort(
      (a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
    );
  }

  return fetchFolderMessages(accessToken, folder);
}

// Send an Email via Microsoft Graph API
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

  const url = '/api/ms-graph/me/sendMail';
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    throw new Error(`发送邮件失败 (${response.status})`);
  }
}
