import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  GoogleWarmingAccount,
  AIProvider,
  AccentColor,
} from '../../types';
import {
  GOOGLE_WARMING_SCHEDULE,
  parseGoogleAccountsText,
  aiParseGoogleAccounts,
  exportGoogleAccountsToJSON,
  importGoogleAccountsFromJSON,
  translateCountryName,
} from '../../utils/googleWarming';
import { generateTOTP } from '../../utils/crypto';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { BottomSheet } from '../common/BottomSheet';
import {
  Button,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
  useToast,
  NowSecondProvider,
  useNowSecond,
  remainingSeconds,
} from '../ui';
import {
  Globe,
  Plus,
  Upload,
  Download,
  Key,
  KeyRound,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Search,
  Trash2,
  Edit2,
  X,
  ScanText,
  RefreshCw,
  FileJson,
  CheckSquare,
  Square,
  Award,
  Eye,
  EyeOff,
  Flame,
  MapPin,
  Tag,
  ChevronDown,
  Mail,
  ShieldCheck,
  FileText,
  Lightbulb,
} from 'lucide-react';

interface GoogleWarmingSectionProps {
  accounts: GoogleWarmingAccount[];
  onUpdateAccounts: (accounts: GoogleWarmingAccount[]) => void;
  providers?: AIProvider[];
  accentColor?: AccentColor;
}

type StatusFilter = 'all' | 'warming' | 'completed' | 'paused';
type ImportTab = 'file' | 'text' | 'ai';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'warming', label: '养号中' },
  { id: 'completed', label: '已出师' },
  { id: 'paused', label: '已暂停' },
];


/** Confetti loads on first celebration instead of with the tab chunk. */
const fireConfetti = async (options?: Parameters<typeof import('canvas-confetti')>[0]) => {
  try {
    const confetti = (await import('canvas-confetti')).default;
    confetti(options ?? { particleCount: 60, spread: 70 });
  } catch {
    /* decoration only */
  }
};

const STATUS_BADGE: Record<
  GoogleWarmingAccount['status'],
  { cls: string; dot: string }
> = {
  warming: { cls: 'bg-accent/10 text-accent', dot: 'bg-accent' },
  completed: { cls: 'bg-ok/10 text-ok', dot: 'bg-ok' },
  paused: { cls: 'bg-warn/10 text-warn', dot: 'bg-warn' },
};

/** Per-second countdown leaf — ticks via NowSecondProvider, not via code regeneration. */
const TotpCountdown: React.FC = () => {
  const nowSec = useNowSecond();
  const remaining = remainingSeconds(nowSec, 30);
  return (
    <div className="text-right">
      <div className="text-caption text-accent font-mono font-bold">{remaining}s</div>
      <div className="w-10 h-1 bg-accent/20 rounded-full overflow-hidden mt-0.5">
        <div
          className="h-full bg-accent transition-all duration-1000"
          style={{ width: `${(remaining / 30) * 100}%` }}
        />
      </div>
    </div>
  );
};

