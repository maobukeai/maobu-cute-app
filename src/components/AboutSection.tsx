import React, { useState } from 'react';
import {
  ArrowUpCircle,
  RefreshCw,
  LoaderCircle,
  ExternalLink,
  Heart,
  MessageCircle,
  ShieldCheck,
  Cpu,
  Layers,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  StickyNote,
  Bot,
  Mail,
  Download,
  X,
} from 'lucide-react';
import {
  CURRENT_VERSION,
  APP_BUILD_TAG,
  GITHUB_REPO,
  GITHUB_RELEASES_URL,
  checkAppUpdate,
  formatBytes,
  openExternalUrl,
  downloadApkWithProgress,
} from '../utils/updater';
import { sound } from '../utils/sound';
import { haptics } from '../utils/haptics';
import { AppSettings, AppUpdateCheckResult } from '../types';
import { Switch, useToast } from './ui';

interface AboutSectionProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  compact?: boolean;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  settings,
  onUpdateSettings,
  compact: _compact = false,
}) => {
  const toast = useToast();

  // QR Modal State: null | 'contact' | 'sponsor'
  const [qrModal, setQrModal] = useState<'contact' | 'sponsor' | null>(null);

  // Update check states
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<AppUpdateCheckResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ loaded: number; total: number } | null>(null);

  // Mascot tap easter egg
  const [showLove, setShowLove] = useState(false);

  const handleMascotClick = () => {
    haptics.impactLight();
    sound.playTap();
    setShowLove(true);
    setTimeout(() => setShowLove(false), 1400);
  };

  const handleManualCheckUpdate = async () => {
    haptics.selection();
    sound.playTap();
    setChecking(true);
    setCheckResult(null);

    try {
      const result = await checkAppUpdate(CURRENT_VERSION);
      setCheckResult(result);
      if (result.error) {
        toast.error(result.error);
      } else if (result.hasUpdate && result.latest) {
        sound.playCelebration();
        toast.success(`发现新版本 v${result.latest.version}！`);
      } else {
        sound.playSuccess();
        toast.success('当前已是最新版本！');
      }
    } catch (e: any) {
      toast.error(`检查更新异常：${e.message || String(e)}`);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleAutoCheck = () => {
    const nextVal = settings.autoCheckUpdate === false;
    haptics.selection();
    sound.playToggle();
    const updated = { ...settings, autoCheckUpdate: nextVal };
    onUpdateSettings(updated);
    toast.info(nextVal ? '已开启启动时自动检查更新' : '已关闭自动检查更新');
  };

  const handleStartDownload = async () => {
    if (!checkResult?.latest?.downloadUrl) return;
    const downloadUrl = checkResult.latest.downloadUrl;

    haptics.impactMedium();
    sound.playTap();

    if (checkResult.latest.apkAsset) {
      setDownloading(true);
      setDownloadProgress({ loaded: 0, total: checkResult.latest.apkAsset.size || 1 });

      try {
        await downloadApkWithProgress(downloadUrl, (loaded, total) => {
          setDownloadProgress({ loaded, total });
        });
        sound.playCelebration();
        toast.success('APK 安装包已就绪，正在准备调用系统安装...');
        openExternalUrl(downloadUrl);
      } catch (err: any) {
        toast.error(`应用内直下受限，正在为你打开浏览器进行下载：${err.message}`);
        openExternalUrl(downloadUrl);
      } finally {
        setDownloading(false);
      }
    } else {
      openExternalUrl(downloadUrl);
    }
  };

  const percent =
    downloadProgress && downloadProgress.total > 0
      ? Math.min(100, Math.round((downloadProgress.loaded / downloadProgress.total) * 100))
      : 0;

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* 1. HERO BRAND CARD */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-surface/90 border border-line shadow-elev-1 text-center">
        {/* Background subtle glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* Interactive Brand Monogram */}
        <div className="relative inline-block mb-3">
          <button
            onClick={handleMascotClick}
            className="relative group p-1 rounded-3xl active:scale-95 transition-transform"
            title="猫步可爱"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-hover text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-elev-2 ring-4 ring-surface select-none">
              MB
            </div>
          </button>

          {/* Easter Egg Tooltip */}
          {showLove && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-accent text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md animate-bounce whitespace-nowrap z-30">
              轻巧高效 · 专注当下
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-ink tracking-tight">
          猫步可爱 <span className="text-accent font-medium text-sm">(Maobu Cute)</span>
        </h2>
        <p className="text-xs text-ink-3 mt-1 leading-relaxed">
          踏着轻巧的猫步向前走 · 微信轻快极简与 Apple 原生质感
        </p>

        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-surface-2 border border-line text-[11px] text-ink-2">
          <span className="font-semibold text-ink">版本 v{CURRENT_VERSION}</span>
          <span className="w-1 h-1 rounded-full bg-ink-3" />
          <span>{APP_BUILD_TAG}</span>
        </div>
      </div>

      {/* 2. UPDATE CHECK SECTION */}
      <div className="rounded-2xl p-4 bg-surface/90 border border-line shadow-elev-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-ink">应用版本与自动更新</h3>
              <p className="text-[10px] text-ink-3">检测 GitHub Releases 官方最新版本</p>
            </div>
          </div>

          <button
            onClick={handleManualCheckUpdate}
            disabled={checking || downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all"
          >
            {checking ? (
              <>
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                <span>检查中...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>检查更新</span>
              </>
            )}
          </button>
        </div>

        {/* Auto Check Setting Switch */}
        <div className="flex items-center justify-between pt-2 border-t border-line/60">
          <div className="text-[11.5px] text-ink-2">
            <span className="font-medium text-ink">启动时自动检查更新</span>
            <p className="text-[10px] text-ink-3">发现新版本时在手机端主动弹窗提醒</p>
          </div>
          <Switch
            checked={settings.autoCheckUpdate !== false}
            onChange={handleToggleAutoCheck}
          />
        </div>

        {/* Check Result Card */}
        {checkResult && (
          <div className="mt-2 pt-2.5 border-t border-line/60">
            {checkResult.error ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">检查未完成</div>
                  <div className="text-[11px] mt-0.5 opacity-90">{checkResult.error}</div>
                </div>
              </div>
            ) : checkResult.hasUpdate && checkResult.latest ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>发现新版本 v{checkResult.latest.version}</span>
                  </div>
                  {checkResult.latest.releaseDate && (
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                      {checkResult.latest.releaseDate}
                    </span>
                  )}
                </div>

                {/* Release Notes */}
                {checkResult.latest.releaseNotes && (
                  <div className="max-h-28 overflow-y-auto p-2 rounded-lg bg-surface text-[11px] text-ink-2 whitespace-pre-wrap leading-relaxed border border-line/60">
                    {checkResult.latest.releaseNotes}
                  </div>
                )}

                {/* Download Progress Bar if downloading */}
                {downloading && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <LoaderCircle className="w-3 h-3 animate-spin" />
                        正在下载 APK...
                      </span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {downloadProgress && (
                      <div className="text-[10px] text-ink-3 text-right">
                        {formatBytes(downloadProgress.loaded)} / {formatBytes(downloadProgress.total)}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleStartDownload}
                    disabled={downloading}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloading ? '下载中...' : '立即下载并安装'}</span>
                  </button>
                  <button
                    onClick={() => openExternalUrl(checkResult.latest?.htmlUrl || GITHUB_RELEASES_URL)}
                    className="py-2 px-3 rounded-xl bg-surface-2 text-ink-2 text-xs font-medium flex items-center gap-1 active:scale-98 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Release 页面</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">当前已是最新版本 (v{CURRENT_VERSION})，无需更新</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. CORE FEATURES OVERVIEW */}
      <div className="rounded-2xl p-4 bg-surface/90 border border-line shadow-elev-1 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink">核心功能矩阵</h3>
            <p className="text-[10px] text-ink-3">专为移动端打造的极简高能工具箱</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 pt-1">
          {[
            {
              icon: CalendarCheck,
              color: 'text-emerald-500 bg-emerald-500/10',
              title: '计划与四象限清单',
              desc: '多层级子微步骤拆解，可视化成就进度环，支持 AI 秒级规划。',
            },
            {
              icon: StickyNote,
              color: 'text-amber-500 bg-amber-500/10',
              title: '灵感与 Markdown 备忘',
              desc: '全功能排版、分类置顶、AI 实时干活动态流思考面板。',
            },
            {
              icon: ShieldCheck,
              color: 'text-blue-500 bg-blue-500/10',
              title: '安全密码箱与 2FA 令牌',
              desc: 'RFC 6238 标准 30 秒圆环动态口令，客户端本地全加密。',
            },
            {
              icon: Mail,
              color: 'text-indigo-500 bg-indigo-500/10',
              title: '微软邮箱伴侣',
              desc: '收件箱/垃圾箱双管齐下，智能提取注册验证码与一键复制。',
            },
            {
              icon: Bot,
              color: 'text-rose-500 bg-rose-500/10',
              title: 'AI 智能伴侣与技能市场',
              desc: '多端点自定义模型接入、Prompt 专家技能市场与灵感生图。',
            },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-2/60 border border-line/50"
              >
                <div className={`p-2 rounded-lg shrink-0 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-ink">{item.title}</div>
                  <div className="text-[10.5px] text-ink-3 mt-0.5 leading-snug">
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. TECHNICAL ARCHITECTURE CARD */}
      <div className="rounded-2xl p-4 bg-surface/90 border border-line shadow-elev-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink">技术架构设计</h3>
            <p className="text-[10px] text-ink-3">现代化、轻量级与端到端安全规范</p>
          </div>
        </div>

        <div className="space-y-2 text-[11px] text-ink-2 leading-relaxed pt-1">
          <div className="flex items-start gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink">前端视图层 (Frontend)：</strong>
              基于 React 19 + TypeScript + Vite + Tailwind CSS，配合高审美流体毛玻璃微质感。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink">安卓原生容器 (Engine)：</strong>
              基于 Capacitor 7 Android 原生环境，具备系统级触觉震动、沉浸式安全区自适应。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <HardDrive className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink">本地存储与加密 (Vault)：</strong>
              Local-First 本地优先架构，核心密码与令牌基于 Web Cryptography AES-GCM 端到端加密。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Cloud className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink">云端多端同步 (Sync)：</strong>
              支持坚果云及自建 WebDAV 全量加密镜像备份与增量跨端还原。
            </div>
          </div>
        </div>
      </div>

      {/* 5. AUTHOR & TEAM SECTION */}
      <div className="rounded-2xl p-4 bg-surface/90 border border-line shadow-elev-1 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-ink-3">作者 / 开发团队</div>
            <div className="text-xs font-bold text-ink mt-0.5">
              猫步可爱 <span className="font-normal text-ink-3">(maobukeai / 鲤蓝)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playTap();
                setQrModal('contact');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium active:scale-95 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>联系微信</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setQrModal('sponsor');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium active:scale-95 transition-all"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>赞赏支持</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px]">
          <span className="text-ink-3">官方开源代码仓库</span>
          <button
            onClick={() => openExternalUrl(`https://github.com/${GITHUB_REPO}`)}
            className="inline-flex items-center gap-1 text-rose-500 font-semibold hover:underline"
          >
            <span>GitHub/{GITHUB_REPO}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 6. COPYRIGHT & LICENSE */}
      <div className="pt-2 text-center text-[10.5px] text-ink-3 space-y-1">
        <div>Released under the MIT License · Open Source</div>
        <div>Copyright © 2026 Maobu Cute. All rights reserved.</div>
      </div>

      {/* ── Contact & Sponsor QR Modals ──────────────────────────────── */}
      {qrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs bg-surface rounded-3xl p-5 border border-line shadow-2xl space-y-4 animate-scale-in text-center">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-ink">
                {qrModal === 'contact' ? '微信联系作者' : '赞赏支持作者'}
              </h4>
              <button
                onClick={() => setQrModal(null)}
                className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-ink-3 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center p-2 bg-white rounded-2xl border border-zinc-200 shadow-inner">
              <img
                src={qrModal === 'contact' ? '/assets/contact_qr.webp' : '/assets/sponsor_qr.webp'}
                alt={qrModal === 'contact' ? '猫步可爱 微信二维码' : '猫步可爱 赞赏码'}
                className="w-56 h-auto rounded-xl"
              />
            </div>

            <div className="text-xs text-ink-2 space-y-1">
              <div className="font-semibold text-ink">
                {qrModal === 'contact' ? '猫步可爱 (鲤蓝)' : '“愿每一个目标与灵感都被温柔守护”'}
              </div>
              <p className="text-[11px] text-ink-3">
                {qrModal === 'contact'
                  ? '扫二维码，添加作者为微信好友，反馈意见与交流'
                  : '感谢你对「猫步可爱」独立研发的支持与鼓励！'}
              </p>
            </div>

            <button
              onClick={() => setQrModal(null)}
              className="w-full py-2 rounded-xl bg-surface-2 text-ink text-xs font-semibold active:scale-95 transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
