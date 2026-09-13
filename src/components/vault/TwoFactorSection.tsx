import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TwoFactorToken } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { generateTOTP } from '../../utils/crypto';
import { parseTwoFactorQR, ParsedTwoFactor } from '../../utils/qr';
import { BottomSheet } from '../common/BottomSheet';
// jsQR + camera flow load on first scan — never with the vault chunk.
const QRScannerModal = React.lazy(() =>
  import('../modals/QRScannerModal').then(m => ({ default: m.QRScannerModal }))
);
import { Button, EmptyState, Field, Input, ProgressRing, NowSecondProvider, useNowSecond, remainingSeconds } from '../ui';
import {
  ShieldCheck,
  Plus,
  Camera,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';

interface TwoFactorSectionProps {
  tokens: TwoFactorToken[];
  onUpdateTokens: (tokens: TwoFactorToken[]) => void;
}

/** Live countdown ring — the only part of a token card that ticks per second. */
const CountdownRing: React.FC<{ period: number }> = ({ period }) => {
  const nowSec = useNowSecond();
  const remaining = remainingSeconds(nowSec, period);
  const secondsCls =
    remaining <= 5 ? 'text-danger' : remaining <= 10 ? 'text-warn' : 'text-ink-2';
  return (
    <ProgressRing value={remaining / period} size={36} stroke={3.5}>
      <span className={`text-caption font-mono font-bold ${secondsCls}`}>{remaining}</span>
    </ProgressRing>
  );
};

/** Token card body — recomputed only when the code itself rolls over. */
const TokenCard = React.memo<{
  token: TwoFactorToken;
  code: string;
  copied: boolean;
  onCopy: (code: string, id: string) => void;
  onDelete: (id: string) => void;
}>(function TokenCard({ token, code, copied, onCopy, onDelete }) {
  const period = token.period || 30;
  const formattedCode = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

  return (
    <div
      onClick={() => onCopy(code, token.id)}
      className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 cursor-pointer relative group tactile-press"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-caption font-bold text-ink-3 tracking-wider uppercase">
            {token.issuer}
          </span>
          <p className="text-sub text-ink-2 font-medium mt-0.5 truncate">
            {token.account}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <CountdownRing period={period} />

          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(token.id);
            }}
            className="p-1.5 text-ink-3 hover:text-danger rounded-lg transition-colors tactile-press"
            title="删除令牌"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Big 6-digit code display */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="font-mono text-title font-bold tracking-widest text-ink">
          {formattedCode}
        </div>

        <div className="flex items-center gap-1.5 text-caption font-semibold shrink-0">
          {copied ? (
            <>
              <Check className="w-4 h-4 text-ok" />
              <span className="text-ok">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-ink-3" />
              <span className="text-ink-3 group-hover:text-accent transition-colors">
                点击复制
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export const TwoFactorSection: React.FC<TwoFactorSectionProps> = ({
  tokens,
  onUpdateTokens,
}) => {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [totpIssuer, setTotpIssuer] = useState('');
  const [totpAccount, setTotpAccount] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUriInput, setTotpUriInput] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyFeedback = React.useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    haptics.selection();
    sound.playTap();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleDeleteToken = React.useCallback(
    (id: string) => {
      sound.playTap();
      const updated = tokens.filter(t => t.id !== id);
      onUpdateTokens(updated);
      db.save2FATokens(updated);
    },
    [tokens, onUpdateTokens]
  );

  // Regenerate codes only when a token's time window rolls over —
  // instead of hammering WebCrypto for every token every second.
  const windowRef = useRef<Record<string, number>>({});
  const nowSec = useNowSecond();

  useEffect(() => {
    let cancelled = false;

    const pending = tokens.filter(t => {
      const period = t.period || 30;
      const win = Math.floor(nowSec / period);
      if (windowRef.current[t.id] === win && codes[t.id]) return false;
      windowRef.current[t.id] = win;
      return true;
    });
    if (pending.length === 0) return;

    (async () => {
      const updates: Record<string, string> = {};
      for (const token of pending) {
        try {
          const res = await generateTOTP(token.secret, token.period || 30, token.digits || 6);
          updates[token.id] = res.code;
        } catch {
          updates[token.id] = '------';
        }
      }
      if (!cancelled) {
        setCodes(prev => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nowSec, tokens, codes]);

  const openManualAdd = () => {
    sound.playTap();
    setTotpIssuer('');
    setTotpAccount('');
    setTotpSecret('');
    setTotpUriInput('');
    setShow2FAModal(true);
  };

  const openQRScanner = () => {
    sound.playTap();
    setShowQRScanner(true);
  };

  const handleAdd2FAToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecret.trim()) return;

    sound.playSuccess();
    const newToken: TwoFactorToken = {
      id: '2fa_' + Date.now(),
      issuer: totpIssuer.trim() || '通用验证码',
      account: totpAccount.trim() || '默认账号',
      secret: totpSecret.trim().toUpperCase(),
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
      createdAt: new Date().toISOString(),
    };

    const updated = [newToken, ...tokens];
    onUpdateTokens(updated);
    db.save2FATokens(updated);
    setShow2FAModal(false);
  };

  const handleParseUri = (uri: string) => {
    setTotpUriInput(uri);
    const parsed = parseTwoFactorQR(uri);
    if (parsed) {
      setTotpIssuer(parsed.issuer);
      setTotpAccount(parsed.account);
      setTotpSecret(parsed.secret);
    }
  };

  const handleScanQRSuccess = (parsed: ParsedTwoFactor) => {
    const exists = tokens.some(
      t =>
        t.secret.toUpperCase() === parsed.secret.toUpperCase() &&
        t.account.trim().toLowerCase() === parsed.account.trim().toLowerCase()
    );
    if (!exists) {
      const newToken: TwoFactorToken = {
        id: 'totp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        issuer: parsed.issuer,
        account: parsed.account,
        secret: parsed.secret,
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
        createdAt: new Date().toISOString(),
      };
      const updated = [newToken, ...tokens];
      onUpdateTokens(updated);
      db.save2FATokens(updated);
      sound.playSuccess();
    } else {
      sound.playTap();
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar: title left, actions right */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-headline font-bold text-ink">动态口令 (TOTP)</h4>
          <p className="text-caption text-ink-3 mt-0.5">RFC 6238 标准 · 30 秒循环更新</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="primary" size="sm" onClick={openQRScanner} haptic="medium">
            <Camera className="w-3.5 h-3.5" />
            <span>扫码添加</span>
          </Button>
          <Button variant="neutral" size="sm" onClick={openManualAdd} title="手动输入密钥">
            <Plus className="w-3.5 h-3.5" />
            <span>手动添加</span>
          </Button>
        </div>
      </div>

      {/* Token cards */}
      {tokens.length === 0 ? (
        <>
          <EmptyState
            icon={ShieldCheck}
            title="暂无 2FA 两步验证码"
            hint="兼容 Google Authenticator、GitHub、Binance 等通用 RFC 6238 规范"
            actionLabel="扫码快速添加"
            onAction={openQRScanner}
            className="mt-2"
          />
          <div className="flex justify-center -mt-4 pb-2">
            <Button variant="ghost" size="sm" onClick={openManualAdd}>
              手动输入密钥
            </Button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          <NowSecondProvider>
            <AnimatePresence initial={false}>
              {tokens.map(token => (
                <motion.div
                  key={token.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                >
                  <TokenCard
                    token={token}
                    code={codes[token.id] || '------'}
                    copied={copiedId === token.id}
                    onCopy={handleCopyFeedback}
                    onDelete={handleDeleteToken}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </NowSecondProvider>
        </div>
      )}

      {/* Add token sheet */}
      <BottomSheet
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        title="添加 2FA 双重身份令牌"
      >
        <div className="space-y-4 pb-2">
          {/* Quick QR scanner trigger banner */}
          <div className="p-3.5 bg-accent/10 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-accent text-white rounded-xl shadow-glow-accent shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sub font-bold text-ink">一键扫码或识别二维码图片</div>
                <div className="text-caption text-ink-2 mt-0.5">
                  支持摄像头实时扫描、本地截图识别与剪贴板
                </div>
              </div>
            </div>

            <Button type="button" variant="soft" size="sm" onClick={openQRScanner} className="shrink-0">
              立即扫码
            </Button>
          </div>

          <form onSubmit={handleAdd2FAToken} className="space-y-4">
            <Field label="快速粘贴 otpauth:// 链接 / Base32 密钥">
              <Input
                placeholder="otpauth://totp/GitHub:user?secret=... 或直接粘贴密钥"
                value={totpUriInput}
                onChange={e => handleParseUri(e.target.value)}
                className="font-mono"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="发行平台 (Issuer)" required>
                <Input
                  required
                  placeholder="如: Google, GitHub"
                  value={totpIssuer}
                  onChange={e => setTotpIssuer(e.target.value)}
                />
              </Field>
              <Field label="账号标识">
                <Input
                  placeholder="如: your_name@email"
                  value={totpAccount}
                  onChange={e => setTotpAccount(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Base32 密钥 (Secret)" required>
              <Input
                required
                placeholder="如: JBSWY3DPEHPK3PXP"
                value={totpSecret}
                onChange={e => setTotpSecret(e.target.value)}
                className="font-mono"
              />
            </Field>

            <div className="pt-1 flex items-center justify-end gap-2.5">
              <Button type="button" variant="ghost" size="md" onClick={() => setShow2FAModal(false)}>
                取消
              </Button>
              <Button type="submit" variant="primary" size="md" className="min-w-[108px]">
                添加动态码
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* 2FA QR code scanner modal */}
      {showQRScanner && (
        <React.Suspense fallback={null}>
          <QRScannerModal
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            onScanSuccess={handleScanQRSuccess}
          />
        </React.Suspense>
      )}
    </div>
  );
};