export const GoogleWarmingSection: React.FC<GoogleWarmingSectionProps> = ({
  accounts,
  onUpdateAccounts,
  providers = [],
  accentColor = 'wechat',
}) => {
  void accentColor; // kept for interface compatibility
  const toast = useToast();

  // Test Mode toggle (allows consecutive check-ins without waiting 24 hours)
  const [testMode, setTestMode] = useState(true);

  // Search and Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Multi-selection for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Active Account for 14-Day Workspace Checklist Modal
  const [activeAccount, setActiveAccount] = useState<GoogleWarmingAccount | null>(null);
  const [dayActionChecks, setDayActionChecks] = useState<Record<string, boolean>>({});

  // Account Edit / Create Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<GoogleWarmingAccount>>({});

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<ImportTab>('file');
  const [importText, setImportText] = useState('');
  const [importCategory, setImportCategory] = useState('未分类');
  const [isAiParsing, setIsAiParsing] = useState(false);

  // Password Generator Modal
  const [showPasswordGenModal, setShowPasswordGenModal] = useState(false);
  const [genPasswordLength, setGenPasswordLength] = useState(16);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // 2FA dynamic tokens live loop
  const [totpMap, setTotpMap] = useState<Record<string, { code: string; remainingSeconds: number; progress: number }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleShowPassword = (id: string) => {
    sound.playTap();
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleAccountStatus = (acc: GoogleWarmingAccount) => {
    sound.playTap();
    const nextStatus: 'warming' | 'paused' = acc.status === 'paused' ? 'warming' : 'paused';
    const updated = accounts.map(a => (a.id === acc.id ? { ...a, status: nextStatus } : a));
    onUpdateAccounts(updated);
  };

  // Derive categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    accounts.forEach(a => {
      if (a.category && a.category !== '未分类') cats.add(a.category);
    });
    return ['all', '未分类', ...Array.from(cats)];
  }, [accounts]);

  // Regenerate 2FA codes only when the 30s window rolls over; the ticking
  // countdown ring on each card reads the shared NowSecondProvider tick.
  const totpWindowRef = useRef<Record<string, number>>({});
  const nowSec = useNowSecond();

  useEffect(() => {
    let cancelled = true;

    const pending = accounts.filter(a => {
      if (!a.twoFASecret) return false;
      const win = Math.floor(nowSec / 30);
      if (totpWindowRef.current[a.id] === win && totpMap[a.id]) return false;
      totpWindowRef.current[a.id] = win;
      return true;
    });
    if (pending.length === 0) return;
    cancelled = false;

    (async () => {
      const updates: Record<string, { code: string; remainingSeconds: number; progress: number }> = {};
      for (const acc of pending) {
        try {
          const res = await generateTOTP(acc.twoFASecret!);
          updates[acc.id] = res;
        } catch {
          // ignore invalid secret
        }
      }
      if (!cancelled && Object.keys(updates).length) {
        setTotpMap(prev => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nowSec, accounts, totpMap]);

  // Copy helper
  const copyText = (text: string, id: string, label?: string) => {
    sound.playTap();
    haptics.selection();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (label) {
      toast.success(`已复制 ${label}`);
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Accounts (deferred so typing never blocks the input)
  const deferredSearch = useDeferredValue(searchQuery);
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const q = deferredSearch.trim().toLowerCase();
      const matchQuery =
        !q ||
        acc.email.toLowerCase().includes(q) ||
        (acc.country && acc.country.toLowerCase().includes(q)) ||
        (acc.note && acc.note.toLowerCase().includes(q)) ||
        (acc.category && acc.category.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === 'all' ||
        (selectedCategory === '未分类' ? !acc.category || acc.category === '未分类' : acc.category === selectedCategory);

      const matchStatus = statusFilter === 'all' || acc.status === statusFilter;

      return matchQuery && matchCategory && matchStatus;
    });
  }, [accounts, deferredSearch, selectedCategory, statusFilter]);

  const [renderAllGw, setRenderAllGw] = useState(false);
  const visibleAccounts = renderAllGw ? filteredAccounts : filteredAccounts.slice(0, 100);

  // Stats
  const stats = useMemo(() => {
    return {
      total: accounts.length,
      warming: accounts.filter(a => a.status === 'warming').length,
      completed: accounts.filter(a => a.status === 'completed').length,
      paused: accounts.filter(a => a.status === 'paused').length,
    };
  }, [accounts]);

  const statusCount = (id: StatusFilter) =>
    id === 'all' ? stats.total : id === 'warming' ? stats.warming : id === 'completed' ? stats.completed : stats.paused;

  // Handle single account check-in (Warm Step)
  const handleWarmStep = (acc: GoogleWarmingAccount) => {
    sound.playSuccess();
    fireConfetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    const nextDay = Math.min((acc.currentDay || 1) + 1, 14);
    const nextStatus = nextDay >= 14 ? ('completed' as const) : acc.status;

    const updated = accounts.map(a =>
      a.id === acc.id
        ? {
            ...a,
            currentDay: nextDay,
            lastWarmedAt: new Date().toISOString(),
            status: nextStatus,
          }
        : a
    );
    onUpdateAccounts(updated);

    if (activeAccount && activeAccount.id === acc.id) {
      setActiveAccount({
        ...activeAccount,
        currentDay: nextDay,
        lastWarmedAt: new Date().toISOString(),
        status: nextStatus,
      });
      setDayActionChecks({});
    }
  };

  // Batch Check-in
  const handleBatchWarm = () => {
    if (selectedIds.length === 0) return;
    sound.playSuccess();
    fireConfetti({ particleCount: 70, spread: 80 });

    const updated = accounts.map(a => {
      if (selectedIds.includes(a.id)) {
        const nextDay = Math.min((a.currentDay || 1) + 1, 14);
        return {
          ...a,
          currentDay: nextDay,
          lastWarmedAt: new Date().toISOString(),
          status: nextDay >= 14 ? ('completed' as const) : a.status,
        };
      }
      return a;
    });

    onUpdateAccounts(updated);
    setSelectedIds([]);
  };

  // Batch Status
  const handleBatchStatus = (status: 'warming' | 'completed' | 'paused') => {
    if (selectedIds.length === 0) return;
    sound.playTap();
    const updated = accounts.map(a => (selectedIds.includes(a.id) ? { ...a, status } : a));
    onUpdateAccounts(updated);
    setSelectedIds([]);
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await toast.confirm({
      title: '批量删除账号',
      message: `确定要删除选中的 ${selectedIds.length} 个谷歌账号吗？此操作不可逆！`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    sound.playTap();
    const updated = accounts.filter(a => !selectedIds.includes(a.id));
    onUpdateAccounts(updated);
    setSelectedIds([]);
  };

  // Single Delete
  const handleDeleteAccount = async (id: string) => {
    const ok = await toast.confirm({
      title: '删除账号',
      message: '确定要删除此谷歌养号账号吗？',
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    sound.playTap();
    const updated = accounts.filter(a => a.id !== id);
    onUpdateAccounts(updated);
    if (activeAccount?.id === id) setActiveAccount(null);
  };

  // Save Account Edit / Create
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount.email?.trim()) return;

    sound.playSuccess();
    const cleanEmail = editingAccount.email.trim();

    if (editingAccount.id) {
      // Update
      const updated = accounts.map(a =>
        a.id === editingAccount.id
          ? ({
              ...a,
              ...editingAccount,
              email: cleanEmail,
              country: translateCountryName(editingAccount.country),
            } as GoogleWarmingAccount)
          : a
      );
      onUpdateAccounts(updated);
      if (activeAccount?.id === editingAccount.id) {
        setActiveAccount({
          ...activeAccount,
          ...editingAccount,
          email: cleanEmail,
          country: translateCountryName(editingAccount.country),
        } as GoogleWarmingAccount);
      }
    } else {
      // Create
      const newAcc: GoogleWarmingAccount = {
        id: 'gw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        email: cleanEmail,
        password: editingAccount.password || '',
        recoveryEmail: editingAccount.recoveryEmail || '',
        twoFASecret: editingAccount.twoFASecret || '',
        country: translateCountryName(editingAccount.country),
        note: editingAccount.note || '',
        backupCodes: editingAccount.backupCodes || '',
        category: editingAccount.category || '未分类',
        status: editingAccount.status || 'warming',
        currentDay: Number(editingAccount.currentDay) || 1,
        createdAt: new Date().toISOString(),
      };
      onUpdateAccounts([newAcc, ...accounts]);
    }

    setShowEditModal(false);
    setEditingAccount({});
  };

  // Export JSON (100% compatible with 3d-personal-learning-platform)
  const handleExportJSON = () => {
    sound.playTap();
    const jsonStr = exportGoogleAccountsToJSON(accounts);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `google-warming-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import from JSON file
  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const res = importGoogleAccountsFromJSON(text, accounts);
        onUpdateAccounts(res.updatedAccounts);
        sound.playSuccess();
        fireConfetti({ particleCount: 60, spread: 70 });
        toast.success(`成功导入 ${res.importedCount} 个谷歌账号（已跳过 ${res.skippedCount} 个已存在邮箱）`);
        setShowImportModal(false);
      } catch (err: any) {
        toast.error(`导入失败: ${err.message || '文件解析错误'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import from Text (multi-line delimiter)
  const handleImportTextSubmit = () => {
    if (!importText.trim()) return;
    const parsed = parseGoogleAccountsText(importText, importCategory);
    if (parsed.length === 0) {
      toast.error('未识别到有效的账号格式，请确保每行包含有效的 Gmail 邮箱');
      return;
    }

    // Deduplicate
    const existing = new Set(accounts.map(a => a.email.toLowerCase().trim()));
    const validToAdd: GoogleWarmingAccount[] = [];
    let skipped = 0;

    for (const p of parsed) {
      if (!p.email || existing.has(p.email.toLowerCase().trim())) {
        skipped++;
        continue;
      }
      existing.add(p.email.toLowerCase().trim());
      validToAdd.push(p as GoogleWarmingAccount);
    }

    onUpdateAccounts([...validToAdd, ...accounts]);
    sound.playSuccess();
    fireConfetti({ particleCount: 50, spread: 60 });
    toast.success(`成功导入 ${validToAdd.length} 个账号（跳过重复 ${skipped} 个）`);
    setShowImportModal(false);
    setImportText('');
  };

  // AI Parse text
  const handleAiParseSubmit = async () => {
    if (!importText.trim()) return;
    setIsAiParsing(true);
    sound.playTap();

    try {
      const activeProvider = providers.find(p => p.isActive) || providers[0];
      const parsed = await aiParseGoogleAccounts({
        text: importText,
        provider: activeProvider,
        defaultCategory: importCategory,
      });

      const existing = new Set(accounts.map(a => a.email.toLowerCase().trim()));
      const validToAdd: GoogleWarmingAccount[] = [];
      let _skipped = 0;

      for (const p of parsed) {
        if (!p.email || existing.has(p.email.toLowerCase().trim())) {
          _skipped++;
          continue;
        }
        existing.add(p.email.toLowerCase().trim());
        validToAdd.push(p as GoogleWarmingAccount);
      }

      onUpdateAccounts([...validToAdd, ...accounts]);
      sound.playSuccess();
      fireConfetti({ particleCount: 60, spread: 70 });
      toast.success(`AI 智能解析完成，共识别录入 ${validToAdd.length} 个账号`);
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      toast.error(`AI 解析失败: ${err.message}`);
    } finally {
      setIsAiParsing(false);
    }
  };

  // Generate random complex password
  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pw = '';
    for (let i = 0; i < genPasswordLength; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pw);
  };

  // Check if active account is warmed today
  const isActiveAccountWarmedToday = useMemo(() => {
    if (!activeAccount || !activeAccount.lastWarmedAt) return false;
    if (testMode) return false; // In test mode, allow consecutive check-ins!
    const last = new Date(activeAccount.lastWarmedAt);
    const today = new Date();
    return last.toDateString() === today.toDateString();
  }, [activeAccount, testMode]);

  const activeTaskDetails = activeAccount
    ? GOOGLE_WARMING_SCHEDULE[activeAccount.currentDay || 1] || GOOGLE_WARMING_SCHEDULE[1]
    : null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header toolbar - ultra compact & high density */}
      <div className="px-3.5 pt-2 pb-1.5 bg-surface/85 backdrop-blur-xl border-b border-line/60 shrink-0 space-y-1.5">
        {/* Row 1: Compact title + test mode toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0" title="全球权重梯级晋升 · 14 天系统化防封打卡">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs flex items-center justify-center shrink-0">
              <Globe className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-sub font-bold text-ink truncate leading-none">谷歌 14 天科学养号</h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tracking-wide shrink-0 leading-none">
                防风控
              </span>
            </div>
          </div>

          {/* Micro Test mode switch */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2/80 border border-line/60 shrink-0 select-none shadow-xs hover:border-line transition-colors"
            title="测试打卡模式：开启后跳过 24 小时打卡间隔限制，可连续测试 14 天打卡流转"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${testMode ? 'bg-ok animate-pulse' : 'bg-ink-4'}`} />
            <span className="text-[11px] font-medium text-ink-2 whitespace-nowrap">测试打卡</span>
            <Switch
              checked={testMode}
              onChange={() => {
                sound.playToggle();
                setTestMode(v => !v);
              }}
            />
          </div>
        </div>

        {/* Row 2: Search + action group (ultra-compact) */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索 Gmail 邮箱、地区、备注..."
              className="w-full pl-8 pr-7 py-1 text-caption rounded-full bg-surface border border-line text-ink placeholder:text-ink-3 outline-none focus:ring-1.5 ring-accent/40 shadow-xs transition-all h-7"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-surface-2 text-ink-3 hover:text-ink tactile-press"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            haptic="medium"
            onClick={() => {
              setEditingAccount({
                status: 'warming',
                currentDay: 1,
                category: '未分类',
              });
              setShowEditModal(true);
            }}
            className="shrink-0 h-7 px-2.5 text-caption gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>添加账号</span>
          </Button>

          {/* Grouped compact tools */}
          <div className="flex items-center rounded-full bg-surface-2/90 border border-line/70 p-0.5 shrink-0 shadow-xs h-7">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              title="从 3D平台 JSON 备份 / 文本 / AI 导入"
              className="h-6 px-2 flex items-center gap-1 rounded-full text-[11px] font-medium text-ink-2 hover:text-ink hover:bg-surface transition-all tactile-press"
            >
              <Upload className="w-3 h-3" />
              <span className="hidden sm:inline">导入</span>
            </button>
            <div className="w-px h-3 bg-line/60 shrink-0" />
            <button
              type="button"
              onClick={handleExportJSON}
              title="导出为 3D 平台兼容 JSON 备份"
              className="h-6 px-2 flex items-center gap-1 rounded-full text-[11px] font-medium text-ink-2 hover:text-ink hover:bg-surface transition-all tactile-press"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">备份</span>
            </button>
            <div className="w-px h-3 bg-line/60 shrink-0" />
            <button
              type="button"
              onClick={() => {
                handleGeneratePassword();
                setShowPasswordGenModal(true);
              }}
              title="随机强密码生成器"
              className="h-6 w-6 flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-surface transition-all tactile-press"
            >
              <Key className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Row 3: Compact Segmented control + Category select */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <div className="flex-1 min-w-0">
            <SegmentedControl
              groupId="google-warming-status-filters"
              size="sm"
              value={statusFilter}
              onChange={setStatusFilter}
              items={STATUS_FILTERS.map(f => ({
                id: f.id,
                label: f.label,
                badge: statusCount(f.id),
              }))}
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={selectedCategory}
              onChange={e => {
                sound.playTap();
                setSelectedCategory(e.target.value);
              }}
              className={`appearance-none h-7 pl-5 pr-5 rounded-full text-[11px] font-semibold transition-all cursor-pointer outline-none border shadow-xs ${
                selectedCategory !== 'all'
                  ? 'bg-accent/10 border-accent/40 text-accent font-bold'
                  : 'bg-surface-2/90 border-line/70 text-ink-2 hover:text-ink hover:border-line'
              }`}
            >
              {categories.map(cat => {
                const count =
                  cat === 'all'
                    ? accounts.length
                    : cat === '未分类'
                    ? accounts.filter(a => !a.category || a.category === '未分类').length
                    : accounts.filter(a => a.category === cat).length;

                return (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '全部分组' : cat} ({count})
                  </option>
                );
              })}
            </select>
            <Tag
              className={`w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                selectedCategory !== 'all' ? 'text-accent' : 'text-ink-3'
              }`}
            />
            <ChevronDown
              className={`w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                selectedCategory !== 'all' ? 'text-accent' : 'text-ink-3'
              }`}
            />
          </div>
        </div>

        {/* Batch operations bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-surface border border-line shadow-elev-2 rounded-2xl space-y-2.5 animate-scale-in">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sub font-bold text-ink flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-accent" />
                <span>已选 {selectedIds.length} 个账号</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedIds.length === filteredAccounts.length) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(filteredAccounts.map(a => a.id));
                    }
                  }}
                  className="text-caption text-ink-2 hover:text-accent font-medium"
                >
                  {selectedIds.length === filteredAccounts.length ? '取消全选' : '全选全部'}
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleBatchWarm}
                className="py-1.5 bg-accent text-white rounded-xl text-caption font-bold text-center tactile-press"
              >
                一键打卡
              </button>
              <button
                onClick={() => handleBatchStatus('completed')}
                className="py-1.5 bg-ok text-white rounded-xl text-caption font-bold text-center tactile-press"
              >
                设为完成
              </button>
              <button
                onClick={() => handleBatchStatus('paused')}
                className="py-1.5 bg-warn text-white rounded-xl text-caption font-bold text-center tactile-press"
              >
                暂停
              </button>
              <button
                onClick={handleBatchDelete}
                className="py-1.5 bg-danger text-white rounded-xl text-caption font-bold text-center tactile-press"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accounts list */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28 space-y-2.5">
        {filteredAccounts.length === 0 ? (
          <EmptyState
            icon={Globe}
            title={accounts.length === 0 ? '暂无谷歌养号账号' : '未找到匹配的谷歌账号'}
            hint={
              accounts.length === 0
                ? '点击上方「添加账号」录入新账号，或直接导入 3D 平台备份文件'
                : '请尝试调整搜索关键词或重置筛选条件'
            }
            actionLabel={accounts.length === 0 ? '从 3D 平台备份文件一键导入' : '清除搜索与筛选'}
            onAction={() => {
              if (accounts.length === 0) {
                setShowImportModal(true);
              } else {
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedCategory('all');
              }
            }}
            className="mt-4"
          />
        ) : (
          <NowSecondProvider>
          <div className="grid grid-cols-1 gap-2.5">
            <AnimatePresence initial={false}>
              {visibleAccounts.map(acc => {
                const totp = totpMap[acc.id];
                const isSelected = selectedIds.includes(acc.id);
                const progressPercent = Math.round(((acc.currentDay || 1) / 14) * 100);
                const isPwVisible = !!showPasswordMap[acc.id];
                const badge = STATUS_BADGE[acc.status] ?? STATUS_BADGE.warming;

                return (
                  <motion.div
                    key={acc.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  >
                    <div
                      className={`p-3.5 bg-surface rounded-2xl border transition-all space-y-2.5 shadow-elev-1 ${
                        isSelected ? 'border-accent ring-1 ring-accent/30' : 'border-line'
                      }`}
                    >
                      {/* 1. Top bar: checkbox + status pill + card actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => {
                              setSelectedIds(prev =>
                                isSelected ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                              );
                            }}
                            className="p-1 -m-1 text-ink-3 hover:text-accent transition shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-accent" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <span
                            className={`text-caption px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 shrink-0 ${badge.cls}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {acc.status === 'completed'
                              ? '14 天已出师'
                              : acc.status === 'paused'
                              ? '已暂停'
                              : `养号第 ${acc.currentDay || 1} 天`}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 text-ink-3">
                          <button
                            onClick={() => handleToggleAccountStatus(acc)}
                            className={`px-2 py-0.5 rounded-full text-caption font-semibold transition ${
                              acc.status === 'paused'
                                ? 'bg-warn/10 text-warn'
                                : 'hover:text-ink hover:bg-surface-2'
                            }`}
                            title={acc.status === 'paused' ? '点击恢复养号' : '点击暂停打卡'}
                          >
                            <span>{acc.status === 'paused' ? '恢复' : '暂停'}</span>
                          </button>

                          <button
                            onClick={() => {
                              sound.playTap();
                              setEditingAccount(acc);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:text-accent rounded-lg hover:bg-surface-2 transition"
                            title="编辑账号详情"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="p-1.5 hover:text-danger rounded-lg hover:bg-surface-2 transition"
                            title="删除账号"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 2. Primary email container */}
                      <div
                        onClick={() => copyText(acc.email, acc.id + '_email', '谷歌账号')}
                        className="bg-surface-2 hover:bg-surface-3/70 p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer group/email transition active:scale-[0.99]"
                        title="点击直接复制账号"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-caption text-ink-3 font-medium leading-none mb-1 flex items-center gap-1.5">
                            <span>Google / Gmail 账号</span>
                            <span className="text-2xs opacity-0 group-hover/email:opacity-100 text-accent transition-opacity">
                              · 点击复制
                            </span>
                          </div>
                          <div className="text-body font-bold font-mono text-ink break-all select-all leading-snug group-hover/email:text-accent transition-colors">
                            {acc.email}
                          </div>
                        </div>

                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            copyText(acc.email, acc.id + '_email', '谷歌账号');
                          }}
                          className="shrink-0"
                          title="点击复制账号"
                        >
                          {copiedId === acc.id + '_email' ? (
                            <Check className="w-3 h-3 text-ok" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === acc.id + '_email' ? '已复制' : '复制账号'}</span>
                        </Button>
                      </div>

                      {/* 3. Meta tags: country, category & password view/copy */}
                      <div className="flex items-center flex-wrap gap-1.5">
                        {acc.country && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-2 text-ink-2 text-caption font-medium inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-ink-3" />
                            {acc.country}
                          </span>
                        )}

                        {acc.category && acc.category !== '未分类' && (
                          <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-caption font-medium inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {acc.category}
                          </span>
                        )}

                        {acc.password && (
                          <div className="inline-flex items-center bg-surface-2 rounded-full px-2 py-0.5 gap-1 text-caption text-ink-2">
                            <Key className="w-3 h-3 text-warn shrink-0" />
                            <span className="font-mono select-all">{isPwVisible ? acc.password : '••••••••'}</span>
                            <button
                              onClick={() => toggleShowPassword(acc.id)}
                              className="text-ink-3 hover:text-ink p-0.5"
                              title={isPwVisible ? '隐藏密码' : '显示密码'}
                            >
                              {isPwVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => copyText(acc.password!, acc.id + '_pw', '密码')}
                              className="text-accent font-semibold px-0.5"
                              title="复制密码"
                            >
                              {copiedId === acc.id + '_pw' ? '已复制' : '复制'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 4. 14-day progress bar & today goal */}
                      <div className="space-y-1.5 bg-surface-2/60 p-2.5 rounded-xl">
                        <div className="flex items-center justify-between text-caption text-ink-3 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-warn" />
                            <span>养号周期进度</span>
                          </span>
                          <span className="font-bold text-ink-2">
                            Day {acc.currentDay || 1} / 14 ({progressPercent}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${acc.status === 'completed' ? 'bg-ok' : 'bg-accent'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="text-caption text-ink-3 truncate flex items-center gap-1">
                          <Flame className="w-3 h-3 text-warn shrink-0" />
                          今日目标：{GOOGLE_WARMING_SCHEDULE[acc.currentDay || 1]?.title || '系统安全打卡'}
                        </div>
                      </div>

                      {/* 5. 2FA TOTP live code box */}
                      {totp && (
                        <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Clock className="w-4 h-4 text-accent shrink-0" />
                            <div className="min-w-0">
                              <div className="text-caption text-accent font-medium leading-none mb-1">
                                2FA 动态口令
                              </div>
                              <div className="font-mono text-body font-bold text-accent tracking-wider">
                                {totp.code.length === 6
                                  ? `${totp.code.slice(0, 3)} ${totp.code.slice(3)}`
                                  : totp.code}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <TotpCountdown />

                            <Button variant="primary" size="sm" onClick={() => copyText(totp.code, acc.id + '_totp', '2FA 动态码')}>
                              {copiedId === acc.id + '_totp' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedId === acc.id + '_totp' ? '已复制' : '复制'}</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 6. Recovery email & note & backup codes */}
                      {(acc.recoveryEmail || acc.note || acc.backupCodes) && (
                        <div className="space-y-1 text-caption pt-1 text-ink-2 border-t border-line/70">
                          {acc.recoveryEmail && (
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate flex items-center gap-1">
                                <Mail className="w-3 h-3 text-ink-3 shrink-0" />
                                辅: <span className="text-ink font-mono select-all">{acc.recoveryEmail}</span>
                              </span>
                              <button
                                onClick={() => copyText(acc.recoveryEmail!, acc.id + '_rec', '辅助邮箱')}
                                className="text-ink-3 hover:text-accent shrink-0"
                              >
                                {copiedId === acc.id + '_rec' ? '已复制' : '复制'}
                              </button>
                            </div>
                          )}
                          {acc.backupCodes && (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ok font-medium truncate inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 shrink-0" />
                                包含安全备用码
                              </span>
                              <button
                                onClick={() => copyText(acc.backupCodes!, acc.id + '_bc', '备用码')}
                                className="text-ink-3 hover:text-accent shrink-0"
                              >
                                {copiedId === acc.id + '_bc' ? '已复制备用码' : '复制备用码'}
                              </button>
                            </div>
                          )}
                          {acc.note && (
                            <div className="text-caption text-ink-3 line-clamp-2 flex items-start gap-1">
                              <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                              备注: {acc.note}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 7. Footer: last warmed + primary action */}
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-line/70">
                        <div className="text-caption text-ink-3 truncate">
                          {acc.lastWarmedAt
                            ? `上次: ${new Date(acc.lastWarmedAt).toLocaleDateString()}`
                            : '尚未开始打卡'}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {acc.status === 'completed' ? (
                            <div className="px-3 py-1.5 bg-ok/10 text-ok rounded-full text-caption font-bold flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              <span>已圆满出师</span>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setActiveAccount(acc);
                                setDayActionChecks({});
                              }}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>今日打卡 (D{acc.currentDay || 1})</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {!renderAllGw && filteredAccounts.length > 100 && (
              <button
                onClick={() => setRenderAllGw(true)}
                className="w-full py-3 text-caption font-semibold text-ink-2 bg-surface border border-line rounded-2xl tactile-press"
              >
                显示全部 {filteredAccounts.length} 条
              </button>
            )}
          </div>
          </NowSecondProvider>
        )}
      </div>

      {/* 14-Day workspace checklist sheet */}
      <BottomSheet
        isOpen={!!activeAccount && !!activeTaskDetails}
        onClose={() => setActiveAccount(null)}
        title={activeAccount ? `D${activeAccount.currentDay || 1} 任务 · ${activeAccount.email}` : ''}
        subtitle={activeTaskDetails ? `${activeTaskDetails.title} · 当前第 ${activeAccount?.currentDay || 1}/14 天` : ''}
        maxHeight="max-h-[92dvh]"
        footer={
          activeAccount && activeTaskDetails && (
            <div className="space-y-2">
              <div className="text-caption text-ink-3 text-center flex items-center justify-center gap-1">
                {isActiveAccountWarmedToday && <Flame className="w-3 h-3 text-warn" />}
                {isActiveAccountWarmedToday
                  ? '今日已打卡（开启顶部「测试打卡」可跳过 24 小时限制）'
                  : '核对各项实操无误后，点击右侧完成打卡'}
              </div>

              <div className="flex items-center gap-2.5">
                <Button type="button" variant="neutral" size="md" className="flex-1" onClick={() => setActiveAccount(null)}>
                  关闭
                </Button>

                {activeAccount.currentDay >= 14 ? (
                  <div className="flex-1 py-2.5 bg-ok/10 text-ok rounded-full text-sub font-bold flex items-center justify-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>已圆满达成 14 天</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="flex-1"
                    disabled={isActiveAccountWarmedToday}
                    onClick={() => {
                      haptics.impactMedium();
                      handleWarmStep(activeAccount);
                    }}
                  >
                    <Flame className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">完成打卡 · 晋级第 {(activeAccount.currentDay || 1) + 1} 天</span>
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {activeAccount && activeTaskDetails && (
          <div className="space-y-3 pb-2">
            <div className="p-3.5 bg-accent/10 rounded-2xl text-sub text-ink-2 leading-relaxed">
              <p className="font-semibold mb-1 flex items-center gap-1.5 text-ink">
                <Lightbulb className="w-4 h-4 text-accent" />
                <span>本日养号实操目标</span>
              </p>
              <p>{activeTaskDetails.description}</p>
            </div>

            {/* Action checklist */}
            <div className="space-y-2">
              <div className="text-sub font-bold text-ink">实操待办核验清单（点击打勾标记已完成）：</div>
              {activeTaskDetails.actions.map(act => {
                const isChecked = !!dayActionChecks[act.key];
                return (
                  <div
                    key={act.key}
                    onClick={() => {
                      sound.playTap();
                      haptics.selection();
                      setDayActionChecks(prev => ({ ...prev, [act.key]: !prev[act.key] }));
                    }}
                    className={`p-3 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                      isChecked
                        ? 'bg-ok/5 border-ok/30'
                        : 'bg-surface-2/60 border-line hover:bg-surface-2'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-ink-3" />
                      )}
                    </div>
                    <span
                      className={`text-sub leading-relaxed ${
                        isChecked ? 'line-through text-ink-3 font-medium' : 'text-ink font-semibold'
                      }`}
                    >
                      {act.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Account quick credentials inspector */}
            <div className="p-3.5 bg-surface-2 rounded-2xl space-y-2.5 text-sub">
              <div className="font-bold text-ink flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-accent" />
                  <span>账号凭据速查与一键复制</span>
                </span>
                {activeAccount.country && (
                  <span className="text-caption text-ink-3 font-normal">归属地：{activeAccount.country}</span>
                )}
              </div>

              {activeAccount.password && (
                <div className="flex items-center justify-between gap-2 text-caption">
                  <span className="text-ink-3 shrink-0">登录密码：</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono bg-surface px-2 py-0.5 rounded-lg text-caption truncate select-all">
                      {activeAccount.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(activeAccount.password!, 'modal_pw')}
                      className="text-ink-3 hover:text-accent shrink-0 p-1"
                      title="复制密码"
                    >
                      {copiedId === 'modal_pw' ? (
                        <Check className="w-3.5 h-3.5 text-ok" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {totpMap[activeAccount.id] && (
                <div className="flex items-center justify-between gap-2 text-caption">
                  <span className="text-ink-3 shrink-0">2FA 实时口令：</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-accent text-body tracking-wider">
                      {totpMap[activeAccount.id].code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(totpMap[activeAccount.id].code, 'modal_totp')}
                      className="text-ink-3 hover:text-accent shrink-0 p-1"
                      title="复制 2FA 口令"
                    >
                      {copiedId === 'modal_totp' ? (
                        <Check className="w-3.5 h-3.5 text-ok" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeAccount.backupCodes && (
                <div className="space-y-1 pt-1.5 border-t border-line">
                  <span className="text-caption text-ink-3">备用安全码：</span>
                  <div className="font-mono text-caption bg-surface p-2 rounded-xl whitespace-pre-wrap leading-relaxed select-all text-ink-2">
                    {activeAccount.backupCodes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Multi-mode import sheet */}
      <BottomSheet
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="导入谷歌账号"
        subtitle="支持 3D平台 JSON 备份、多行文本及 AI 智能解析"
        maxHeight="max-h-[92dvh]"
      >
        <div className="space-y-3.5 pb-2">
          {/* Import tab selector */}
          <SegmentedControl
            groupId="gw-import-tabs"
            value={importTab}
            onChange={id => setImportTab(id as ImportTab)}
            items={[
              { id: 'file', label: 'JSON 备份', icon: FileJson },
              { id: 'text', label: '文本导入', icon: FileText },
              { id: 'ai', label: '智能解析', icon: ScanText },
            ]}
          />

          {/* Tab 1: JSON file upload */}
          {importTab === 'file' && (
            <div className="py-7 px-3 border-2 border-dashed border-line rounded-2xl text-center space-y-3">
              <FileJson className="w-9 h-9 text-warn mx-auto" strokeWidth={1.5} />
              <div>
                <p className="text-sub font-bold text-ink">选择或拖放 3D 平台导出的 JSON 备份文件</p>
                <p className="text-caption text-ink-3 mt-1">
                  支持 <code className="font-mono">google-warming-backup-*.json</code>
                  ，完整恢复账号、密码、2FA、备用码与进度
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFileSelected}
                className="hidden"
              />

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
              >
                选择 JSON 文件并导入
              </Button>
            </div>
          )}

          {/* Tab 2 & 3: Textarea input */}
          {(importTab === 'text' || importTab === 'ai') && (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-caption text-ink-3">
                  {importTab === 'text'
                    ? '支持 邮箱----密码----辅助邮箱----2FA密钥----地区 格式'
                    : '粘贴任意格式的未结构化账号文本，AI 自动提取关键字段'}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-caption text-ink-3">默认分类:</span>
                  <Input
                    type="text"
                    value={importCategory}
                    onChange={e => setImportCategory(e.target.value)}
                    className="w-24 px-2 py-1"
                  />
                </div>
              </div>

              <Textarea
                rows={6}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={
                  importTab === 'text'
                    ? `example@gmail.com----pwd123----rec@mail.com----JBSWY3DPEHPK3PXP----美国
sample2@gmail.com----pwd456----rec2@mail.com----MZXW6YTBOI======----日本`
                    : '粘贴任何形式的文本，AI 会自动识别 Gmail、密码、辅助邮箱、两步验证秘钥等...'
                }
                className="font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const sample = `example1@gmail.com----Password123----recovery1@example.com----JBSWY3DPEHPK3PXP----美国----3191 6344----GCP----主力开发号
example2@gmail.com----Password456----recovery2@example.com----MZXW6YTBOI======----中国香港----5521 8892----AdSense----创作者频道`;
                    setImportText(sample);
                  }}
                >
                  填入示范数据
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={isAiParsing}
                  onClick={importTab === 'text' ? handleImportTextSubmit : handleAiParseSubmit}
                >
                  {isAiParsing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : importTab === 'ai' ? (
                    <ScanText className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isAiParsing ? 'AI 解析中...' : importTab === 'ai' ? 'AI 识别并导入' : '立即解析导入'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Password generator sheet */}
      <BottomSheet
        isOpen={showPasswordGenModal}
        onClose={() => setShowPasswordGenModal(false)}
        title="强密码生成器"
        subtitle="快速生成安全随机密码"
      >
        <div className="space-y-4 pb-2">
          <div className="p-3.5 bg-surface-2 rounded-2xl flex items-center justify-between gap-2">
            <span className="font-mono text-body font-bold text-ink break-all select-all">
              {generatedPassword || '点击下方重新生成'}
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => copyText(generatedPassword, 'gen_pw')}
              className="shrink-0"
            >
              {copiedId === 'gen_pw' ? '已复制' : '复制'}
            </Button>
          </div>

          <Field label={`密码长度：${genPasswordLength} 位`}>
            <input
              type="range"
              min="8"
              max="32"
              value={genPasswordLength}
              onChange={e => setGenPasswordLength(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </Field>

          <Button
            type="button"
            variant="neutral"
            size="md"
            className="w-full"
            onClick={() => {
              haptics.selection();
              handleGeneratePassword();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>换一个更复杂的强密码</span>
          </Button>
        </div>
      </BottomSheet>

      {/* Account edit / create sheet */}
      <BottomSheet
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editingAccount.id ? '编辑谷歌账号详情' : '添加新的谷歌账号'}
        subtitle="支持 2FA、密码与备用安全码管理"
        maxHeight="max-h-[92dvh]"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4 pb-2">
          <Field label="Google / Gmail 邮箱" required>
            <Input
              type="email"
              required
              value={editingAccount.email || ''}
              onChange={e => setEditingAccount({ ...editingAccount, email: e.target.value })}
              placeholder="your.account@gmail.com"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="登录密码">
              <Input
                type="text"
                value={editingAccount.password || ''}
                onChange={e => setEditingAccount({ ...editingAccount, password: e.target.value })}
                placeholder="密码"
                className="font-mono"
              />
            </Field>
            <Field label="辅助恢复邮箱">
              <Input
                type="email"
                value={editingAccount.recoveryEmail || ''}
                onChange={e => setEditingAccount({ ...editingAccount, recoveryEmail: e.target.value })}
                placeholder="recovery@..."
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="2FA 密钥 (Base32)">
              <Input
                type="text"
                value={editingAccount.twoFASecret || ''}
                onChange={e => setEditingAccount({ ...editingAccount, twoFASecret: e.target.value.toUpperCase() })}
                placeholder="JBSWY3DPEHPK3PXP"
                className="font-mono"
              />
            </Field>
            <Field label="归属国家/地区">
              <Input
                type="text"
                value={editingAccount.country || ''}
                onChange={e => setEditingAccount({ ...editingAccount, country: e.target.value })}
                placeholder="如：美国、中国香港、日本"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="分组/分类">
              <Input
                type="text"
                value={editingAccount.category || '未分类'}
                onChange={e => setEditingAccount({ ...editingAccount, category: e.target.value })}
                placeholder="GCP / AdSense"
              />
            </Field>
            <Field label="当前阶段天数">
              <Input
                type="number"
                min="1"
                max="14"
                value={editingAccount.currentDay || 1}
                onChange={e => setEditingAccount({ ...editingAccount, currentDay: Number(e.target.value) })}
              />
            </Field>
            <Field label="养号状态">
              <Select
                value={editingAccount.status || 'warming'}
                onChange={e =>
                  setEditingAccount({ ...editingAccount, status: e.target.value as GoogleWarmingAccount['status'] })
                }
              >
                <option value="warming">养号中</option>
                <option value="completed">已出师</option>
                <option value="paused">已暂停</option>
              </Select>
            </Field>
          </div>

          <Field label="备用安全码 (8 位数字，空格或换行分隔)">
            <Textarea
              rows={2}
              value={editingAccount.backupCodes || ''}
              onChange={e => setEditingAccount({ ...editingAccount, backupCodes: e.target.value })}
              placeholder="3191 6344 6829 7625 9012 4321..."
              className="font-mono"
            />
          </Field>

          <Field label="备注信息">
            <Input
              type="text"
              value={editingAccount.note || ''}
              onChange={e => setEditingAccount({ ...editingAccount, note: e.target.value })}
              placeholder="用于海外业务/Claude绑卡/YouTube开通等"
            />
          </Field>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button type="button" variant="ghost" size="md" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary" size="md" className="min-w-[108px]">
              保存账号
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
