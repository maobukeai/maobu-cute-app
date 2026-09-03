// WebDAV Cloud Backup & Sync Engine for 【猫步可爱】
import { WebDAVConfig, WebDAVBackupItem, FullAppBackup } from '../types';

export const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
  serverUrl: 'https://dav.jianguoyun.com/dav/',
  username: '2026958851@qq.com',
  password: 'acnceetfpeb6rku4',
  remoteDir: 'MaobuCute',
  retentionDays: 15,
  isReady: true,
  lastUploadedAt: undefined,
  lastRestoredAt: '2026/09/02 23:14',
};

function formatBasicAuth(username: string, pass: string): string {
  return 'Basic ' + btoa(unescape(encodeURIComponent(`${username}:${pass}`)));
}

function cleanUrl(serverUrl: string, remoteDir = '', fileName = ''): string {
  let base = serverUrl.trim();
  if (!base.endsWith('/')) base += '/';

  if (remoteDir) {
    let dir = remoteDir.trim().replace(/^\/+|\/+$/g, '');
    base += dir + '/';
  }

  if (fileName) {
    base += fileName.trim().replace(/^\/+/, '');
  }

  return base;
}

// Low-level fetch via local proxy (to eliminate CORS in dev/browser) with direct fallback
async function webdavRequest(
  url: string,
  method: string,
  config: WebDAVConfig,
  body?: string | Uint8Array,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; text: string; ok: boolean }> {
  const auth = formatBasicAuth(config.username, config.password);
  const headers: Record<string, string> = {
    'Authorization': auth,
    ...extraHeaders,
  };

  // Try local proxy endpoint first
  const proxyUrl = `/api/webdav-proxy?target=${encodeURIComponent(url)}`;

  let response: Response;
  try {
    response = await fetch(proxyUrl, {
      method,
      headers: {
        ...headers,
        'X-Target-Url': url,
      },
      body: body as any,
    });
  } catch {
    // If proxy call fails, attempt direct fetch
    response = await fetch(url, {
      method,
      headers,
      body: body as any,
    });
  }

  const text = await response.text().catch(() => '');
  return {
    status: response.status,
    text,
    ok: response.status >= 200 && response.status < 300 || response.status === 207,
  };
}

// 1. Test WebDAV Connection & initialize remote directory
export async function testWebDAVConnection(config: WebDAVConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.serverUrl || !config.username || !config.password) {
    return { ok: false, message: '请填写完整的服务地址、账号及应用密码' };
  }

  try {
    const rootUrl = cleanUrl(config.serverUrl);
    // Send PROPFIND to root
    const testRes = await webdavRequest(rootUrl, 'PROPFIND', config, undefined, { Depth: '0' });

    if (testRes.status === 401) {
      return { ok: false, message: '认证失败 (401)：应用密码或账号错误，请检查坚果云应用密码' };
    }

    if (!testRes.ok && testRes.status !== 404 && testRes.status !== 405) {
      return { ok: false, message: `连接异常 (HTTP ${testRes.status})` };
    }

    // Ensure remote directory exists
    if (config.remoteDir) {
      const dirUrl = cleanUrl(config.serverUrl, config.remoteDir);
      const dirCheck = await webdavRequest(dirUrl, 'PROPFIND', config, undefined, { Depth: '0' });
      if (dirCheck.status === 404) {
        // Try MKCOL to create folder
        await webdavRequest(dirUrl, 'MKCOL', config);
      }
    }

    return { ok: true, message: '云端连接正常，WebDAV 服务已就绪！' };
  } catch (err: any) {
    return { ok: false, message: `连接失败: ${err.message}` };
  }
}

