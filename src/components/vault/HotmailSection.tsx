import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HotmailAccount, EmailMessage } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import {
  parseBatchHotmailAccounts,
  exportHotmailAccountsToText,
  refreshMicrosoftToken,
  ensureValidAccessToken,
  fetchInboxMessages,
  sendMicrosoftEmail,
} from '../../utils/microsoft';
import { BottomSheet } from '../common/BottomSheet';
import { Button, EmptyState, Field, Input, SegmentedControl, Textarea, useToast } from '../ui';
import {
  Mail,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Send,
  Download,
  Upload,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

interface HotmailSectionProps {
  accounts: HotmailAccount[];
  onUpdateAccounts: (accounts: HotmailAccount[]) => void;
}

type MailFolderFilter = 'all' | 'inbox' | 'junkemail';
type EmailBodyViewMode = 'rich' | 'plain';

const STATUS_META: Record<
  HotmailAccount['status'],
  { text: string; dot: string; pill: string }
> = {
  valid: { text: '令牌有效', dot: 'bg-ok', pill: 'bg-ok/10 text-ok' },
  error: { text: '检测失败', dot: 'bg-danger', pill: 'bg-danger/10 text-danger' },
  idle: { text: '待验证', dot: 'bg-ink-3', pill: 'bg-surface-2 text-ink-2' },
  expired: { text: '已过期', dot: 'bg-warn', pill: 'bg-warn/10 text-warn' },
};

export const HotmailSection: React.FC<HotmailSectionProps> = ({
  accounts,
  onUpdateAccounts,
}) => {
  const toast = useToast();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyWithFeedback = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    haptics.selection();
    sound.playTap();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Batch import / export sheets
  const [showHotmailImportModal, setShowHotmailImportModal] = useState(false);
  const [hotmailImportText, setHotmailImportText] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportText, setExportText] = useState('');

  // Account messages viewer sheet
  const [viewingAccount, setViewingAccount] = useState<HotmailAccount | null>(null);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailFetchError, setEmailFetchError] = useState<string | null>(null);
  const [mailFolderFilter, setMailFolderFilter] = useState<MailFolderFilter>('all');

  // Single email message detail viewer sheet
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [emailBodyViewMode, setEmailBodyViewMode] = useState<EmailBodyViewMode>('rich');

  // Send email sheet
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTargetAcc, setSendTargetAcc] = useState<HotmailAccount | null>(null);
  const [sendToEmail, setSendToEmail] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendContent, setSendContent] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);

  // Mask toggles for Hotmail credentials
  const [revealedHotmail, setRevealedHotmail] = useState<Record<string, boolean>>({});

  const toggleRevealHotmail = (id: string) => {
    sound.playTap();
    setRevealedHotmail(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const persist = (updated: HotmailAccount[]) => {
    onUpdateAccounts(updated);
    db.saveHotmailAccounts(updated);
  };

  // Refresh and check Hotmail token
  const handleRefreshToken = async (acc: HotmailAccount) => {
    sound.playTap();
    setTestingAccountId(acc.id);
    try {
      const res = await refreshMicrosoftToken(acc);
      const tokenExpiresAt = Date.now() + Math.max(300, res.expiresIn - 60) * 1000;
      const updated = accounts.map(a =>
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
      persist(updated);
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
      toast.success('微软令牌测通成功，已获取有效授权！');
    } catch (err: any) {
      console.error('Refresh token error:', err);
      const updated = accounts.map(a =>
        a.id === acc.id
          ? {
              ...a,
              status: 'error' as const,
              lastCheckedAt: new Date().toISOString(),
              lastErrorMessage: err.message,
            }
          : a
      );
      persist(updated);
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
      sound.playError();
      toast.error('令牌检测失败: ' + err.message);
    } finally {
      setTestingAccountId(null);
    }
  };

  // View Inbox & Junk Email & Extract codes
  const handleOpenInbox = async (
    acc: HotmailAccount,
    folder: 'inbox' | 'junkemail' | 'all' = 'all'
  ) => {
    sound.playTap();
    setViewingAccount(acc);
    setIsLoadingEmails(true);
    setEmailFetchError(null);

    try {
      // Ensure valid access token with tokenExpiresAt check
      const { accessToken: token, account: refreshedAcc, refreshed } = await ensureValidAccessToken(acc);
      if (refreshed) {
        const updatedWithRefresh = accounts.map(a => (a.id === acc.id ? refreshedAcc : a));
        persist(updatedWithRefresh);
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
          const newExpiresAt = Date.now() + Math.max(300, forceRefreshed.expiresIn - 60) * 1000;
          const retryAccount: HotmailAccount = {
            ...acc,
            accessToken: forceRefreshed.accessToken,
            refreshToken: forceRefreshed.refreshToken || acc.refreshToken,
            tokenExpiresAt: newExpiresAt,
            status: 'valid',
            lastCheckedAt: new Date().toISOString(),
            lastErrorMessage: undefined,
          };
          const updatedWithRetry = accounts.map(a => (a.id === acc.id ? retryAccount : a));
          persist(updatedWithRetry);
          setViewingAccount(retryAccount);
          msgs = await fetchInboxMessages(forceRefreshed.accessToken, folder);
        } else {
          throw fetchErr;
        }
      }

      const updated = accounts.map(a =>
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
      persist(updated);
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
      const updated = accounts.map(a =>
        a.id === acc.id ? { ...a, status: 'error' as const, lastErrorMessage: err.message } : a
      );
      persist(updated);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Send email handler
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTargetAcc || !sendToEmail || !sendSubject) return;

    setIsSendingEmail(true);
    sound.playTap();
    try {
      const { accessToken: token, account: refreshedAcc, refreshed } = await ensureValidAccessToken(sendTargetAcc);
      if (refreshed) {
        const updatedWithRefresh = accounts.map(a => (a.id === sendTargetAcc.id ? refreshedAcc : a));
        persist(updatedWithRefresh);
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
          const newExpiresAt = Date.now() + Math.max(300, forceRefreshed.expiresIn - 60) * 1000;
          const retryAccount: HotmailAccount = {
            ...sendTargetAcc,
            accessToken: forceRefreshed.accessToken,
            refreshToken: forceRefreshed.refreshToken || sendTargetAcc.refreshToken,
            tokenExpiresAt: newExpiresAt,
            status: 'valid',
            lastCheckedAt: new Date().toISOString(),
            lastErrorMessage: undefined,
          };
          const updatedWithRetry = accounts.map(a => (a.id === sendTargetAcc.id ? retryAccount : a));
          persist(updatedWithRetry);
          setSendTargetAcc(retryAccount);
          await sendMicrosoftEmail(forceRefreshed.accessToken, sendToEmail, sendSubject, sendContent);
        } else {
          throw sendErr;
        }
      }

      sound.playSuccess();
      toast.success('邮件已成功送出！');
      setShowSendModal(false);
      setSendToEmail('');
      setSendSubject('');
      setSendContent('');
    } catch (err: any) {
      toast.error(`发送失败: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Import Hotmail text
  const handleImportHotmailSubmit = () => {
    if (!hotmailImportText.trim()) return;
    sound.playSuccess();
    const parsed = parseBatchHotmailAccounts(hotmailImportText);
    if (parsed.length > 0) {
      const updated = [...parsed, ...accounts];
      persist(updated);
      setShowHotmailImportModal(false);
      setHotmailImportText('');
      toast.success(`成功导入 ${parsed.length} 个账号`);
    } else {
      toast.error('未识别到有效账号格式，请确认每行格式为：邮箱----密码----Client_ID----Refresh_Token');
    }
  };

  // Pre-fill user sample format in import sheet
  const handleFillSample = () => {
    const sample = `sample@hotmail.com----your_password----9e5f94bc-e8a4-4e73-b8be-63364c29d753----M.C514_BL2.0.U.SAMPLE_REFRESH_TOKEN`;
    setHotmailImportText(sample);
  };

  const handleOpenExport = () => {
    sound.playTap();
    const text = exportHotmailAccountsToText(accounts);
    setExportText(text);
    setShowExportModal(true);
  };

  const handleDeleteHotmail = (id: string) => {
    sound.playTap();
    const updated = accounts.filter(a => a.id !== id);
    persist(updated);
  };

  const handleSaveTxtFile = () => {
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotmail_accounts_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const messages = viewingAccount?.messages || [];
  const inboxCount = messages.filter(m => m.folder !== 'junkemail').length;
  const junkCount = messages.filter(m => m.folder === 'junkemail').length;

  return (
    <div className="space-y-3">
      {/* Toolbar: title left, import/export right */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-headline font-bold text-ink flex items-center gap-2 flex-wrap">
            <span>微软 Hotmail / Outlook</span>
            <span className="text-caption px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
              支持验证码提取
            </span>
          </h4>
          <p className="text-caption text-ink-3 mt-0.5">
            格式：邮箱----密码----ClientID----RefreshToken
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              sound.playTap();
              setShowHotmailImportModal(true);
            }}
            title="批量导入"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>导入</span>
          </Button>
          <Button variant="neutral" size="sm" onClick={handleOpenExport} title="批量导出">
            <Download className="w-3.5 h-3.5" />
            <span>导出</span>
          </Button>
        </div>
      </div>

      {/* Hotmail accounts list */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="暂无微软邮箱账号"
          hint="支持通过 RefreshToken 批量托管微软 Hotmail / Outlook 邮箱与自动提取验证码"
          actionLabel="导入微软邮箱账号"
          onAction={() => {
            sound.playTap();
            setShowHotmailImportModal(true);
          }}
          className="mt-2"
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          <AnimatePresence initial={false}>
            {accounts.slice(0, 100).map(acc => {
              const isRevealed = !!revealedHotmail[acc.id];
              const status = STATUS_META[acc.status] ?? STATUS_META.idle;

              return (
                <motion.div
                  key={acc.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                >
                  <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-3.5 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap gap-y-1">
                          <span className="text-sub font-bold text-ink truncate">{acc.email}</span>
                          <span
                            className={`text-caption px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 shrink-0 ${status.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.text}
                          </span>
                        </div>
                        {acc.lastCheckedAt && (
                          <span className="text-caption text-ink-3">
                            上次检测: {new Date(acc.lastCheckedAt).toLocaleTimeString()}
                          </span>
                        )}
                        {acc.lastErrorMessage && (
                          <p className="text-caption text-danger mt-1 break-words font-medium leading-relaxed">
                            {acc.lastErrorMessage}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteHotmail(acc.id)}
                        className="p-1.5 text-ink-3 hover:text-danger rounded-lg transition-colors shrink-0"
                        title="删除账号"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Credentials preview (masked) */}
                    <div className="p-2.5 bg-surface-2 rounded-xl space-y-1 font-mono">
                      <div className="flex items-center justify-between text-caption text-ink-2">
                        <span>密码: {isRevealed ? acc.password : '••••••••'}</span>
                        <button
                          onClick={() => toggleRevealHotmail(acc.id)}
                          className="text-ink-3 hover:text-ink p-0.5"
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-caption text-ink-3 truncate">
                        Client ID: {acc.clientId || '默认'}
                      </div>
                      <div className="text-caption text-ink-3 truncate">
                        Token: {isRevealed ? acc.refreshToken : acc.refreshToken.slice(0, 15) + '...'}
                      </div>
                    </div>

                    {/* Action buttons: refresh token, inbox, send */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => handleRefreshToken(acc)}
                        disabled={testingAccountId === acc.id}
                        title="刷新并测通令牌"
                        className="w-full"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingAccountId === acc.id ? 'animate-spin text-accent' : ''}`} />
                        <span>{testingAccountId === acc.id ? '检测中...' : '测通令牌'}</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenInbox(acc)}
                        title="查看邮件与提取验证码"
                        className="w-full"
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        <span>收件箱</span>
                      </Button>

                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => {
                          setSendTargetAcc(acc);
                          setShowSendModal(true);
                          sound.playTap();
                        }}
                        title="快速发信"
                        className="w-full"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>发信</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Batch import sheet */}
      <BottomSheet
        isOpen={showHotmailImportModal}
        onClose={() => setShowHotmailImportModal(false)}
        title="批量导入微软邮箱账号"
        subtitle="每行一条，格式：邮箱----密码----ClientID----RefreshToken"
      >
        <div className="space-y-3 pb-2">
          <Textarea
            rows={6}
            placeholder="在此粘贴账号列表..."
            value={hotmailImportText}
            onChange={e => setHotmailImportText(e.target.value)}
            className="font-mono"
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleFillSample}
              className="text-caption text-ink-3 hover:text-accent font-medium tactile-press"
            >
              填入示例格式
            </button>
            <div className="flex items-center gap-2.5">
              <Button type="button" variant="ghost" size="md" onClick={() => setShowHotmailImportModal(false)}>
                取消
              </Button>
              <Button type="button" variant="primary" size="md" onClick={handleImportHotmailSubmit}>
                解析并导入
              </Button>
            </div>
          </div>
          <p className="text-caption text-ink-3">支持以 ----、--- 或制表符分隔</p>
        </div>
      </BottomSheet>

      {/* Export sheet */}
      <BottomSheet
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="导出微软邮箱账号凭据"
        subtitle="将已保存的邮箱账户凭据导出为文本"
      >
        <div className="space-y-3 pb-2">
          <Textarea
            readOnly
            rows={6}
            value={exportText}
            className="font-mono select-all"
          />
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button
              type="button"
              variant="neutral"
              size="md"
              onClick={() => copyWithFeedback(exportText, 'export_text')}
            >
              {copiedId === 'export_text' ? '已复制' : '复制全部'}
            </Button>
            <Button type="button" variant="primary" size="md" onClick={handleSaveTxtFile}>
              <Download className="w-4 h-4" />
              <span>保存为 TXT 文件</span>
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Inbox & verification code viewer sheet */}
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
              className="p-1.5 text-ink-2 hover:text-accent rounded-lg hover:bg-surface-2 tactile-press"
              title="刷新邮件"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
            </button>
          )
        }
      >
        {viewingAccount && (
          <div className="space-y-3 pb-3">
            {/* Folder filter */}
            <div className="p-2 bg-surface-2 rounded-2xl">
              <SegmentedControl
                groupId="vault-mail-folders"
                size="sm"
                value={mailFolderFilter}
                onChange={id => setMailFolderFilter(id as MailFolderFilter)}
                items={[
                  { id: 'all', label: '全部', badge: messages.length },
                  { id: 'inbox', label: '收件箱', badge: inboxCount },
                  { id: 'junkemail', label: '垃圾邮件', badge: junkCount },
                ]}
              />
            </div>

            {/* Email list & extracted codes */}
            <div className="space-y-2.5">
              {emailFetchError && (
                <div className="p-3 bg-danger/10 rounded-2xl text-caption text-danger flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{emailFetchError}</span>
                </div>
              )}

              {isLoadingEmails ? (
                <div className="py-16 text-center space-y-2">
                  <RefreshCw className="w-7 h-7 text-accent animate-spin mx-auto" />
                  <p className="text-caption text-ink-2">正在并发检索收件箱与垃圾邮件箱...</p>
                </div>
              ) : messages.length > 0 ? (
                messages
                  .filter(msg => {
                    if (mailFolderFilter === 'inbox') return msg.folder !== 'junkemail';
                    if (mailFolderFilter === 'junkemail') return msg.folder === 'junkemail';
                    return true;
                  })
                  .slice(0, 100)
                  .map(msg => (
                    <div
                      key={msg.id}
                      onClick={() => {
                        sound.playTap();
                        setSelectedEmail(msg);
                      }}
                      className="p-3.5 bg-surface-2/70 rounded-2xl border border-line space-y-2 cursor-pointer hover:border-accent/40 transition-all active:scale-[0.99] group"
                    >
                      {/* Top row: sender & folder badge & date */}
                      <div className="flex items-center justify-between gap-2 text-caption">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-ink truncate">
                            {msg.fromName || msg.from}
                          </span>
                          {msg.folder === 'junkemail' ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-warn/10 text-warn font-semibold shrink-0 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                              垃圾邮件
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium shrink-0 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                              收件箱
                            </span>
                          )}
                        </div>
                        <span className="text-caption text-ink-3 shrink-0">
                          {msg.receivedDateTime ? new Date(msg.receivedDateTime).toLocaleString() : ''}
                        </span>
                      </div>

                      <h5 className="text-sub font-bold text-ink group-hover:text-accent transition-colors">
                        {msg.subject}
                      </h5>

                      {/* Extracted verification code banner */}
                      {msg.extractedCode && (
                        <div
                          onClick={e => e.stopPropagation()}
                          className="p-2.5 bg-ok/10 border border-ok/20 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-caption font-bold text-ok shrink-0">验证码</span>
                            <span className="font-mono text-body font-bold text-ok tracking-wider">
                              {msg.extractedCode}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => copyWithFeedback(msg.extractedCode!, msg.id + '_code')}
                            className="shrink-0"
                          >
                            {copiedId === msg.id + '_code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === msg.id + '_code' ? '已复制' : '一键复制'}</span>
                          </Button>
                        </div>
                      )}

                      <p className="text-caption text-ink-2 leading-relaxed line-clamp-2">
                        {msg.bodyPreview}
                      </p>
                    </div>
                  ))
              ) : (
                <div className="py-16 text-center space-y-2">
                  <Mail className="w-10 h-10 text-ink-3 mx-auto" strokeWidth={1.5} />
                  <p className="text-caption text-ink-2">
                    {mailFolderFilter === 'junkemail' ? '垃圾邮件箱中暂无邮件' : '暂无新邮件'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Send email sheet */}
      <BottomSheet
        isOpen={showSendModal && !!sendTargetAcc}
        onClose={() => setShowSendModal(false)}
        title="通过微软 Hotmail 发送邮件"
        subtitle={`发件人：${sendTargetAcc?.email}`}
      >
        {sendTargetAcc && (
          <form onSubmit={handleSendEmail} className="space-y-4 pb-2">
            <Field label="收件人邮箱" required>
              <Input
                type="email"
                required
                placeholder="recipient@example.com"
                value={sendToEmail}
                onChange={e => setSendToEmail(e.target.value)}
              />
            </Field>

            <Field label="邮件主题" required>
              <Input
                required
                placeholder="请输入邮件主题"
                value={sendSubject}
                onChange={e => setSendSubject(e.target.value)}
              />
            </Field>

            <Field label="正文内容">
              <Textarea
                rows={4}
                placeholder="输入邮件文本内容..."
                value={sendContent}
                onChange={e => setSendContent(e.target.value)}
              />
            </Field>

            <div className="pt-1 flex items-center justify-end gap-2.5">
              <Button type="button" variant="ghost" size="md" onClick={() => setShowSendModal(false)}>
                取消
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={isSendingEmail} className="min-w-[120px]">
                {isSendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isSendingEmail ? '正在发送...' : '发送邮件'}</span>
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* Single email detail viewer sheet */}
      <BottomSheet
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        title={selectedEmail?.subject || '(无主题)'}
        subtitle={`发件人：${selectedEmail?.from}`}
        maxHeight="max-h-[92dvh]"
        footer={
          selectedEmail && (
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="neutral"
                size="md"
                onClick={() => {
                  const fullText = `主题: ${selectedEmail.subject}\n发件人: ${selectedEmail.from}\n时间: ${selectedEmail.receivedDateTime}\n\n${selectedEmail.bodyText || selectedEmail.bodyPreview || ''}`;
                  copyWithFeedback(fullText, 'full_email_text');
                }}
              >
                {copiedId === 'full_email_text' ? (
                  <Check className="w-4 h-4 text-ok" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedId === 'full_email_text' ? '已复制' : '复制全文'}</span>
              </Button>
              <Button type="button" variant="primary" size="md" onClick={() => setSelectedEmail(null)}>
                关闭
              </Button>
            </div>
          )
        }
      >
        {selectedEmail && (
          <div className="space-y-3 pb-2">
            {/* Sender / recipient information */}
            <div className="p-3 bg-surface-2 rounded-2xl flex items-center justify-between gap-2 text-caption">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-ink-3 shrink-0">发件人:</span>
                <span className="font-semibold text-ink truncate">
                  {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.from}>` : selectedEmail.from}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyWithFeedback(selectedEmail.from, 'sender_email')}
                className="text-ink-3 hover:text-accent shrink-0 font-medium"
              >
                {copiedId === 'sender_email' ? '已复制' : '复制'}
              </button>
            </div>

            {/* Extracted code highlight */}
            {selectedEmail.extractedCode && (
              <div className="p-3 bg-ok/10 border border-ok/20 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-xl bg-ok text-white shrink-0">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-caption font-semibold text-ok">动态验证码</div>
                    <div className="font-mono text-headline font-bold text-ok tracking-wider">
                      {selectedEmail.extractedCode}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => copyWithFeedback(selectedEmail.extractedCode!, 'modal_code')}
                  className="shrink-0"
                >
                  {copiedId === 'modal_code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'modal_code' ? '已复制' : '一键复制'}</span>
                </Button>
              </div>
            )}

            {/* View mode toggle */}
            {selectedEmail.bodyHtml && (
              <div className="flex justify-end">
                <SegmentedControl
                  groupId="vault-mail-view"
                  size="sm"
                  value={emailBodyViewMode}
                  onChange={id => setEmailBodyViewMode(id as EmailBodyViewMode)}
                  items={[
                    { id: 'rich', label: '网页视图' },
                    { id: 'plain', label: '纯文本' },
                  ]}
                />
              </div>
            )}

            {/* Email full content area — long HTML bodies scroll inside a capped frame */}
            <div className="select-text">
              {selectedEmail.bodyHtml && emailBodyViewMode === 'rich' ? (
                <div
                  className="prose dark:prose-invert max-w-none text-caption leading-relaxed overflow-y-auto overflow-x-auto bg-surface rounded-2xl border border-line p-3.5 max-h-[52dvh]"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-line text-caption leading-relaxed text-ink-2 whitespace-pre-wrap font-sans max-h-[52dvh] overflow-y-auto">
                  {selectedEmail.bodyText || selectedEmail.bodyPreview || '暂无更多正文内容'}
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
