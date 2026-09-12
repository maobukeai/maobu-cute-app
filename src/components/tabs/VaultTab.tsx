import React, { useState, useEffect } from 'react';
import {
  PasswordItem,
  TwoFactorToken,
  HotmailAccount,
  AccentColor,
  EmailMessage,
  GoogleWarmingAccount,
  AIProvider,
} from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import {
  generateTOTP,
  parseOtpAuthUri,
  generateStrongPassword,
  calculatePasswordStrength,
  encryptData,
  decryptData,
} from '../../utils/crypto';
import {
  parseBatchHotmailAccounts,
  exportHotmailAccountsToText,
  refreshMicrosoftToken,
  ensureValidAccessToken,
  fetchInboxMessages,
  sendMicrosoftEmail,
} from '../../utils/microsoft';
import { GoogleWarmingSection } from './GoogleWarmingSection';
import {
  KeyRound,
  ShieldCheck,
  Mail,
  Globe,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Trash2,
  Edit3,
  RefreshCw,
  ExternalLink,
  Send,
  Download,
  Upload,
  Clock,
  Sparkles,
  AlertTriangle,
  X,
  Inbox,
  Lock,
  ChevronRight,
  FileText,
  Camera,
  QrCode,
} from 'lucide-react';
import { QRScannerModal } from '../modals/QRScannerModal';
import { parseTwoFactorQR, ParsedTwoFactor } from '../../utils/qr';
import { BottomSheet } from '../common/BottomSheet';
import { SwipeableItem } from '../common/SwipeableItem';
import { haptics } from '../../utils/haptics';

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
  const [subTab, setSubTab] = useState<'passwords' | '2fa' | 'hotmail' | 'google'>(() => {
    return (localStorage.getItem('maobu_vault_subtab') as any) || 'passwords';
  });

  const handleSwitchSubTab = (tab: 'passwords' | '2fa' | 'hotmail' | 'google') => {
    sound.playTap();
    setSubTab(tab);
    localStorage.setItem('maobu_vault_subtab', tab);
  };

  // Common UI feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyWithFeedback = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    haptics.selection();
    sound.playTap();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // -------------------------------------------------------------
  // 1. Passwords State & Handlers
  // -------------------------------------------------------------
  const [passwordSearch, setPasswordSearch] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordItem | null>(null);
  const [selectedPasswordForDetail, setSelectedPasswordForDetail] = useState<PasswordItem | null>(null);
  const [pwCategoryFilter, setPwCategoryFilter] = useState<string>('all');

  // Form
  const [pwTitle, setPwTitle] = useState('');
  const [pwUsername, setPwUsername] = useState('');
  const [pwPassword, setPwPassword] = useState('');
  const [pwWebsite, setPwWebsite] = useState('');
  const [pwCategory, setPwCategory] = useState<'social' | 'email' | 'finance' | 'work' | 'game' | 'other'>('social');
  const [pwNotes, setPwNotes] = useState('');

  // Password Generator Modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPw, setGeneratedPw] = useState('');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-emerald-500" />;
      case 'finance':
        return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      case 'work':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'game':
        return <Sparkles className="w-4 h-4 text-pink-500" />;
      case 'other':
      default:
        return <KeyRound className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'social':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-500';
      case 'email':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500';
      case 'finance':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-500';
      case 'work':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-500';
      case 'game':
        return 'bg-pink-50 dark:bg-pink-950/40 text-pink-500';
      case 'other':
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
    }
  };

  const toggleRevealPassword = (id: string) => {
    sound.playTap();
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddPassword = () => {
    setEditingPassword(null);
    setPwTitle('');
    setPwUsername('');
    setPwPassword('');
    setPwWebsite('');
    setPwCategory('social');
    setPwNotes('');
    setShowPasswordModal(true);
    sound.playTap();
  };

  const handleOpenEditPassword = (p: PasswordItem) => {
    setEditingPassword(p);
    setPwTitle(p.title);
    setPwUsername(p.username);
    setPwPassword(p.password);
    setPwWebsite(p.website || '');
    setPwCategory(p.category);
    setPwNotes(p.notes || '');
    setShowPasswordModal(true);
    sound.playTap();
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

  // Set / Manage Master Password Modal
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
      alert('主密码设置成功！密码箱已启用 AES-GCM 256 位军事级加密落盘保护。');
    } catch (err: any) {
      setSetMasterError(`设置失败: ${err.message}`);
    } finally {
      setIsSettingMaster(false);
    }
  };

  const handleRemoveMasterPassword = async () => {
    if (!confirm('确定要移除主密码吗？移除后密码凭据将以本地未加密形式保存。')) return;
    sound.playTap();
    db.clearVaultVerifier();
    db.clearPasswordsCiphertext();
    db.savePasswords(passwords);
    setHasMasterPassword(false);
    setMasterKey('');
    setIsVaultUnlocked(true);
    setShowSetMasterModal(false);
    alert('已移除主密码，已切换为常规模式。');
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
    alert('密码箱已重置并恢复未加密初始状态。');
  };

  const handleDeletePassword = (id: string) => {
    sound.playTap();
    const updated = passwords.filter(p => p.id !== id);
    persistPasswords(updated);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTitle.trim() || !pwPassword.trim()) return;

    sound.playSuccess();
    const strength = calculatePasswordStrength(pwPassword).label;

    let updated: PasswordItem[];
    if (editingPassword) {
      updated = passwords.map(p =>
        p.id === editingPassword.id
          ? {
              ...p,
              title: pwTitle.trim(),
              username: pwUsername.trim(),
              password: pwPassword,
              website: pwWebsite.trim(),
              category: pwCategory,
              notes: pwNotes.trim(),
              strength,
              updatedAt: new Date().toISOString(),
            }
          : p
      );
    } else {
      const newPw: PasswordItem = {
        id: 'pw_' + Date.now(),
        title: pwTitle.trim(),
        username: pwUsername.trim(),
        password: pwPassword,
        website: pwWebsite.trim(),
        category: pwCategory,
        notes: pwNotes.trim(),
        strength,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newPw, ...passwords];
    }
    persistPasswords(updated);
    setShowPasswordModal(false);
  };

  const handleRunGenerator = () => {
    const pw = generateStrongPassword({
      length: genLength,
      useUpper: genUpper,
      useLower: genLower,
      useNumbers: genNumbers,
      useSymbols: genSymbols,
      avoidAmbiguous: true,
    });
    setGeneratedPw(pw);
  };

  // -------------------------------------------------------------
  // 2. 2FA TOTP State & Handlers
  // -------------------------------------------------------------
  const [totpData, setTotpData] = useState<Record<string, { code: string; remainingSeconds: number; progress: number }>>({});
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [totpIssuer, setTotpIssuer] = useState('');
  const [totpAccount, setTotpAccount] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUriInput, setTotpUriInput] = useState('');

  // 1-second TOTP loop
  useEffect(() => {
    const updateAllTotp = async () => {
      const nextData: Record<string, { code: string; remainingSeconds: number; progress: number }> = {};
      for (const token of tokens) {
        const res = await generateTOTP(token.secret, token.period || 30, token.digits || 6);
        nextData[token.id] = res;
      }
      setTotpData(nextData);
    };

    updateAllTotp();
    const interval = setInterval(updateAllTotp, 1000);
    return () => clearInterval(interval);
  }, [tokens]);

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

  const [showQRScanner, setShowQRScanner] = useState(false);

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
      t => t.secret.toUpperCase() === parsed.secret.toUpperCase() &&
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

  const handleDelete2FA = (id: string) => {
    sound.playTap();
    const updated = tokens.filter(t => t.id !== id);
    onUpdateTokens(updated);
    db.save2FATokens(updated);
  };

  // -------------------------------------------------------------
  // 3. Microsoft Hotmail Hub State & Handlers
  // -------------------------------------------------------------
  const [showHotmailImportModal, setShowHotmailImportModal] = useState(false);
  const [hotmailImportText, setHotmailImportText] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportText, setExportText] = useState('');

  // Account Messages Viewer Modal
  const [viewingAccount, setViewingAccount] = useState<HotmailAccount | null>(null);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailFetchError, setEmailFetchError] = useState<string | null>(null);
  const [mailFolderFilter, setMailFolderFilter] = useState<'all' | 'inbox' | 'junkemail'>('all');

  // Single Email Message Detail Viewer Modal
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [emailBodyViewMode, setEmailBodyViewMode] = useState<'rich' | 'plain'>('rich');

  // Send Email Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTargetAcc, setSendTargetAcc] = useState<HotmailAccount | null>(null);
  const [sendToEmail, setSendToEmail] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendContent, setSendContent] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Mask toggles for Hotmail credentials
  const [revealedHotmail, setRevealedHotmail] = useState<Record<string, boolean>>({});

  const toggleRevealHotmail = (id: string) => {
    sound.playTap();
    setRevealedHotmail(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Refresh and check Hotmail token
  const handleRefreshToken = async (acc: HotmailAccount) => {
    sound.playTap();
    try {
      const res = await refreshMicrosoftToken(acc);
      const tokenExpiresAt = Date.now() + Math.max(300, (res.expiresIn - 60)) * 1000;
      const updated = hotmailAccounts.map(a =>
        a.id === acc.id
          ? {
              ...a,
              accessToken: res.accessToken,
              refreshToken: res.refreshToken || a.refreshToken,
              tokenExpiresAt,
              status: 'valid' as const,
              lastCheckedAt: new Date().toISOString(),
              lastErrorMessage: undefined,
            }
          : a
      );
      onUpdateHotmailAccounts(updated);
      db.saveHotmailAccounts(updated);
      if (viewingAccount?.id === acc.id) {
        setViewingAccount(prev =>
          prev
            ? {
                ...prev,
                accessToken: res.accessToken,
                refreshToken: res.refreshToken || prev.refreshToken,
                tokenExpiresAt,
                status: 'valid',
                lastCheckedAt: new Date().toISOString(),
                lastErrorMessage: undefined,
              }
            : null
        );
      }
      sound.playSuccess();
    } catch (err: any) {
      console.error('Refresh token error:', err);
      const updated = hotmailAccounts.map(a =>
        a.id === acc.id
          ? {
              ...a,
              status: 'error' as const,
              lastCheckedAt: new Date().toISOString(),
              lastErrorMessage: err.message,
            }
          : a
      );
      onUpdateHotmailAccounts(updated);
      db.saveHotmailAccounts(updated);
      if (viewingAccount?.id === acc.id) {
        setViewingAccount(prev =>
          prev
            ? {
                ...prev,
                status: 'error',
                lastCheckedAt: new Date().toISOString(),
                lastErrorMessage: err.message,
              }
            : null
        );
      }
    }
  };

  // View Inbox & Junk Email & Extract codes
  const handleOpenInbox = async (acc: HotmailAccount, folder: 'inbox' | 'junkemail' | 'all' = 'all') => {
    sound.playTap();
    setViewingAccount(acc);
    setIsLoadingEmails(true);
    setEmailFetchError(null);

    try {
      // Ensure valid access token with tokenExpiresAt check
      const { accessToken: token, account: refreshedAcc, refreshed } = await ensureValidAccessToken(acc);
      if (refreshed) {
        const updatedWithRefresh = hotmailAccounts.map(a => (a.id === acc.id ? refreshedAcc : a));
        onUpdateHotmailAccounts(updatedWithRefresh);
        db.saveHotmailAccounts(updatedWithRefresh);
        setViewingAccount(refreshedAcc);
      }

      let msgs: EmailMessage[] = [];
      try {
        msgs = await fetchInboxMessages(token, folder);
      } catch (fetchErr: any) {
        // If 401 or token expired on server side, retry once after force refreshing
        if (
          fetchErr.message?.includes('401') ||
          fetchErr.message?.includes('Unauthorized') ||
          fetchErr.message?.toLowerCase().includes('token')
        ) {
          const forceRefreshed = await refreshMicrosoftToken(acc);
          const newExpiresAt = Date.now() + Math.max(300, (forceRefreshed.expiresIn - 60)) * 1000;
          const retryAccount: HotmailAccount = {
            ...acc,
            accessToken: forceRefreshed.accessToken,
            refreshToken: forceRefreshed.refreshToken || acc.refreshToken,
            tokenExpiresAt: newExpiresAt,
            status: 'valid',
            lastCheckedAt: new Date().toISOString(),
            lastErrorMessage: undefined,
          };
          const updatedWithRetry = hotmailAccounts.map(a => (a.id === acc.id ? retryAccount : a));
          onUpdateHotmailAccounts(updatedWithRetry);
          db.saveHotmailAccounts(updatedWithRetry);
          setViewingAccount(retryAccount);
          msgs = await fetchInboxMessages(forceRefreshed.accessToken, folder);
        } else {
          throw fetchErr;
        }
      }

      const updated = hotmailAccounts.map(a =>
        a.id === acc.id
          ? {
              ...a,
              messages: msgs,
              accessToken: token,
              status: 'valid' as const,
              lastCheckedAt: new Date().toISOString(),
              lastErrorMessage: undefined,
            }
          : a
      );
      onUpdateHotmailAccounts(updated);
      db.saveHotmailAccounts(updated);
      setViewingAccount(prev =>
        prev?.id === acc.id
          ? {
              ...prev,
              messages: msgs,
              accessToken: token,
              status: 'valid',
              lastCheckedAt: new Date().toISOString(),
              lastErrorMessage: undefined,
            }
          : prev
      );
      sound.playSuccess();
    } catch (err: any) {
      console.error('Fetch emails error:', err);
      setEmailFetchError(err.message || '获取邮件失败');
      const updated = hotmailAccounts.map(a =>
        a.id === acc.id ? { ...a, status: 'error' as const, lastErrorMessage: err.message } : a
      );
      onUpdateHotmailAccounts(updated);
      db.saveHotmailAccounts(updated);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Send Email Handler
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTargetAcc || !sendToEmail || !sendSubject) return;

    setIsSendingEmail(true);
    sound.playTap();
    try {
      const { accessToken: token, account: refreshedAcc, refreshed } = await ensureValidAccessToken(sendTargetAcc);
      if (refreshed) {
        const updatedWithRefresh = hotmailAccounts.map(a => (a.id === sendTargetAcc.id ? refreshedAcc : a));
        onUpdateHotmailAccounts(updatedWithRefresh);
        db.saveHotmailAccounts(updatedWithRefresh);
        setSendTargetAcc(refreshedAcc);
      }

      try {
        await sendMicrosoftEmail(token, sendToEmail, sendSubject, sendContent);
      } catch (sendErr: any) {
        // If 401 or token rejected, force refresh token once and retry
        if (
          sendErr.message?.includes('401') ||
          sendErr.message?.includes('Unauthorized') ||
          sendErr.message?.toLowerCase().includes('token')
        ) {
          const forceRefreshed = await refreshMicrosoftToken(sendTargetAcc);
          const newExpiresAt = Date.now() + Math.max(300, (forceRefreshed.expiresIn - 60)) * 1000;
          const retryAccount: HotmailAccount = {
            ...sendTargetAcc,
            accessToken: forceRefreshed.accessToken,
            refreshToken: forceRefreshed.refreshToken || sendTargetAcc.refreshToken,
            tokenExpiresAt: newExpiresAt,
            status: 'valid',
            lastCheckedAt: new Date().toISOString(),
            lastErrorMessage: undefined,
          };
          const updatedWithRetry = hotmailAccounts.map(a => (a.id === sendTargetAcc.id ? retryAccount : a));
          onUpdateHotmailAccounts(updatedWithRetry);
          db.saveHotmailAccounts(updatedWithRetry);
          setSendTargetAcc(retryAccount);
          await sendMicrosoftEmail(forceRefreshed.accessToken, sendToEmail, sendSubject, sendContent);
        } else {
          throw sendErr;
        }
      }

      sound.playSuccess();
      alert('邮件已成功送出！');
      setShowSendModal(false);
      setSendToEmail('');
      setSendSubject('');
      setSendContent('');
    } catch (err: any) {
      alert(`发送失败: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Import Hotmail Text
  const handleImportHotmailSubmit = () => {
    if (!hotmailImportText.trim()) return;
    sound.playSuccess();
    const parsed = parseBatchHotmailAccounts(hotmailImportText);
    if (parsed.length > 0) {
      const updated = [...parsed, ...hotmailAccounts];
      onUpdateHotmailAccounts(updated);
      db.saveHotmailAccounts(updated);
      setShowHotmailImportModal(false);
      setHotmailImportText('');
    } else {
      alert('未识别到有效账号格式，请确认每行格式为：邮箱----密码----Client_ID----Refresh_Token');
    }
  };

  // Pre-fill user sample format in import modal
  const handleFillSample = () => {
    const sample = `sample@hotmail.com----your_password----9e5f94bc-e8a4-4e73-b8be-63364c29d753----M.C514_BL2.0.U.SAMPLE_REFRESH_TOKEN`;
    setHotmailImportText(sample);
  };

  const handleOpenExport = () => {
    sound.playTap();
    const text = exportHotmailAccountsToText(hotmailAccounts);
    setExportText(text);
    setShowExportModal(true);
  };

  const handleDeleteHotmail = (id: string) => {
    sound.playTap();
    const updated = hotmailAccounts.filter(a => a.id !== id);
    onUpdateHotmailAccounts(updated);
    db.saveHotmailAccounts(updated);
  };

  const handleUpdateGoogle = (updated: GoogleWarmingAccount[]) => {
    if (onUpdateGoogleAccounts) {
      onUpdateGoogleAccounts(updated);
    }
    db.saveGoogleAccounts(updated);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden cat-bg-canvas transition-colors">
      {/* iOS Segmented Navigation Header */}
      <div className="p-3 bg-white/80 dark:bg-[#15151C]/80 backdrop-blur-2xl border-b border-zinc-200/60 dark:border-white/5 shrink-0">
        <div className="grid grid-cols-4 gap-1 bg-zinc-100/90 dark:bg-[#1F1F27] p-1 rounded-2xl text-xs select-none border border-zinc-200/40 dark:border-white/5 shadow-inner">
          <button
            onClick={() => handleSwitchSubTab('passwords')}
            className={`py-1.5 rounded-xl font-medium transition-all flex items-center justify-center space-x-1 tactile-press ${
              subTab === 'passwords'
                ? 'bg-white dark:bg-[#2A2A36] text-zinc-900 dark:text-white shadow-ios-sm font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-500" />
            <span>密码箱</span>
          </button>

          <button
            onClick={() => handleSwitchSubTab('2fa')}
            className={`py-1.5 rounded-xl font-medium transition-all flex items-center justify-center space-x-1 tactile-press ${
              subTab === '2fa'
                ? 'bg-white dark:bg-[#2A2A36] text-zinc-900 dark:text-white shadow-ios-sm font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#07C160]" />
            <span>2FA 码</span>
          </button>

          <button
            onClick={() => handleSwitchSubTab('hotmail')}
            className={`py-1.5 rounded-xl font-medium transition-all flex items-center justify-center space-x-1 tactile-press ${
              subTab === 'hotmail'
                ? 'bg-white dark:bg-[#2A2A36] text-zinc-900 dark:text-white shadow-ios-sm font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#FF6B8B]" />
            <span>微软邮箱</span>
          </button>

          <button
            onClick={() => handleSwitchSubTab('google')}
            className={`py-1.5 rounded-xl font-medium transition-all flex items-center justify-center space-x-1 tactile-press ${
              subTab === 'google'
                ? 'bg-white dark:bg-[#2A2A36] text-zinc-900 dark:text-white shadow-ios-sm font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>谷歌养号</span>
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      {subTab === 'google' ? (
        <GoogleWarmingSection
          accounts={googleAccounts || []}
          onUpdateAccounts={handleUpdateGoogle}
          providers={providers}
          accentColor={accentColor}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3.5 pb-24 max-w-5xl mx-auto w-full">
        {/* ========================================================= */}
        {/* SUBTAB 1: PASSWORDS                                       */}
        {/* ========================================================= */}
        {subTab === 'passwords' && (
          hasMasterPassword && !isVaultUnlocked ? (
            <div className="py-12 max-w-sm mx-auto text-center space-y-4 select-none px-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 mx-auto flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  猫步安全密码箱已锁定
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  已启用 AES-GCM 256 位端到端加密保护，请输入主密码解锁：
                </p>
              </div>

              <form onSubmit={handleUnlockVault} className="space-y-3">
                <div className="relative">
                  <input
                    type={showUnlockPw ? 'text' : 'password'}
                    placeholder="输入主密码..."
                    value={unlockInput}
                    onChange={e => {
                      setUnlockInput(e.target.value);
                      setUnlockError('');
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPw(!showUnlockPw)}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                  >
                    {showUnlockPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {unlockError && (
                  <p className="text-xs text-red-500 font-medium">{unlockError}</p>
                )}

                <button
                  type="submit"
                  disabled={!unlockInput || isUnlocking}
                  className="w-full py-2.5 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-2xl text-xs font-bold transition disabled:opacity-50 tactile-press flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  {isUnlocking ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>{isUnlocking ? '正在解密验证...' : '解锁密码箱'}</span>
                </button>
              </form>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="text-[11px] text-zinc-400 hover:text-red-500 transition"
                >
                  忘记主密码？
                </button>
              </div>
            </div>
          ) : (
          <div className="space-y-3 pb-24">
            {/* Bento Security & Summary Grid */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-white/80 dark:bg-[#181820]/80 rounded-2xl p-2 border border-zinc-200/60 dark:border-white/5 shadow-xs">
                <div className="text-[10px] text-zinc-400">全部凭据</div>
                <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{passwords.length}</div>
              </div>
              <div className="bg-white/80 dark:bg-[#181820]/80 rounded-2xl p-2 border border-zinc-200/60 dark:border-white/5 shadow-xs">
                <div className="text-[10px] text-amber-500 font-medium">安全检测</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {passwords.filter(p => calculatePasswordStrength(p.password).score < 40).length === 0 ? '全部达标' : `${passwords.filter(p => calculatePasswordStrength(p.password).score < 40).length} 项需强化`}
                </div>
              </div>
              <div className="bg-white/80 dark:bg-[#181820]/80 rounded-2xl p-2 border border-zinc-200/60 dark:border-white/5 shadow-xs">
                <div className="text-[10px] text-blue-500 font-medium">2FA 口令</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{tokens.length}</div>
              </div>
              <div className="bg-white/80 dark:bg-[#181820]/80 rounded-2xl p-2 border border-zinc-200/60 dark:border-white/5 shadow-xs">
                <div className="text-[10px] text-emerald-500 font-medium">微软邮箱</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{hotmailAccounts.length}</div>
              </div>
            </div>

            {/* Top Toolbar */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex items-center px-3 py-2 bg-white/90 dark:bg-[#181820]/90 rounded-2xl shadow-xs border border-zinc-200/60 dark:border-white/5 text-xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="搜索账号、网站、标题..."
                  value={passwordSearch}
                  onChange={e => setPasswordSearch(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 text-xs"
                />
              </div>

              <button
                onClick={() => {
                  sound.playTap();
                  handleRunGenerator();
                  setShowGenModal(true);
                }}
                className="px-2.5 py-2 bg-white/90 dark:bg-[#181820]/90 text-zinc-700 dark:text-zinc-300 rounded-2xl text-xs font-semibold shadow-xs border border-zinc-200/60 dark:border-white/5 hover:bg-zinc-50 flex items-center space-x-1 tactile-press"
                title="强密码生成器"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>生成</span>
              </button>

              <button
                onClick={handleOpenAddPassword}
                className="px-3 py-2 bg-[#07C160] text-white rounded-2xl text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition flex items-center space-x-1 tactile-press shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增</span>
              </button>

              {hasMasterPassword ? (
                <>
                  <button
                    onClick={handleLockVault}
                    className="p-2 bg-white/90 dark:bg-[#181820]/90 text-zinc-600 dark:text-zinc-300 rounded-2xl text-xs font-semibold shadow-xs border border-zinc-200/60 dark:border-white/5 flex items-center justify-center tactile-press"
                    title="重新锁定密码箱"
                  >
                    <Lock className="w-4 h-4 text-zinc-500" />
                  </button>
                  <button
                    onClick={() => {
                      sound.playTap();
                      setShowSetMasterModal(true);
                    }}
                    className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl text-xs font-semibold shadow-xs flex items-center justify-center tactile-press"
                    title="管理主密码"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    sound.playTap();
                    setShowSetMasterModal(true);
                  }}
                  className="px-2.5 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-2xl text-xs font-semibold shadow-xs hover:bg-amber-100/50 flex items-center space-x-1 tactile-press shrink-0"
                  title="设置主密码加密存储"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>设主密码</span>
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
              {[
                { id: 'all', label: '全部' },
                { id: 'social', label: '社交' },
                { id: 'email', label: '邮箱' },
                { id: 'finance', label: '金融' },
                { id: 'work', label: '工作' },
                { id: 'game', label: '游戏' },
                { id: 'other', label: '其他' },
              ].map(cat => {
                const isActive = pwCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      sound.playTap();
                      setPwCategoryFilter(cat.id);
                    }}
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-all text-xs font-medium tactile-press ${
                      isActive
                        ? 'bg-[var(--theme-accent,#07C160)] text-white font-semibold shadow-xs'
                        : 'bg-white/80 dark:bg-[#181820]/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Apple Passwords Inset Grouped List */}
            {passwords.length === 0 ? (
              <div className="py-14 text-center space-y-2 select-none bg-white/60 dark:bg-[#181820]/60 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center text-2xl">
                  🔑
                </div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">密码保险箱暂无密码</p>
                <button
                  onClick={handleOpenAddPassword}
                  className="text-xs text-[#07C160] font-semibold hover:underline"
                >
                  + 添加第一个密码凭据
                </button>
              </div>
            ) : (() => {
              const q = passwordSearch.toLowerCase();
              const filteredList = passwords.filter(p => {
                const matchesCat = pwCategoryFilter === 'all' || p.category === pwCategoryFilter;
                const matchesQuery = !q || p.title.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || (p.website && p.website.toLowerCase().includes(q));
                return matchesCat && matchesQuery;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-zinc-400 bg-white/60 dark:bg-[#181820]/60 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    未找到匹配该分类或搜索的密码凭据
                  </div>
                );
              }

              return (
                <div className="rounded-2xl bg-white dark:bg-[#181820] divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-200/70 dark:border-white/5 shadow-ios-sm overflow-hidden">
                  {filteredList.map(item => {
                    const strength = calculatePasswordStrength(item.password);
                    return (
                      <SwipeableItem
                        key={item.id}
                        leftAction={{
                          label: '复制密码',
                          icon: <Copy className="w-4 h-4 text-white" />,
                          colorClass: 'bg-[#07C160] text-white',
                          onTrigger: () => copyWithFeedback(item.password, item.id),
                        }}
                        rightActions={[
                          {
                            label: '编辑',
                            icon: <Edit3 className="w-3.5 h-3.5 text-white" />,
                            colorClass: 'bg-blue-500 text-white',
                            onClick: () => handleOpenEditPassword(item),
                          },
                          {
                            label: '删除',
                            icon: <Trash2 className="w-3.5 h-3.5 text-white" />,
                            colorClass: 'bg-red-500 text-white',
                            onClick: () => handleDeletePassword(item.id),
                          },
                        ]}
                        className="bg-transparent"
                      >
                        <div
                          onClick={() => {
                            sound.playTap();
                            setSelectedPasswordForDetail(item);
                          }}
                          className="px-3.5 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 active:bg-zinc-100/70 dark:active:bg-zinc-800/60 transition-colors"
                        >
                          {/* Left Avatar & Details */}
                          <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getCategoryBadgeClass(item.category)}`}>
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                  {item.title}
                                </h4>
                                {strength.score < 40 && (
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                                    需强化
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                                {item.username || '(无用户名)'}
                              </p>
                            </div>
                          </div>

                          {/* Right Quick Action & Chevron */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                copyWithFeedback(item.password, item.id);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-mono hover:bg-zinc-200 dark:hover:bg-zinc-700 tactile-press flex items-center space-x-1"
                              title="复制密码"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3 h-3 text-[#07C160]" />
                                  <span className="text-[#07C160] font-bold">已复制</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>复制</span>
                                </>
                              )}
                            </button>
                            <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                          </div>
                        </div>
                      </SwipeableItem>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          )
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: 2FA TOTP                                        */}
        {/* ========================================================= */}
        {subTab === '2fa' && (
          <div className="space-y-3">
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-white/60 dark:bg-zinc-800/60 p-2.5 rounded-2xl">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">动态口令 (TOTP)</h4>
                <p className="text-[10px] text-zinc-500">RFC 6238 标准 · 30秒循环更新</p>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    sound.playTap();
                    setShowQRScanner(true);
                  }}
                  className="px-3 py-1.5 bg-[#07C160] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#06AD56] active:scale-95 transition flex items-center space-x-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>扫码添加</span>
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    setTotpIssuer('');
                    setTotpAccount('');
                    setTotpSecret('');
                    setTotpUriInput('');
                    setShow2FAModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-200 active:scale-95 transition flex items-center space-x-1"
                  title="手动输入密钥"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>手动添加</span>
                </button>
              </div>
            </div>

            {/* Token Cards */}
            {tokens.length === 0 ? (
              <div className="py-14 text-center space-y-3 select-none">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center text-2xl">
                  ⏱️
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">暂无 2FA 两步验证码</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    兼容 Google Authenticator、GitHub、Binance 等通用 RFC 6238 规范
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setShowQRScanner(true);
                    }}
                    className="px-4 py-2 bg-[#07C160] text-white rounded-xl text-xs font-bold hover:bg-[#06AD56] shadow-sm flex items-center space-x-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>扫码快速添加</span>
                  </button>
                  <button
                    onClick={() => setShow2FAModal(true)}
                    className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 font-semibold hover:underline"
                  >
                    手动输入密钥
                  </button>
                </div>
              </div>
            ) : (
              tokens.map(token => {
                const data = totpData[token.id] || { code: '------', remainingSeconds: 30, progress: 100 };
                const formattedCode =
                  data.code.length === 6
                    ? `${data.code.slice(0, 3)} ${data.code.slice(3)}`
                    : data.code;

                // Color of timer
                const ringColor =
                  data.remainingSeconds > 10
                    ? '#07C160'
                    : data.remainingSeconds > 5
                    ? '#FF9500'
                    : '#FF3B30';

                return (
                  <div
                    key={token.id}
                    onClick={() => copyWithFeedback(data.code, token.id)}
                    className="cat-card p-4 cursor-pointer transition-all duration-200 relative group tactile-press border border-zinc-200/60 dark:border-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">
                          {token.issuer}
                        </span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium mt-0.5">
                          {token.account}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Countdown circle animation */}
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-zinc-100 dark:text-zinc-800"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              stroke={ringColor}
                              strokeWidth="3.5"
                              strokeDasharray={`${data.progress}, 100`}
                              strokeLinecap="round"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              className="transition-all duration-1000 linear"
                            />
                          </svg>
                          <span className="absolute text-[9.5px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                            {data.remainingSeconds}
                          </span>
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete2FA(token.id);
                          }}
                          className="p-1.5 text-zinc-300 hover:text-red-500 rounded-lg transition-colors tactile-press"
                          title="删除令牌"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Big 6-digit Code Display */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="font-mono text-2xl font-black tracking-widest text-zinc-900 dark:text-white">
                        {formattedCode}
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#07C160] transition-all">
                        {copiedId === token.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>已复制！</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-zinc-400 group-hover:text-[#07C160]">点击复制</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 3: MICROSOFT HOTMAIL HUB                            */}
        {/* ========================================================= */}
        {subTab === 'hotmail' && (
          <div className="space-y-3">
            {/* Protocol Action Toolbar */}
            <div className="flex items-center justify-between cat-card p-3.5">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                  <span>微软 Hotmail / Outlook 协议</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100/90 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 font-semibold">
                    支持验证码提取
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  格式：邮箱----密码----ClientID----RefreshToken
                </p>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    sound.playTap();
                    setShowHotmailImportModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl hover:bg-zinc-200 flex items-center space-x-1"
                  title="批量导入"
                >
                  <Upload className="w-3 h-3" />
                  <span>导入</span>
                </button>

                <button
                  onClick={handleOpenExport}
                  className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl hover:bg-zinc-200 flex items-center space-x-1"
                  title="批量导出"
                >
                  <Download className="w-3 h-3" />
                  <span>导出</span>
                </button>
              </div>
            </div>

            {/* Hotmail Accounts List */}
            {hotmailAccounts.length === 0 ? (
              <div className="py-14 text-center space-y-3 select-none">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center text-2xl">
                  📧
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">暂无微软邮箱账号</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    支持通过 RefreshToken 批量托管微软 Hotmail / Outlook 邮箱与自动提取验证码
                  </p>
                </div>
                <button
                  onClick={() => {
                    sound.playTap();
                    setShowHotmailImportModal(true);
                  }}
                  className="px-4 py-2 text-xs text-white bg-[#07C160] rounded-xl font-bold hover:bg-[#06AD56] shadow-sm transition inline-flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>导入微软邮箱账号</span>
                </button>
              </div>
            ) : (
              hotmailAccounts.map(acc => {
                const isRevealed = !!revealedHotmail[acc.id];
                const statusColor =
                  acc.status === 'valid'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                    : acc.status === 'error'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';

                const statusText =
                  acc.status === 'valid'
                    ? '令牌有效 🟢'
                    : acc.status === 'error'
                    ? '检测失败 🔴'
                    : '待验证 ⚪';

                return (
                  <div
                    key={acc.id}
                    className="glass-card p-3.5 rounded-2xl shadow-ios border border-white/80 dark:border-zinc-800/80 space-y-2.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {acc.email}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                        {acc.lastCheckedAt && (
                          <span className="text-[10px] text-zinc-400">
                            上次检测: {new Date(acc.lastCheckedAt).toLocaleTimeString()}
                          </span>
                        )}
                        {acc.lastErrorMessage && (
                          <p className="text-[10px] text-red-500 mt-0.5 line-clamp-1">
                            {acc.lastErrorMessage}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteHotmail(acc.id)}
                        className="p-1 text-zinc-400 hover:text-red-500"
                        title="删除账号"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Credentials Preview (Masked) */}
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>密码: {isRevealed ? acc.password : '••••••••'}</span>
                        <button
                          onClick={() => toggleRevealHotmail(acc.id)}
                          className="text-zinc-400 hover:text-zinc-600"
                        >
                          {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        Client ID: {acc.clientId || '默认'}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        Token: {isRevealed ? acc.refreshToken : acc.refreshToken.slice(0, 15) + '...'}
                      </div>
                    </div>

                    {/* Action Buttons: Refresh Token, Inbox, Send */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() => handleRefreshToken(acc)}
                        className="py-1.5 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1"
                        title="刷新并测通令牌"
                      >
                        <RefreshCw className="w-3 h-3 text-blue-500" />
                        <span>测通令牌</span>
                      </button>

                      <button
                        onClick={() => handleOpenInbox(acc)}
                        className="py-1.5 px-2 bg-[#07C160] hover:bg-[#06AD56] text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1 shadow-sm"
                        title="查看邮件与提取验证码"
                      >
                        <Inbox className="w-3 h-3" />
                        <span>收件/提取码</span>
                      </button>

                      <button
                        onClick={() => {
                          setSendTargetAcc(acc);
                          setShowSendModal(true);
                          sound.playTap();
                        }}
                        className="py-1.5 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1"
                        title="快速发信"
                      >
                        <Send className="w-3 h-3 text-[#FF6B8B]" />
                        <span>发信</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      )}

      {/* ========================================================= */}
      {/* MODALS SECTION                                            */}
      {/* ========================================================= */}

      {/* 1. Add / Edit Password BottomSheet */}
      <BottomSheet
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={editingPassword ? '编辑密码凭证' : '存入新密码'}
      >
        <form onSubmit={handleSavePassword} className="space-y-2.5 pb-2">
          <div>
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">标题 / 平台名称 *</label>
            <input
              type="text"
              required
              placeholder="例如：微信、GitHub、Steam..."
              value={pwTitle}
              onChange={e => setPwTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">用户名 / 账号</label>
              <input
                type="text"
                placeholder="用户名或邮箱"
                value={pwUsername}
                onChange={e => setPwUsername(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">分类</label>
              <select
                value={pwCategory}
                onChange={e => setPwCategory(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
              >
                <option value="social">社交应用</option>
                <option value="email">电子邮箱</option>
                <option value="finance">金融资产</option>
                <option value="work">工作办公</option>
                <option value="game">游戏娱乐</option>
                <option value="other">其他分类</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">密码 *</label>
              <button
                type="button"
                onClick={() => {
                  const newPw = generateStrongPassword({
                    length: 16,
                    useUpper: true,
                    useLower: true,
                    useNumbers: true,
                    useSymbols: true,
                    avoidAmbiguous: true,
                  });
                  setPwPassword(newPw);
                }}
                className="text-[11px] text-[#07C160] hover:underline"
              >
                随机生成强密码
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="输入或生成密码"
              value={pwPassword}
              onChange={e => setPwPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 font-mono text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">网站 URL (选填)</label>
            <input
              type="text"
              placeholder="https://example.com"
              value={pwWebsite}
              onChange={e => setPwWebsite(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#07C160] text-white shadow-sm"
            >
              保存凭证
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* 2. Strong Password Generator BottomSheet */}
      <BottomSheet
        isOpen={showGenModal}
        onClose={() => setShowGenModal(false)}
        title="强密码随机生成器"
      >
        <div className="space-y-3 pb-2">
          {/* Generated Password Box */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-between font-mono text-sm">
            <span className="truncate select-all text-zinc-900 dark:text-zinc-100 font-bold">
              {generatedPw}
            </span>
            <button
              onClick={() => copyWithFeedback(generatedPw, 'gen_pw')}
              className="p-1.5 text-zinc-500 hover:text-[#07C160]"
              title="复制"
            >
              {copiedId === 'gen_pw' ? <Check className="w-4 h-4 text-[#07C160]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Controls */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span>密码长度：{genLength}</span>
              <input
                type="range"
                min="8"
                max="32"
                value={genLength}
                onChange={e => {
                  setGenLength(Number(e.target.value));
                  handleRunGenerator();
                }}
                className="w-36"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genUpper}
                  onChange={e => {
                    setGenUpper(e.target.checked);
                    handleRunGenerator();
                  }}
                  className="rounded text-[#07C160]"
                />
                <span>大写字母 (A-Z)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genLower}
                  onChange={e => {
                    setGenLower(e.target.checked);
                    handleRunGenerator();
                  }}
                  className="rounded text-[#07C160]"
                />
                <span>小写字母 (a-z)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genNumbers}
                  onChange={e => {
                    setGenNumbers(e.target.checked);
                    handleRunGenerator();
                  }}
                  className="rounded text-[#07C160]"
                />
                <span>数字 (0-9)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genSymbols}
                  onChange={e => {
                    setGenSymbols(e.target.checked);
                    handleRunGenerator();
                  }}
                  className="rounded text-[#07C160]"
                />
                <span>特殊符号 (!@#)</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={handleRunGenerator}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
            >
              🔄 重新生成
            </button>
            <button
              type="button"
              onClick={() => {
                setPwPassword(generatedPw);
                setShowGenModal(false);
                setShowPasswordModal(true);
              }}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#07C160] text-white shadow-sm"
            >
              使用此密码
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* 3. Add 2FA Token BottomSheet */}
      <BottomSheet
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        title="添加 2FA 双重身份令牌"
      >
        <div className="space-y-3 pb-2">
          {/* Quick QR Scanner Trigger Banner */}
          <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border border-green-200/80 dark:border-green-800/50 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-[#07C160] text-white rounded-xl shadow-xs shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  一键扫码或识别二维码图片
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  支持摄像头实时扫描、本地截图识别与剪贴板
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setShowQRScanner(true);
              }}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-[#07C160] text-xs font-bold rounded-xl shadow-xs border border-green-200 dark:border-green-800/60 transition shrink-0"
            >
              立即扫码
            </button>
          </div>

          <form onSubmit={handleAdd2FAToken} className="space-y-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">或快速粘贴 otpauth:// 链接 / Base32 密钥</label>
              <input
                type="text"
                placeholder="otpauth://totp/GitHub:user?secret=... 或直接粘贴密钥"
                value={totpUriInput}
                onChange={e => handleParseUri(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">发行平台 (Issuer) *</label>
                <input
                  type="text"
                  required
                  placeholder="如: Google, GitHub"
                  value={totpIssuer}
                  onChange={e => setTotpIssuer(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">账号标识</label>
                <input
                  type="text"
                  placeholder="如: your_name@email"
                  value={totpAccount}
                  onChange={e => setTotpAccount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Base32 密钥 (Secret) *</label>
              <input
                type="text"
                required
                placeholder="如: JBSWY3DPEHPK3PXP"
                value={totpSecret}
                onChange={e => setTotpSecret(e.target.value)}
                className="w-full mt-1 px-3 py-2 font-mono text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShow2FAModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#07C160] text-white shadow-sm"
              >
                添加动态码
              </button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Password Detail BottomSheet (Apple Passwords Style) */}
      <BottomSheet
        isOpen={!!selectedPasswordForDetail}
        onClose={() => setSelectedPasswordForDetail(null)}
        title={selectedPasswordForDetail?.title}
        subtitle={`${selectedPasswordForDetail?.category?.toUpperCase()} · 凭据详情`}
        headerRight={
          selectedPasswordForDetail && (
            <button
              onClick={() => {
                handleOpenEditPassword(selectedPasswordForDetail);
                setSelectedPasswordForDetail(null);
              }}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 px-2 py-1"
            >
              编辑
            </button>
          )
        }
      >
        {selectedPasswordForDetail && (
          <div className="space-y-3 pb-3">
            {/* Header Identity Card */}
            <div className="flex items-center space-x-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-white/5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${getCategoryBadgeClass(selectedPasswordForDetail.category)}`}>
                {getCategoryIcon(selectedPasswordForDetail.category)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedPasswordForDetail.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {selectedPasswordForDetail.website || selectedPasswordForDetail.category}
                </p>
              </div>
            </div>

            {/* Inset Group: Credentials */}
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 divide-y divide-zinc-200/60 dark:divide-zinc-700/60 border border-zinc-100 dark:border-white/5 overflow-hidden text-xs">
              {/* Username row */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">用户名 / 账号</div>
                  <div className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {selectedPasswordForDetail.username || '(未填写)'}
                  </div>
                </div>
                {selectedPasswordForDetail.username && (
                  <button
                    onClick={() => copyWithFeedback(selectedPasswordForDetail.username, 'detail_user')}
                    className="p-1.5 text-zinc-400 hover:text-[#07C160] rounded-lg tactile-press"
                    title="复制账号"
                  >
                    {copiedId === 'detail_user' ? <Check className="w-3.5 h-3.5 text-[#07C160]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Password row */}
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">密码凭据</div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleRevealPassword(selectedPasswordForDetail.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 tactile-press"
                      title={revealedPasswords[selectedPasswordForDetail.id] ? '隐藏密码' : '显示密码'}
                    >
                      {revealedPasswords[selectedPasswordForDetail.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyWithFeedback(selectedPasswordForDetail.password, 'detail_pw')}
                      className="p-1 text-zinc-400 hover:text-[#07C160] tactile-press"
                      title="复制密码"
                    >
                      {copiedId === 'detail_pw' ? <Check className="w-3.5 h-3.5 text-[#07C160]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="font-mono text-xs sm:text-sm tracking-wider text-zinc-900 dark:text-zinc-100 break-all select-all">
                  {revealedPasswords[selectedPasswordForDetail.id]
                    ? selectedPasswordForDetail.password
                    : '••••••••••••••••'}
                </div>
                <div className="flex items-center space-x-2 pt-1 text-[11px] text-zinc-400">
                  <span>密码强度：</span>
                  {(() => {
                    const st = calculatePasswordStrength(selectedPasswordForDetail.password);
                    const labelMap: Record<string, string> = {
                      very_strong: '极强',
                      strong: '高强度',
                      fair: '中等',
                      weak: '需强化',
                    };
                    return (
                      <span className="font-semibold" style={{ color: st.color }}>
                        {labelMap[st.label] || '未知'} ({st.score}分)
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Website row */}
              {selectedPasswordForDetail.website && (
                <div className="p-3 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider">关联网址</div>
                    <div className="text-xs text-blue-500 truncate mt-0.5">
                      {selectedPasswordForDetail.website}
                    </div>
                  </div>
                  <a
                    href={selectedPasswordForDetail.website.startsWith('http') ? selectedPasswordForDetail.website : `https://${selectedPasswordForDetail.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg tactile-press"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Notes Section */}
            {selectedPasswordForDetail.notes && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-white/5 space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">备注信息</div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedPasswordForDetail.notes}
                </p>
              </div>
            )}

            {/* Danger Zone */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  handleDeletePassword(selectedPasswordForDetail.id);
                  setSelectedPasswordForDetail(null);
                }}
                className="w-full py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-100 dark:hover:bg-red-950/50 transition tactile-press"
              >
                删除此密码凭据
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 4. Hotmail Batch Import BottomSheet */}
      <BottomSheet
        isOpen={showHotmailImportModal}
        onClose={() => setShowHotmailImportModal(false)}
        title="批量导入微软邮箱账号"
        subtitle="每行一条，格式：邮箱----密码----ClientID----RefreshToken"
      >
        <div className="space-y-3 pb-2">
          <textarea
            rows={6}
            placeholder="在此粘贴账号列表..."
            value={hotmailImportText}
            onChange={e => setHotmailImportText(e.target.value)}
            className="w-full p-3 font-mono text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              支持以 ----、--- 或制表符分隔
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowHotmailImportModal(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleImportHotmailSubmit}
                className="px-5 py-1.5 text-xs font-semibold rounded-xl bg-[#07C160] text-white shadow-sm"
              >
                解析并导入
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* 5. Hotmail Export BottomSheet */}
      <BottomSheet
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="导出微软邮箱账号凭据"
        subtitle="将已保存的邮箱账户凭据导出为文本"
      >
        <div className="space-y-3 pb-2">
          <textarea
            readOnly
            rows={6}
            value={exportText}
            className="w-full p-3 font-mono text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-zinc-900 dark:text-zinc-100 select-all leading-relaxed"
          />
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => copyWithFeedback(exportText, 'export_text')}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
            >
              {copiedId === 'export_text' ? '已复制！' : '复制全部'}
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hotmail_accounts_${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#07C160] text-white shadow-sm"
            >
              保存为 TXT 文件
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* 6. Hotmail Inbox & Verification Code Viewer BottomSheet */}
      <BottomSheet
        isOpen={!!viewingAccount}
        onClose={() => setViewingAccount(null)}
        title={viewingAccount?.email}
        subtitle="收件箱与短信提取 · 自动识别动态验证码"
        maxHeight="max-h-[92dvh]"
        headerRight={
          viewingAccount && (
            <button
              onClick={() => handleOpenInbox(viewingAccount)}
              className="p-1.5 text-zinc-500 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="刷新邮件"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
            </button>
          )
        }
      >
        {viewingAccount && (
          <div className="space-y-3 pb-3">
            {/* Folder Filter Tabs (Inbox vs Junk vs All) */}
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs">
                {[
                  { id: 'all', label: '📑 全部', count: (viewingAccount.messages || []).length },
                  { id: 'inbox', label: '📥 收件箱', count: (viewingAccount.messages || []).filter(m => m.folder !== 'junkemail').length },
                  { id: 'junkemail', label: '🗑️ 垃圾邮件', count: (viewingAccount.messages || []).filter(m => m.folder === 'junkemail').length },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      sound.playTap();
                      setMailFolderFilter(f.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-xl font-semibold transition text-xs flex items-center space-x-1 ${
                      mailFolderFilter === f.id
                        ? f.id === 'junkemail'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                        : 'bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300/70'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className="text-[10px] opacity-80">({f.count})</span>
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
                垃圾箱验证码自适配
              </span>
            </div>

            {/* Email List & Extracted Codes */}
            <div className="space-y-3">
              {emailFetchError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl text-xs text-red-600 dark:text-red-300">
                  ⚠️ {emailFetchError}
                </div>
              )}

              {isLoadingEmails ? (
                <div className="py-20 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-[#07C160] animate-spin mx-auto" />
                  <p className="text-xs text-zinc-500">正在并发检索收件箱与垃圾邮件箱...</p>
                </div>
              ) : viewingAccount.messages && viewingAccount.messages.length > 0 ? (
                viewingAccount.messages
                  .filter(msg => {
                    if (mailFolderFilter === 'inbox') return msg.folder !== 'junkemail';
                    if (mailFolderFilter === 'junkemail') return msg.folder === 'junkemail';
                    return true;
                  })
                  .map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedEmail(msg);
                    }}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all active:scale-[0.99] group"
                  >
                    {/* Top row: Sender & Folder Badge & Date */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {msg.fromName || msg.from}
                        </span>
                        {msg.folder === 'junkemail' ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold shrink-0">
                            🗑️ 垃圾邮件
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-medium shrink-0">
                            📥 收件箱
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
                        {msg.receivedDateTime ? new Date(msg.receivedDateTime).toLocaleString() : ''}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {msg.subject}
                    </h5>

                    {/* Extracted Verification Code Banner */}
                    {msg.extractedCode && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/40 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-green-700 dark:text-green-300">
                            🔑 识别到验证码：
                          </span>
                          <span className="font-mono text-base font-extrabold text-green-600 dark:text-green-400 tracking-wider">
                            {msg.extractedCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyWithFeedback(msg.extractedCode!, msg.id + '_code')}
                          className="px-2.5 py-1 bg-[#07C160] hover:bg-[#06AD56] text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1"
                        >
                          {copiedId === msg.id + '_code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === msg.id + '_code' ? '已复制' : '一键复制'}</span>
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {msg.bodyPreview}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-blue-600 dark:text-blue-400 font-medium border-t border-zinc-100 dark:border-zinc-700/40">
                      <span className="flex items-center space-x-1">
                        <span>点击阅读完整邮件详情</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {msg.bodyHtml ? '完整网页格式' : '纯文本'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center space-y-2">
                  <Mail className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500">
                    {mailFolderFilter === 'junkemail' ? '垃圾邮件箱中暂无邮件' : '暂无新邮件'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 7. Send Email BottomSheet */}
      <BottomSheet
        isOpen={showSendModal && !!sendTargetAcc}
        onClose={() => setShowSendModal(false)}
        title="通过微软 Hotmail 发送邮件"
        subtitle={`发件人：${sendTargetAcc?.email}`}
      >
        {sendTargetAcc && (
          <form onSubmit={handleSendEmail} className="space-y-3 pb-2">
            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">收件人邮箱 *</label>
              <input
                type="email"
                required
                placeholder="recipient@example.com"
                value={sendToEmail}
                onChange={e => setSendToEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">邮件主题 *</label>
              <input
                type="text"
                required
                placeholder="请输入邮件主题"
                value={sendSubject}
                onChange={e => setSendSubject(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">正文内容</label>
              <textarea
                rows={4}
                placeholder="输入邮件文本内容..."
                value={sendContent}
                onChange={e => setSendContent(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-zinc-900 dark:text-zinc-100 resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSendingEmail}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#07C160] text-white shadow-sm flex items-center space-x-1.5"
              >
                {isSendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSendingEmail ? '正在发送...' : '发送邮件'}</span>
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* 8. Single Email Message Detail Viewer BottomSheet */}
      <BottomSheet
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        title={selectedEmail?.subject || '(无主题)'}
        subtitle={`发件人：${selectedEmail?.from}`}
        maxHeight="max-h-[92dvh]"
        footer={
          selectedEmail && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const fullText = `主题: ${selectedEmail.subject}\n发件人: ${selectedEmail.from}\n时间: ${selectedEmail.receivedDateTime}\n\n${selectedEmail.bodyText || selectedEmail.bodyPreview || ''}`;
                  copyWithFeedback(fullText, 'full_email_text');
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 transition flex items-center space-x-1"
              >
                {copiedId === 'full_email_text' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'full_email_text' ? '已复制' : '复制全文'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="px-5 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm hover:opacity-90 transition"
              >
                关闭
              </button>
            </div>
          )
        }
      >
        {selectedEmail && (
          <div className="space-y-3 pb-2">
            {/* Sender / Recipient Information */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 truncate">
                <span className="text-zinc-400 font-medium">发件人:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.from}>` : selectedEmail.from}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyWithFeedback(selectedEmail.from, 'sender_email')}
                className="text-[10px] text-zinc-500 hover:text-blue-600 shrink-0 ml-2"
              >
                {copiedId === 'sender_email' ? '已复制' : '复制'}
              </button>
            </div>

            {/* Extracted Code Highlight if any */}
            {selectedEmail.extractedCode && (
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-200 dark:border-green-800/50 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-green-500 text-white shadow-xs">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-green-700 dark:text-green-300">
                      动态验证码
                    </div>
                    <div className="font-mono text-lg font-black text-green-600 dark:text-green-400 tracking-wider">
                      {selectedEmail.extractedCode}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyWithFeedback(selectedEmail.extractedCode!, 'modal_code')}
                  className="px-3 py-1.5 bg-[#07C160] hover:bg-[#06AD56] text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1"
                >
                  {copiedId === 'modal_code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'modal_code' ? '已复制' : '一键复制'}</span>
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            {selectedEmail.bodyHtml && (
              <div className="flex items-center justify-end space-x-1">
                <button
                  type="button"
                  onClick={() => setEmailBodyViewMode('rich')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    emailBodyViewMode === 'rich'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  网页视图
                </button>
                <button
                  type="button"
                  onClick={() => setEmailBodyViewMode('plain')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    emailBodyViewMode === 'plain'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  纯文本
                </button>
              </div>
            )}

            {/* Email Full Content Area */}
            <div className="select-text">
              {selectedEmail.bodyHtml && emailBodyViewMode === 'rich' ? (
                <div
                  className="prose dark:prose-invert max-w-none text-xs leading-relaxed overflow-x-auto bg-white dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans">
                  {selectedEmail.bodyText || selectedEmail.bodyPreview || '暂无更多正文内容'}
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 9. 2FA QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleScanQRSuccess}
      />

      {/* 10. Master Password Setup & Management BottomSheet */}
      <BottomSheet
        isOpen={showSetMasterModal}
        onClose={() => setShowSetMasterModal(false)}
        title={hasMasterPassword ? '管理安全主密码' : '设置密码箱主密码'}
        subtitle="AES-GCM 256 位军事级加密落盘保护"
      >
        <form onSubmit={handleSaveMasterPassword} className="space-y-3 pb-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {hasMasterPassword ? '新主密码' : '设置主密码'} (至少6位)
            </label>
            <input
              type="password"
              value={newMasterPw}
              onChange={e => {
                setNewMasterPw(e.target.value);
                setSetMasterError('');
              }}
              placeholder="输入强主密码..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              确认主密码
            </label>
            <input
              type="password"
              value={confirmMasterPw}
              onChange={e => {
                setConfirmMasterPw(e.target.value);
                setSetMasterError('');
              }}
              placeholder="再次输入主密码..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>

          {setMasterError && (
            <p className="text-xs text-red-500 font-medium">{setMasterError}</p>
          )}

          <div className="pt-2 flex items-center space-x-2">
            {hasMasterPassword && (
              <button
                type="button"
                onClick={handleRemoveMasterPassword}
                className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl hover:bg-red-100 transition"
              >
                移除主密码
              </button>
            )}
            <button
              type="submit"
              disabled={isSettingMaster || !newMasterPw || !confirmMasterPw}
              className="flex-1 py-2 text-xs font-bold text-white bg-[#07C160] hover:bg-[#06AD56] rounded-xl transition disabled:opacity-50 flex items-center justify-center space-x-1 shadow-sm"
            >
              {isSettingMaster && <RefreshCw className="w-3 h-3 animate-spin" />}
              <span>保存并加密</span>
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* 11. Reset Vault Confirmation BottomSheet */}
      <BottomSheet
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        title="重置密码箱警告"
        subtitle="端到端零知识加密保护"
      >
        <div className="space-y-4 pb-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-500 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed text-left">
            猫步可爱采用端到端零知识 AES-GCM 256 位加密。若忘记主密码，无法通过任何后端找回。重置密码箱将完全抹除已加密的密码数据以保护隐私。
          </p>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(false)}
              className="flex-1 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleResetVault}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs"
            >
              确认抹除重置
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