// 2. Upload full backup JSON
export async function uploadWebDAVBackup(
  config: WebDAVConfig,
  backupData: FullAppBackup
): Promise<{ ok: boolean; filename: string; message: string }> {
  try {
    const dirUrl = cleanUrl(config.serverUrl, config.remoteDir);
    // Ensure folder exists
    await webdavRequest(dirUrl, 'MKCOL', config).catch(() => {});

    // Filename format: maobu_backup_2026-09-03_21-00-00.json
    const now = new Date();
    const dateTag = now.toISOString().replace(/[:.]/g, '-');
    const filename = `maobu_backup_${dateTag}.json`;
    const targetFileUrl = cleanUrl(config.serverUrl, config.remoteDir, filename);

    const jsonStr = JSON.stringify(backupData, null, 2);
    const putRes = await webdavRequest(targetFileUrl, 'PUT', config, jsonStr, {
      'Content-Type': 'application/json;charset=utf-8',
    });

    if (!putRes.ok && putRes.status !== 201 && putRes.status !== 204) {
      throw new Error(`上传失败 (HTTP ${putRes.status}): ${putRes.text.slice(0, 100)}`);
    }

    // Retention prune
    if (config.retentionDays > 0) {
      try {
        await pruneExpiredBackups(config);
      } catch (err) {
        console.warn('Prune expired backups error:', err);
      }
    }

    return { ok: true, filename, message: '云端备份上传成功！' };
  } catch (err: any) {
    return { ok: false, filename: '', message: err.message };
  }
}

// 3. List Backups in Remote Directory
export async function listWebDAVBackups(config: WebDAVConfig): Promise<WebDAVBackupItem[]> {
  const dirUrl = cleanUrl(config.serverUrl, config.remoteDir);

  const res = await webdavRequest(dirUrl, 'PROPFIND', config, undefined, {
    Depth: '1',
    'Content-Type': 'application/xml; charset=utf-8',
  });

  if (!res.ok && res.status !== 207) {
    return [];
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(res.text, 'text/xml');
  const responses = Array.from(xml.querySelectorAll('response, d\\:response'));

  const items: WebDAVBackupItem[] = [];

  for (const resp of responses) {
    const hrefNode = resp.querySelector('href, d\\:href');
    if (!hrefNode) continue;
    const rawHref = decodeURIComponent(hrefNode.textContent || '');
    const cleanHref = rawHref.replace(/\/+$/, '');
    const fileName = cleanHref.split('/').pop() || '';

    // Only include our json backups
    if (!fileName.endsWith('.json') || !fileName.startsWith('maobu_backup')) continue;

    const modifiedNode = resp.querySelector('getlastmodified, d\\:getlastmodified');
    const lengthNode = resp.querySelector('getcontentlength, d\\:getcontentlength');

    const lastModified = modifiedNode?.textContent ? new Date(modifiedNode.textContent).toISOString() : new Date().toISOString();
    const size = lengthNode?.textContent ? parseInt(lengthNode.textContent, 10) : 0;

    items.push({
      name: fileName,
      size,
      lastModified,
      url: cleanUrl(config.serverUrl, config.remoteDir, fileName),
    });
  }

  // Sort newest first
  return items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

// 4. Download and parse remote backup JSON
export async function downloadWebDAVBackup(config: WebDAVConfig, filename: string): Promise<FullAppBackup> {
  const fileUrl = cleanUrl(config.serverUrl, config.remoteDir, filename);
  const res = await webdavRequest(fileUrl, 'GET', config);

  if (!res.ok) {
    throw new Error(`下载备份失败 (HTTP ${res.status})`);
  }

  return JSON.parse(res.text);
}

// 5. Delete specific remote backup
export async function deleteWebDAVBackup(config: WebDAVConfig, filename: string): Promise<void> {
  const fileUrl = cleanUrl(config.serverUrl, config.remoteDir, filename);
  const res = await webdavRequest(fileUrl, 'DELETE', config);
  if (!res.ok && res.status !== 404) {
    throw new Error(`删除失败 (HTTP ${res.status})`);
  }
}

// 6. Prune backups older than retentionDays
async function pruneExpiredBackups(config: WebDAVConfig): Promise<void> {
  const backups = await listWebDAVBackups(config);
  const now = Date.now();
  const maxAgeMs = config.retentionDays * 24 * 60 * 60 * 1000;

  for (const b of backups) {
    const age = now - new Date(b.lastModified).getTime();
    if (age > maxAgeMs) {
      await deleteWebDAVBackup(config, b.name).catch(() => {});
    }
  }
}
