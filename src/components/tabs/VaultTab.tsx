import React, { useState, useEffect } from 'react';
import {
  PasswordItem,
  TwoFactorToken,
  HotmailAccount,
  AccentColor,
  GoogleWarmingAccount,
  AIProvider,
} from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { encryptData, decryptData, calculatePasswordStrength } from '../../utils/crypto';
/** Inline fallback for the lazily-loaded 谷歌养号 sub-tab. */
const SubTabLoading: React.FC = () => (
  <div className="flex-1 flex items-center justify-center py-16">
    <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
  </div>
);

// Loaded only when the user opens the 谷歌养号 sub-tab — keeps the
// vault chunk small for the password/2FA/email majority flow.
const GoogleWarmingSection = React.lazy(() =>
  import('../vault/GoogleWarmingSection').then(m => ({ default: m.GoogleWarmingSection }))
);
import { PasswordsSection } from '../vault/PasswordsSection';
import { TwoFactorSection } from '../vault/TwoFactorSection';
import { HotmailSection } from '../vault/HotmailSection';
import {
  KeyRound,
  ShieldCheck,
  Mail,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { Button, Field, Input, SegmentedControl } from '../ui';
import type { SegmentedItem } from '../ui';
import { useToast } from '../ui';

interface VaultTabProps {
  passwords: PasswordItem[];
  onUpdatePasswords: (passwords: PasswordItem[]) => void;
  tokens: TwoFactorToken[];
  onUpdateTokens: (tokens: TwoFactorToken[]) => void;
  hotmailAccounts: HotmailAccount[];
  onUpdateHotmailAccounts: (accounts: HotmailAccount[]) => void;
  googleAccounts?: GoogleWarmingAccount[];
  onUpdateGoogleAccounts?: (accounts: GoogleWarmingAccount[]) => void;
  providers?: AIProvider[];
  accentColor: AccentColor;
}

type VaultSubTab = 'passwords' | '2fa' | 'hotmail' | 'google';

const SUBTAB_ITEMS: SegmentedItem<VaultSubTab>[] = [
  { id: 'passwords', label: '密码箱' },
  { id: '2fa', label: '2FA 码' },
  { id: 'hotmail', label: '微软邮箱' },
  { id: 'google', label: '谷歌养号' },
];

/** Compact one-line stat pill used in the vault header strip. */
const StatChip: React.FC<{ icon: LucideIcon; value: React.ReactNode; label: string; iconCls?: string }> = ({
  icon: Icon,
  value,
  label,
  iconCls = 'text-ink-3',
}) => (
  <span className="shrink-0 h-7 px-2.5 rounded-full bg-surface-2/70 inline-flex items-center gap-1.5 text-caption font-medium text-ink-2">
    <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
    <span className="text-ink font-bold">{value}</span>
    <span>{label}</span>
  </span>
);

export const VaultTab: React.FC<VaultTabProps> = ({
  passwords,
  onUpdatePasswords,
  tokens,
  onUpdateTokens,
  hotmailAccounts,
  onUpdateHotmailAccounts,
  googleAccounts,
  onUpdateGoogleAccounts,
  providers,
  accentColor,
}) => {
  const toast = useToast();

  const [subTab, setSubTab] = useState<VaultSubTab>(() => {
    return (localStorage.getItem('maobu_vault_subtab') as VaultSubTab) || 'passwords';
  });

  const handleSwitchSubTab = (tab: VaultSubTab) => {
    setSubTab(tab);
    localStorage.setItem('maobu_vault_subtab', tab);
  };

  // -------------------------------------------------------------
  // Master Password & AES-GCM Encryption State
  // -------------------------------------------------------------
  const [hasMasterPassword, setHasMasterPassword] = useState<boolean>(() => db.hasMasterPassword());
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(() => !db.hasMasterPassword());
  const [masterKey, setMasterKey] = useState<string>('');
  const [unlockInput, setUnlockInput] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string>('');
  const [showUnlockPw, setShowUnlockPw] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  // Set / Manage Master Password Sheet
  const [showSetMasterModal, setShowSetMasterModal] = useState<boolean>(false);
  const [newMasterPw, setNewMasterPw] = useState<string>('');
  const [confirmMasterPw, setConfirmMasterPw] = useState<string>('');
  const [setMasterError, setSetMasterError] = useState<string>('');
  const [isSettingMaster, setIsSettingMaster] = useState<boolean>(false);

  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);

  // Zero-knowledge security: clear in-memory plaintext passwords on unmount when master password is active
  useEffect(() => {
    return () => {
      if (db.hasMasterPassword()) {
        onUpdatePasswords([]);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistPasswords = async (updated: PasswordItem[]) => {
    onUpdatePasswords(updated);
    if (hasMasterPassword && masterKey) {
      try {
        const ciphertext = await encryptData(JSON.stringify(updated), masterKey);
        db.savePasswordsCiphertext(ciphertext);
        db.savePasswords([]); // Clear plaintext from disk
      } catch (err) {
        console.error('Failed to encrypt passwords to disk:', err);
      }
    } else {
      db.savePasswords(updated);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockInput.trim()) return;
    setIsUnlocking(true);
    setUnlockError('');

    try {
      const verifier = db.getVaultVerifier();
      if (!verifier) {
        setIsVaultUnlocked(true);
        setIsUnlocking(false);
        return;
      }

      const check = await decryptData(verifier, unlockInput.trim());
      if (check !== 'MAOBU_VAULT_OK') {
        throw new Error('主密码错误');
      }

      setMasterKey(unlockInput.trim());
      setIsVaultUnlocked(true);
      sound.playSuccess();

      const ciphertext = db.getPasswordsCiphertext();
      if (ciphertext) {
        const decryptedJson = await decryptData(ciphertext, unlockInput.trim());
        const list = JSON.parse(decryptedJson);
        if (Array.isArray(list)) {
          onUpdatePasswords(list);
        }
      }
      setUnlockInput('');
    } catch {
      sound.playTap();
      setUnlockError('主密码错误，解密失败，请重新输入');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLockVault = () => {
    sound.playTap();
    setMasterKey('');
    setIsVaultUnlocked(false);
    setUnlockInput('');
    setUnlockError('');
    onUpdatePasswords([]);
  };

  const handleSaveMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetMasterError('');

    if (newMasterPw.length < 6) {
      setSetMasterError('主密码长度不能少于 6 位');
      return;
    }
    if (newMasterPw !== confirmMasterPw) {
      setSetMasterError('两次输入的密码不一致');
      return;
    }

    setIsSettingMaster(true);
    try {
      const verifier = await encryptData('MAOBU_VAULT_OK', newMasterPw);
      db.saveVaultVerifier(verifier);

      const ciphertext = await encryptData(JSON.stringify(passwords), newMasterPw);
      db.savePasswordsCiphertext(ciphertext);
      db.savePasswords([]);

      setMasterKey(newMasterPw);
      setHasMasterPassword(true);
      setIsVaultUnlocked(true);
      setShowSetMasterModal(false);
      setNewMasterPw('');
      setConfirmMasterPw('');
      sound.playSuccess();
      toast.success('主密码设置成功！密码箱已启用 AES-GCM 256 位加密落盘保护。');
    } catch (err: any) {
      setSetMasterError(`设置失败: ${err.message}`);
    } finally {
      setIsSettingMaster(false);
    }
  };

  const handleRemoveMasterPassword = async () => {
    const ok = await toast.confirm({
      title: '移除主密码',
      message: '确定要移除主密码吗？移除后密码凭据将以本地未加密形式保存。',
      confirmText: '移除',
      danger: true,
    });
    if (!ok) return;
    sound.playTap();
    db.clearVaultVerifier();
    db.clearPasswordsCiphertext();
    db.savePasswords(passwords);
    setHasMasterPassword(false);
    setMasterKey('');
    setIsVaultUnlocked(true);
    setShowSetMasterModal(false);
    toast.info('已移除主密码，已切换为常规模式。');
  };

  const handleResetVault = () => {
    sound.playTap();
    db.clearVaultVerifier();
    db.clearPasswordsCiphertext();
    db.savePasswords([]);
    onUpdatePasswords([]);
    setHasMasterPassword(false);
    setIsVaultUnlocked(true);
    setMasterKey('');
    setShowResetConfirmModal(false);
    setUnlockInput('');
    setUnlockError('');
    toast.info('密码箱已重置并恢复未加密初始状态。');
  };

  const handleUpdateGoogle = (updated: GoogleWarmingAccount[]) => {
    if (onUpdateGoogleAccounts) {
      onUpdateGoogleAccounts(updated);
    }
    db.saveGoogleAccounts(updated);
  };

  // ── Compact vault-wide stats (single chip strip) ────────────
  const weakCount = passwords.filter(p => calculatePasswordStrength(p.password).score < 40).length;
  const isLocked = hasMasterPassword && !isVaultUnlocked;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden cat-bg-canvas transition-colors">
      {/* Segmented navigation + compact stats strip */}
      <div className="px-4 pt-3 pb-2.5 bg-surface/80 backdrop-blur-2xl border-b border-line/60 shrink-0 space-y-2.5">
        <SegmentedControl
          groupId="vault-subtabs"
          items={SUBTAB_ITEMS}
          value={subTab}
          onChange={handleSwitchSubTab}
        />

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <StatChip icon={KeyRound} value={passwords.length} label="凭据" />
          {weakCount > 0 ? (
            <StatChip icon={AlertTriangle} value={weakCount} label="需强化" iconCls="text-warn" />
          ) : (
            <StatChip icon={ShieldCheck} value="通过" label="安全检测" iconCls="text-ok" />
          )}
          <StatChip icon={ShieldCheck} value={tokens.length} label="2FA" iconCls="text-accent" />
          <StatChip icon={Mail} value={hotmailAccounts.length} label="邮箱" iconCls="text-ok" />
        </div>
      </div>

      {/* Main sub-tab view */}
      {subTab === 'google' ? (
        <React.Suspense fallback={<SubTabLoading />}>
          <GoogleWarmingSection
            accounts={googleAccounts || []}
            onUpdateAccounts={handleUpdateGoogle}
            providers={providers}
            accentColor={accentColor}
          />
        </React.Suspense>
      ) : subTab === 'passwords' && isLocked ? (
        /* ── Locked vault screen (passwords sub-tab only, as before) ── */
        <div className="flex-1 overflow-y-auto px-4 py-10 no-scrollbar">
          <div className="max-w-sm mx-auto text-center space-y-4 select-none">
            <div className="w-16 h-16 rounded-3xl bg-accent/10 text-accent mx-auto flex items-center justify-center">
              <Lock className="w-7 h-7" strokeWidth={1.8} />
            </div>
            <div className="space-y-1">
              <h3 className="text-title font-bold text-ink">猫步安全密码箱已锁定</h3>
              <p className="text-caption text-ink-2">
                已启用 AES-GCM 256 位端到端加密保护，请输入主密码解锁：
              </p>
            </div>

            <form onSubmit={handleUnlockVault} className="space-y-3 text-left">
              <Field label="主密码" required>
                <div className="relative">
                  <Input
                    type={showUnlockPw ? 'text' : 'password'}
                    placeholder="输入主密码..."
                    value={unlockInput}
                    onChange={e => {
                      setUnlockInput(e.target.value);
                      setUnlockError('');
                    }}
                    className="pr-11"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPw(!showUnlockPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink"
                  >
                    {showUnlockPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              {unlockError && <p className="text-caption text-danger font-medium">{unlockError}</p>}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!unlockInput || isUnlocking}
              >
                {isUnlocking ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{isUnlocking ? '正在解密验证...' : '解锁密码箱'}</span>
              </Button>
            </form>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="text-caption text-ink-3 hover:text-danger transition"
              >
                忘记主密码？
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28 no-scrollbar max-w-3xl mx-auto w-full">
          {/* Passwords */}
          {subTab === 'passwords' && (
            <PasswordsSection
              passwords={passwords}
              persistPasswords={persistPasswords}
              hasMasterPassword={hasMasterPassword}
              onLockVault={handleLockVault}
              onOpenMasterModal={() => setShowSetMasterModal(true)}
            />
          )}

          {/* 2FA TOTP */}
          {subTab === '2fa' && <TwoFactorSection tokens={tokens} onUpdateTokens={onUpdateTokens} />}

          {/* Microsoft Hotmail hub */}
          {subTab === 'hotmail' && (
            <HotmailSection accounts={hotmailAccounts} onUpdateAccounts={onUpdateHotmailAccounts} />
          )}
        </div>
      )}

      {/* ── Set / manage master password sheet ──────────────────── */}
      <BottomSheet
        isOpen={showSetMasterModal}
        onClose={() => setShowSetMasterModal(false)}
        title={hasMasterPassword ? '管理安全主密码' : '设置密码箱主密码'}
        subtitle="AES-GCM 256 位军事级加密落盘保护"
      >
        <form onSubmit={handleSaveMasterPassword} className="space-y-4 pb-2">
          <Field label={hasMasterPassword ? '新主密码（至少 6 位）' : '设置主密码（至少 6 位）'} required>
            <Input
              type="password"
              value={newMasterPw}
              onChange={e => {
                setNewMasterPw(e.target.value);
                setSetMasterError('');
              }}
              placeholder="输入强主密码..."
              required
            />
          </Field>

          <Field label="确认主密码" required>
            <Input
              type="password"
              value={confirmMasterPw}
              onChange={e => {
                setConfirmMasterPw(e.target.value);
                setSetMasterError('');
              }}
              placeholder="再次输入主密码..."
              required
            />
          </Field>

          {setMasterError && <p className="text-caption text-danger font-medium">{setMasterError}</p>}

          <div className="pt-1 flex items-center gap-2.5">
            {hasMasterPassword && (
              <Button type="button" variant="danger-soft" size="md" className="flex-1" onClick={handleRemoveMasterPassword}>
                移除主密码
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              disabled={isSettingMaster || !newMasterPw || !confirmMasterPw}
            >
              {isSettingMaster && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>保存并加密</span>
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* ── Reset vault confirmation sheet ──────────────────────── */}
      <BottomSheet
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        title="重置密码箱警告"
        subtitle="端到端零知识加密保护"
      >
        <div className="space-y-4 pb-2">
          <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-caption text-ink-2 leading-relaxed">
            猫步可爱采用端到端零知识 AES-GCM 256 位加密。若忘记主密码，无法通过任何后端找回。重置密码箱将完全抹除已加密的密码数据以保护隐私。
          </p>

          <div className="flex items-center gap-2.5 pt-1">
            <Button type="button" variant="neutral" size="md" className="flex-1" onClick={() => setShowResetConfirmModal(false)}>
              取消
            </Button>
            <Button type="button" variant="danger" size="md" className="flex-1" onClick={handleResetVault}>
              确认抹除重置
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
