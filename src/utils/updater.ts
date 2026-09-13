// App Updater Service for 【猫步可爱 (Maobu Cute)】(Android Mobile Exclusive)
import { AppUpdateCheckResult, AppUpdateInfo, AppUpdateAsset } from '../types';

export const CURRENT_VERSION = '0.1.1';
export const APP_BUILD_TAG = 'Android 14 (Capacitor)';
export const GITHUB_REPO = 'maobukeai/maobu-cute-app';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compare two semver strings (e.g. "0.1.2" vs "0.1.1").
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^[vV]/, '').trim();
  const clean2 = v2.replace(/^[vV]/, '').trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Format file size bytes into human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i] || 'MB'}`;
}

/**
 * Check for updates against GitHub Releases API with graceful fallback.
 */
export async function checkAppUpdate(
  currentVersion: string = CURRENT_VERSION
): Promise<AppUpdateCheckResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(GITHUB_LATEST_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': `MaobuCuteApp/${currentVersion}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 404) {
      // No release published yet on repo
      return {
        hasUpdate: false,
        currentVersion,
        latest: {
          version: currentVersion,
          releaseDate: new Date().toISOString().split('T')[0],
          releaseNotes: '当前已是官方最新版本，暂未发布更高版本。',
          htmlUrl: GITHUB_RELEASES_URL,
        },
      };
    }

    if (!res.ok) {
      if (res.status === 403) {
        return {
          hasUpdate: false,
          currentVersion,
          error: 'GitHub API 请求频率受限 (403)，请稍后重试或前往 Releases 网页查看',
        };
      }
      throw new Error(`服务器响应异常 (HTTP ${res.status})`);
    }

    const data = await res.json();
    const rawTag: string = data.tag_name || data.name || '';
    const latestVer = rawTag.replace(/^[vV]/, '').trim();

    // Look for APK asset
    let apkAsset: AppUpdateAsset | undefined;
    if (Array.isArray(data.assets)) {
      const foundApk = data.assets.find((a: any) =>
        typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')
      );
      if (foundApk) {
        apkAsset = {
          name: foundApk.name,
          size: foundApk.size || 0,
          downloadUrl: foundApk.browser_download_url,
          contentType: foundApk.content_type,
        };
      }
    }

    const hasUpdate = compareVersions(latestVer, currentVersion) > 0;

    const latestInfo: AppUpdateInfo = {
      version: latestVer,
      releaseDate: data.published_at ? data.published_at.split('T')[0] : undefined,
      releaseNotes: data.body || '无详细更新说明。',
      downloadUrl: apkAsset?.downloadUrl || data.html_url || GITHUB_RELEASES_URL,
      apkAsset,
      htmlUrl: data.html_url || GITHUB_RELEASES_URL,
    };

    return {
      hasUpdate,
      currentVersion,
      latest: latestInfo,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        hasUpdate: false,
        currentVersion,
        error: '检查更新超时，请检查手机网络连通性',
      };
    }
    return {
      hasUpdate: false,
      currentVersion,
      error: `检查更新失败：${err.message || String(err)}`,
    };
  }
}

/**
 * Open external URL (browser or external intent) safely in Android mobile.
 */
export function openExternalUrl(url: string): void {
  try {
    const w = window.open(url, '_system');
    if (!w) {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}

/**
 * Download APK file with real-time progress callback.
 */
export function downloadApkWithProgress(
  url: string,
  onProgress: (loaded: number, total: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = event => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      } else {
        onProgress(event.loaded, event.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`下载失败，服务器返回 HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('网络连接中断，下载失败'));
    };

    xhr.ontimeout = () => {
      reject(new Error('下载请求超时，请检查网络设置'));
    };

    xhr.send();
  });
}
