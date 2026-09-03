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
} from '../../utils/crypto';
import {
  parseBatchHotmailAccounts,
  exportHotmailAccountsToText,
  refreshMicrosoftToken,
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

  const handleDeletePassword = (id: string) => {
    sound.playTap();
    const updated = passwords.filter(p => p.id !== id);
    onUpdatePasswords(updated);
    db.savePasswords(updated);
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
    onUpdatePasswords(updated);
    db.savePasswords(updated);
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
      const updated = hotmailAccounts.map(a =>
        a.id === acc.id
          ? {
              ...a,
              accessToken: res.accessToken,
              refreshToken: res.refreshToken || a.refreshToken,
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
      // Ensure valid access token
      let token = acc.accessToken;
      if (!token) {
        const refreshed = await refreshMicrosoftToken(acc);
        token = refreshed.accessToken;
      }

      const msgs = await fetchInboxMessages(token, folder);
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
      let token = sendTargetAcc.accessToken;
      if (!token) {
        const refreshed = await refreshMicrosoftToken(sendTargetAcc);
        token = refreshed.accessToken;
      }

      await sendMicrosoftEmail(token, sendToEmail, sendSubject, sendContent);
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
    const sample = `gkyhnzrzwmw@hotmail.com----zzbaftapfhdm53----9e5f94bc-e8a4-4e73-b8be-63364c29d753----M.C514_BL2.0.U.MsaArtifacts.-Cjmy*zba8h9bSZ9gmInf!apAEU0mODjiG5OGR5AeiPmzKVGnCGUgNPg1Nbx!q2O4qwJGI6Ip5HQe6y3kzw1B6hNEMcEn9*ttWvEv2Ykw2p9OizxlOA5Uv1TjzvUBWsAqwXyMz5ZDWnHjiIC07XTn!QwOtTNImxIe7bUdUgszWNQRjP*RmACm4jL2jgkESPdRl4kSHjqYfRYFTo1AwoYls2vymWFJ7rLVOU*lwJ!0ERLFEuAZKw89tPFzfOEzfxMh*3H2UskQlRZ1!5eRsbdnTIxAol9Yw*X1!NlzaWaMoaesCRjwSHhYC9jN1z6GdtEuyn!VU*dwr8yXNPQQhfASsKkoYchfsdVEnkFLqPEwaVSVBlPZq1BhDAkAssks*RSc1mbetXKg6egXmKEVR8H5WaRVtOIopAcX3WntB7HZNWmOvBdRG7sEDupe0FH65LLE0w$$`;
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
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        {/* ========================================================= */}
        {/* SUBTAB 1: PASSWORDS                                       */}
        {/* ========================================================= */}
        {subTab === 'passwords' && (
          <div className="space-y-3">
            {/* Top Toolbar */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex items-center px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-xl shadow-xs text-xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="搜索账号、网站、标题..."
                  value={passwordSearch}
                  onChange={e => setPasswordSearch(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
                />
              </div>

              <button
                onClick={() => {
                  sound.playTap();
                  handleRunGenerator();
                  setShowGenModal(true);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold shadow-xs hover:bg-zinc-50 flex items-center space-x-1"
                title="强密码生成器"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>生成</span>
              </button>

              <button
                onClick={handleOpenAddPassword}
                className="px-3 py-1.5 bg-[#07C160] text-white rounded-xl text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增</span>
              </button>
            </div>

            {/* Passwords List */}
            {passwords.length === 0 ? (
              <div className="py-14 text-center space-y-2 select-none">
                <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800 mx-auto flex items-center justify-center text-2xl">
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
            ) : (
              passwords
                .filter(p => {
                  const q = passwordSearch.toLowerCase();
                  return (
                    !q ||
                    p.title.toLowerCase().includes(q) ||
                    p.username.toLowerCase().includes(q) ||
                    (p.website && p.website.toLowerCase().includes(q))
                  );
                })
                .map(item => {
                  const isRevealed = !!revealedPasswords[item.id];
                  return (
                      <div
                        key={item.id}
                        className="cat-card p-4 transition-all duration-200 space-y-2.5 relative group"
                      >
                        {/* Title Row */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                              <span>{item.title}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 font-medium">
                                {item.category}
                              </span>
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              账号：{item.username || '(未填写用户名)'}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleOpenEditPassword(item)}
                              className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg transition-colors tactile-press"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePassword(item.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition-colors tactile-press"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Password Field Bar */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 dark:bg-[#121217] rounded-xl font-mono text-xs border border-zinc-200/50 dark:border-white/5">
                          <span className="truncate text-zinc-800 dark:text-zinc-200 tracking-wider">
                            {isRevealed ? item.password : '••••••••••••••••'}
                          </span>
                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            <button
                              onClick={() => toggleRevealPassword(item.id)}
                              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 tactile-press"
                              title={isRevealed ? '隐藏密码' : '显示密码'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => copyWithFeedback(item.password, item.id)}
                              className="text-zinc-400 hover:text-[#07C160] tactile-press"
                              title="复制密码"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-[#07C160]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Notes / Website */}
                        {item.website && (
                          <div className="text-[11px] text-zinc-400 truncate">
                            网站：<a href={item.website.startsWith('http') ? item.website : `https://${item.website}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{item.website}</a>
                          </div>
                        )}
                      </div>
                  );
                })
            )}
          </div>
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

      {/* 1. Add / Edit Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingPassword ? '编辑密码凭证' : '存入新密码'}
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="mt-3 space-y-2.5">
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
          </div>
        </div>
      )}

      {/* 2. Strong Password Generator Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>强密码随机生成器</span>
              </h3>
              <button onClick={() => setShowGenModal(false)} className="text-zinc-400 hover:bg-zinc-100 p-1 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

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
        </div>
      )}

      {/* 3. Add 2FA Token Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                添加 2FA 双重身份令牌
              </h3>
              <button onClick={() => setShow2FAModal(false)} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

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
        </div>
      )}

      {/* 4. Hotmail Batch Import Modal */}
      {showHotmailImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  批量导入微软邮箱账号
                </h3>
                <p className="text-[11px] text-zinc-400">
                  每行一条，格式：邮箱----密码----ClientID----RefreshToken
                </p>
              </div>
              <button onClick={() => setShowHotmailImportModal(false)} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={6}
              placeholder="在此粘贴账号列表..."
              value={hotmailImportText}
              onChange={e => setHotmailImportText(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">
                支持以 ----、--- 或制表符分隔各字段
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
        </div>
      )}

      {/* 5. Hotmail Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                导出微软邮箱账号凭据
              </h3>
              <button onClick={() => setShowExportModal(false)} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              readOnly
              rows={6}
              value={exportText}
              className="w-full p-3 font-mono text-xs rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 select-all leading-relaxed"
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
        </div>
      )}

      {/* 6. Hotmail Inbox & Verification Code Viewer Modal */}
      {viewingAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl h-[85vh] bg-white dark:bg-[#1C1C1E] rounded-3xl flex flex-col shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {viewingAccount.email}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 font-semibold">
                    收件箱与短信提取
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  自动识别提取邮件内的数字动态验证码
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenInbox(viewingAccount)}
                  className="p-1.5 text-zinc-500 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="刷新邮件"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setViewingAccount(null)}
                  className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Folder Filter Tabs (Inbox vs Junk vs All) */}
            <div className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
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

              <span className="text-[10px] text-zinc-400 font-medium">
                垃圾箱验证码自适配
              </span>
            </div>

            {/* Email List & Extracted Codes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {emailFetchError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl text-xs text-red-600 dark:text-red-300">
                  ⚠️ {emailFetchError}
                </div>
              )}

              {isLoadingEmails ? (
                <div className="py-20 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-[#07C160] animate-spin mx-auto" />
                  <p className="text-xs text-zinc-500">正在通过微软 Graph 接口并发检索收件箱与垃圾邮件箱...</p>
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

                    {/* Extracted Verification Code Banner (Feature Highlight!) */}
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

                    {/* Preview Text */}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {msg.bodyPreview}
                    </p>

                    {/* Click prompt */}
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
        </div>
      )}

      {/* 7. Send Email Modal */}
      {showSendModal && sendTargetAcc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  通过微软 Hotmail 发送邮件
                </h3>
                <p className="text-[11px] text-zinc-400">发件人：{sendTargetAcc.email}</p>
              </div>
              <button onClick={() => setShowSendModal(false)} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-2.5">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">收件人邮箱 *</label>
                <input
                  type="email"
                  required
                  placeholder="recipient@example.com"
                  value={sendToEmail}
                  onChange={e => setSendToEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
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
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">正文内容</label>
                <textarea
                  rows={4}
                  placeholder="输入邮件文本内容..."
                  value={sendContent}
                  onChange={e => setSendContent(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 resize-none"
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
          </div>
        </div>
      )}

      {/* 8. Single Email Message Detail Viewer Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-3xl flex flex-col shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-800/40">
              <div className="min-w-0 pr-3 space-y-1">
                <div className="flex items-center space-x-2">
                  {selectedEmail.folder === 'junkemail' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                      🗑️ 垃圾邮件
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold shrink-0">
                      📥 收件箱
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400">
                    {selectedEmail.receivedDateTime ? new Date(selectedEmail.receivedDateTime).toLocaleString() : ''}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                  {selectedEmail.subject}
                </h4>
              </div>

              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender / Recipient Information Bar */}
            <div className="px-4 py-2.5 bg-zinc-100/60 dark:bg-zinc-800/60 border-b border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
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
                {copiedId === 'sender_email' ? '已复制' : '复制发件人'}
              </button>
            </div>

            {/* Extracted Code Highlight if any */}
            {selectedEmail.extractedCode && (
              <div className="p-3 mx-4 my-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-200 dark:border-green-800/50 rounded-2xl flex items-center justify-between shadow-xs shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-green-500 text-white shadow-xs">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-green-700 dark:text-green-300">
                      识别到动态安全验证码 / 提取码
                    </div>
                    <div className="font-mono text-lg font-black text-green-600 dark:text-green-400 tracking-wider">
                      {selectedEmail.extractedCode}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyWithFeedback(selectedEmail.extractedCode!, 'modal_code')}
                  className="px-3 py-1.5 bg-[#07C160] hover:bg-[#06AD56] text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1 active:scale-95 transition"
                >
                  {copiedId === 'modal_code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'modal_code' ? '已复制' : '一键复制验证码'}</span>
                </button>
              </div>
            )}

            {/* View Mode Toggle (if HTML exists) */}
            {selectedEmail.bodyHtml && (
              <div className="px-4 pt-1 flex items-center justify-end space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEmailBodyViewMode('rich')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    emailBodyViewMode === 'rich'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  网页渲染视图
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
                  纯文本视图
                </button>
              </div>
            )}

            {/* Email Full Content Area */}
            <div className="flex-1 overflow-y-auto p-4 select-text">
              {selectedEmail.bodyHtml && emailBodyViewMode === 'rich' ? (
                <div
                  className="prose dark:prose-invert max-w-none text-xs leading-relaxed overflow-x-auto bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans">
                  {selectedEmail.bodyText || selectedEmail.bodyPreview || '暂无更多正文内容'}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-800/30">
              <button
                type="button"
                onClick={() => {
                  const fullText = `主题: ${selectedEmail.subject}\n发件人: ${selectedEmail.from}\n时间: ${selectedEmail.receivedDateTime}\n\n${selectedEmail.bodyText || selectedEmail.bodyPreview || ''}`;
                  copyWithFeedback(fullText, 'full_email_text');
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 transition flex items-center space-x-1"
              >
                {copiedId === 'full_email_text' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'full_email_text' ? '已复制邮件全文' : '复制邮件全文'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="px-5 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm hover:opacity-90 transition active:scale-95"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. 2FA QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleScanQRSuccess}
      />
    </div>
  );
};
