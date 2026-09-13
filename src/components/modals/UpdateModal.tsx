import React, { useState } from 'react';
import {
  ArrowUpCircle,
  ExternalLink,
  Download,
  LoaderCircle,
  X,
} from 'lucide-react';
import { AppUpdateInfo } from '../../types';
import { formatBytes, openExternalUrl, downloadApkWithProgress } from '../../utils/updater';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { useToast } from '../ui';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: AppUpdateInfo | null;
  onClose: () => void;
  onDismissForever?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  updateInfo,
  onClose,
  onDismissForever: _onDismissForever,
}) => {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ loaded: number; total: number } | null>(null);

  if (!isOpen || !updateInfo) return null;

  const handleStartUpdate = async () => {
    if (!updateInfo.downloadUrl) return;
    haptics.impactMedium();
    sound.playTap();

    if (updateInfo.apkAsset) {
      setDownloading(true);
      setDownloadProgress({ loaded: 0, total: updateInfo.apkAsset.size || 1 });

      try {
        await downloadApkWithProgress(updateInfo.downloadUrl, (loaded, total) => {
          setDownloadProgress({ loaded, total });
        });
        sound.playCelebration();
        toast.success('APK 安装包已下载完成，正在调起系统安装...');
        openExternalUrl(updateInfo.downloadUrl);
        onClose();
      } catch (err: any) {
        toast.error(`正在调起外部浏览器下载：${err.message}`);
        openExternalUrl(updateInfo.downloadUrl);
        onClose();
      } finally {
        setDownloading(false);
      }
    } else {
      openExternalUrl(updateInfo.downloadUrl);
      onClose();
    }
  };

  const handleDismiss = () => {
    if (downloading) return;
    sound.playTap();
    onClose();
  };

  const percent =
    downloadProgress && downloadProgress.total > 0
      ? Math.min(100, Math.round((downloadProgress.loaded / downloadProgress.total) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-sm bg-white dark:bg-[#181a24] rounded-3xl p-5 border border-black/10 dark:border-white/10 shadow-2xl space-y-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">发现新版本</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {updateInfo.releaseDate ? `发布于 ${updateInfo.releaseDate}` : '官方推荐更新'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            disabled={downloading}
            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Badge Box */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.05]">
          <div>
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>猫步可爱 v{updateInfo.version}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Android
              </span>
            </div>
            {updateInfo.apkAsset && (
              <div className="text-[10px] text-zinc-400 mt-0.5">
                安装包体积：{formatBytes(updateInfo.apkAsset.size)}
              </div>
            )}
          </div>

          {updateInfo.htmlUrl && (
            <button
              onClick={() => openExternalUrl(updateInfo.htmlUrl!)}
              className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]"
            >
              <span>网页详情</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Release Notes */}
        {updateInfo.releaseNotes && (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">更新内容：</div>
            <div className="max-h-36 overflow-y-auto p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed border border-black/[0.04] dark:border-white/[0.05]">
              {updateInfo.releaseNotes}
            </div>
          </div>
        )}

        {/* Download Progress */}
        {downloading && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                <LoaderCircle className="w-3 h-3 animate-spin" />
                正在下载 APK 安装包...
              </span>
              <span>{percent}%</span>
            </div>
            <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
            {downloadProgress && (
              <div className="text-[10px] text-zinc-400 text-right">
                {formatBytes(downloadProgress.loaded)} / {formatBytes(downloadProgress.total)}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
          <button
            onClick={handleDismiss}
            disabled={downloading}
            className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:scale-95 disabled:opacity-40 transition-all"
          >
            稍后提醒
          </button>
          <button
            onClick={handleStartUpdate}
            disabled={downloading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? '下载中...' : '立即更新'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
