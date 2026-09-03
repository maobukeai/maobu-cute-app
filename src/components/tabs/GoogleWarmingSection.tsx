import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import confetti from 'canvas-confetti';
import {
  Globe,
  Plus,
  Upload,
  Download,
  Key,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  Sliders,
  Trash2,
  Edit2,
  X,
  Sparkles,
  RefreshCw,
  HelpCircle,
  FileJson,
  CheckSquare,
  Square,
  ShieldCheck,
  Flame,
  Award,
  Eye,
  EyeOff,
} from 'lucide-react';

interface GoogleWarmingSectionProps {
  accounts: GoogleWarmingAccount[];
  onUpdateAccounts: (accounts: GoogleWarmingAccount[]) => void;
  providers?: AIProvider[];
  accentColor?: AccentColor;
}

export const GoogleWarmingSection: React.FC<GoogleWarmingSectionProps> = ({
  accounts,
  onUpdateAccounts,
  providers = [],
  accentColor = 'wechat',
}) => {
  // Test Mode toggle (allows consecutive check-ins without waiting 24 hours)
  const [testMode, setTestMode] = useState(true);

  // Search and Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'warming' | 'completed' | 'paused'>('all');

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
  const [importTab, setImportTab] = useState<'file' | 'text' | 'ai'>('file');
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

  // Update 2FA TOTP dynamic codes every second
  useEffect(() => {
    let isMounted = true;
    const updateTotps = async () => {
      const nextMap: Record<string, { code: string; remainingSeconds: number; progress: number }> = {};
      for (const acc of accounts) {
        if (acc.twoFASecret) {
          try {
            const res = await generateTOTP(acc.twoFASecret);
            nextMap[acc.id] = res;
          } catch {
            // ignore invalid secret
          }
        }
      }
      if (isMounted) setTotpMap(nextMap);
    };

    updateTotps();
    const timer = setInterval(updateTotps, 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [accounts]);

  // Copy helper
  const copyText = (text: string, id: string) => {
    sound.playTap();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const q = searchQuery.trim().toLowerCase();
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
  }, [accounts, searchQuery, selectedCategory, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: accounts.length,
      warming: accounts.filter(a => a.status === 'warming').length,
      completed: accounts.filter(a => a.status === 'completed').length,
      paused: accounts.filter(a => a.status === 'paused').length,
    };
  }, [accounts]);

  // Handle single account check-in (Warm Step)
  const handleWarmStep = (acc: GoogleWarmingAccount) => {
    sound.playSuccess();
    confetti({
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
    confetti({ particleCount: 70, spread: 80 });

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
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个谷歌账号吗？此操作不可逆！`)) return;
    sound.playTap();
    const updated = accounts.filter(a => !selectedIds.includes(a.id));
    onUpdateAccounts(updated);
    setSelectedIds([]);
  };

  // Single Delete
  const handleDeleteAccount = (id: string) => {
    if (!window.confirm('确定要删除此谷歌养号账号吗？')) return;
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
        confetti({ particleCount: 60, spread: 70 });
        alert(`🎉 成功导入 ${res.importedCount} 个谷歌账号！(已跳过 ${res.skippedCount} 个已存在邮箱)`);
        setShowImportModal(false);
      } catch (err: any) {
        alert(`导入失败: ${err.message || '文件解析错误'}`);
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
      alert('未识别到有效的账号格式，请确保每行包含有效的 Gmail 邮箱');
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
    confetti({ particleCount: 50, spread: 60 });
    alert(`🎉 成功导入 ${validToAdd.length} 个账号！(跳过重复 ${skipped} 个)`);
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
      confetti({ particleCount: 60, spread: 70 });
      alert(`✨ AI 智能解析完成！共识别录入 ${validToAdd.length} 个账号！`);
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      alert(`AI 解析失败: ${err.message}`);
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#EDEDED] dark:bg-[#111111]">
      {/* 1. Mobile-First Header Toolbar */}
      <div className="p-3 sm:p-3.5 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 shrink-0 space-y-2.5">
        {/* Row 1: App Branding & Title + Test Mode Toggle Switch */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  谷歌 14 天科学养号
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold shrink-0">
                  全自动防风控
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">
                全球权重梯级晋升 · 14天系统化防封打卡
              </p>
            </div>
          </div>

          {/* Test Mode Switch Chip */}
          <label
            className={`shrink-0 px-2 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition border select-none ${
              testMode
                ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                : 'bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
            }`}
            title="开启后跳过 24 小时打卡间隔限制，可连续测试 14 天打卡流转"
          >
            <input
              type="checkbox"
              checked={testMode}
              onChange={e => {
                sound.playToggle();
                setTestMode(e.target.checked);
              }}
              className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
            />
            <span className="text-[11px] whitespace-nowrap font-medium">测试打卡</span>
          </label>
        </div>

        {/* Row 2: Touch-friendly Action Buttons Bar */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <button
            onClick={() => {
              sound.playTap();
              setEditingAccount({
                status: 'warming',
                currentDay: 1,
                category: '未分类',
              });
              setShowEditModal(true);
            }}
            className="flex-1 py-2 px-3 bg-[#07C160] hover:bg-[#06AD56] active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-xs transition"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">添加账号</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setShowImportModal(true);
            }}
            className="py-2 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 active:scale-[0.98] text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
            title="从 3D平台 JSON 备份 / 文本 / AI 导入"
          >
            <Upload className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="whitespace-nowrap">导入</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="py-2 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 active:scale-[0.98] text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
            title="导出为 3D 平台兼容 JSON 备份"
          >
            <Download className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span className="whitespace-nowrap">备份</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              handleGeneratePassword();
              setShowPasswordGenModal(true);
            }}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 active:scale-[0.98] text-zinc-700 dark:text-zinc-300 rounded-xl transition shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
            title="随机强密码生成器"
          >
            <Key className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
          </button>
        </div>

        {/* Row 3: 4 Stats Cards */}
        <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
          <div
            onClick={() => {
              sound.playTap();
              setStatusFilter('all');
            }}
            className={`p-1.5 sm:p-2 rounded-xl cursor-pointer transition select-none ${
              statusFilter === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100/90 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60'
            }`}
          >
            <div className="text-[10px] opacity-70 whitespace-nowrap">全部账号</div>
            <div className="text-sm font-extrabold">{stats.total}</div>
          </div>
          <div
            onClick={() => {
              sound.playTap();
              setStatusFilter('warming');
            }}
            className={`p-1.5 sm:p-2 rounded-xl cursor-pointer transition select-none ${
              statusFilter === 'warming'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60'
            }`}
          >
            <div className="text-[10px] opacity-80 whitespace-nowrap">🌱 养号中</div>
            <div className="text-sm font-extrabold">{stats.warming}</div>
          </div>
          <div
            onClick={() => {
              sound.playTap();
              setStatusFilter('completed');
            }}
            className={`p-1.5 sm:p-2 rounded-xl cursor-pointer transition select-none ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60'
            }`}
          >
            <div className="text-[10px] opacity-80 whitespace-nowrap">🏆 已出师</div>
            <div className="text-sm font-extrabold">{stats.completed}</div>
          </div>
          <div
            onClick={() => {
              sound.playTap();
              setStatusFilter('paused');
            }}
            className={`p-1.5 sm:p-2 rounded-xl cursor-pointer transition select-none ${
              statusFilter === 'paused'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100/60'
            }`}
          >
            <div className="text-[10px] opacity-80 whitespace-nowrap">⏸️ 已暂停</div>
            <div className="text-sm font-extrabold">{stats.paused}</div>
          </div>
        </div>

        {/* Row 4: Search Bar with Clear Button */}
        <div className="relative pt-0.5">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索 Gmail 邮箱、地区、备注、分组..."
            className="w-full pl-8.5 pr-8 py-1.5 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-[#07C160] transition border border-transparent focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => {
                sound.playTap();
                setSearchQuery('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 5: Horizontally Scrollable Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
          {categories.map(cat => {
            const count =
              cat === 'all'
                ? accounts.length
                : cat === '未分类'
                ? accounts.filter(a => !a.category || a.category === '未分类').length
                : accounts.filter(a => a.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => {
                  sound.playTap();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-200/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300/70'
                }`}
              >
                <span>{cat === 'all' ? '全部' : cat}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Batch Operations Bar (Mobile Adaptive) */}
        {selectedIds.length > 0 && (
          <div className="p-2.5 bg-zinc-900 text-white dark:bg-zinc-800 rounded-2xl space-y-2 text-xs shadow-md animate-scale-in">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1.5">
                <CheckSquare className="w-4 h-4 text-[#07C160]" />
                <span>已选 {selectedIds.length} 个账号</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    if (selectedIds.length === filteredAccounts.length) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(filteredAccounts.map(a => a.id));
                    }
                  }}
                  className="text-[11px] text-zinc-300 hover:text-white underline"
                >
                  {selectedIds.length === filteredAccounts.length ? '取消全选' : '全选全部'}
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              <button
                onClick={handleBatchWarm}
                className="py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl font-bold text-center transition"
              >
                一键打卡
              </button>
              <button
                onClick={() => handleBatchStatus('completed')}
                className="py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl font-medium text-center transition"
              >
                设为完成
              </button>
              <button
                onClick={() => handleBatchStatus('paused')}
                className="py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 rounded-xl font-medium text-center transition"
              >
                暂停
              </button>
              <button
                onClick={handleBatchDelete}
                className="py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-xl font-medium text-center transition"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Mobile-Optimized Accounts List with Safe Bottom Padding */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 pb-28">
        {filteredAccounts.length === 0 ? (
          <div className="py-20 text-center space-y-3.5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-400">
              <Globe className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">未找到符合条件的谷歌账号</p>
              <p className="text-[11px] text-zinc-400">可调整搜索关键词、筛选条件，或一键导入备份文件</p>
            </div>
            <button
              onClick={() => {
                sound.playTap();
                setShowImportModal(true);
              }}
              className="px-4 py-2 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
            >
              从 3D 平台备份文件一键导入
            </button>
          </div>
        ) : (
          filteredAccounts.map(acc => {
            const totp = totpMap[acc.id];
            const isSelected = selectedIds.includes(acc.id);
            const progressPercent = Math.round(((acc.currentDay || 1) / 14) * 100);
            const isPwVisible = !!showPasswordMap[acc.id];

            return (
              <div
                key={acc.id}
                className={`p-3.5 bg-white dark:bg-[#1C1C1E] rounded-2xl border transition-all space-y-2.5 shadow-xs ${
                  isSelected
                    ? 'border-[#07C160] ring-1.5 ring-[#07C160]/40'
                    : 'border-zinc-200/70 dark:border-zinc-800/70 hover:border-amber-400/50'
                }`}
              >
                {/* 1. Card Top Bar: Checkbox + Status Pill + Card Action Icons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <button
                      onClick={() => {
                        setSelectedIds(prev =>
                          isSelected ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                        );
                      }}
                      className="p-1 -m-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#07C160]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center space-x-1 shrink-0 ${
                        acc.status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : acc.status === 'paused'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {acc.status === 'completed'
                        ? '🏆 14天已出师'
                        : acc.status === 'paused'
                        ? '⏸️ 已暂停'
                        : `🌱 养号第 ${acc.currentDay || 1} 天`}
                    </span>
                  </div>

                  {/* Card Actions: Toggle Pause/Resume, Edit, Delete */}
                  <div className="flex items-center space-x-1 shrink-0 text-zinc-400">
                    <button
                      onClick={() => handleToggleAccountStatus(acc)}
                      className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold flex items-center space-x-0.5 transition ${
                        acc.status === 'paused'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
                      className="p-1 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="编辑账号详情"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="删除账号"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Primary Email Container: Full Display + One-Tap Copy */}
                <div className="bg-zinc-50/80 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-zinc-400 font-medium leading-none mb-1">
                      Google / Gmail 账号
                    </div>
                    <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 break-all select-all leading-snug">
                      {acc.email}
                    </div>
                  </div>

                  <button
                    onClick={() => copyText(acc.email, acc.id + '_email')}
                    className="px-2 py-1 bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-700/80 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-lg text-[10px] font-semibold flex items-center space-x-1 shrink-0 active:scale-95 transition"
                    title="点击复制邮箱"
                  >
                    {copiedId === acc.id + '_email' ? (
                      <Check className="w-3 h-3 text-[#07C160]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedId === acc.id + '_email' ? '已复制' : '复制'}</span>
                  </button>
                </div>

                {/* 3. Meta Tags: Country, Category & Quick Password View/Copy */}
                <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                  {acc.country && (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                      📍 {acc.country}
                    </span>
                  )}

                  {acc.category && acc.category !== '未分类' && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 font-medium">
                      🏷️ {acc.category}
                    </span>
                  )}

                  {acc.password && (
                    <div className="inline-flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md px-1.5 py-0.5 space-x-1 text-zinc-600 dark:text-zinc-300">
                      <Key className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="font-mono select-all">
                        {isPwVisible ? acc.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => toggleShowPassword(acc.id)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                        title={isPwVisible ? '隐藏密码' : '显示密码'}
                      >
                        {isPwVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => copyText(acc.password!, acc.id + '_pw')}
                        className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold px-1 hover:underline"
                        title="复制密码"
                      >
                        {copiedId === acc.id + '_pw' ? '已复制' : '复制'}
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. 14-Day Progress Bar & Today Goal */}
                <div className="space-y-1 bg-zinc-50/50 dark:bg-zinc-800/30 p-2 rounded-xl border border-zinc-100/60 dark:border-zinc-800/40">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      <span>养号周期进度</span>
                    </span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      Day {acc.currentDay || 1} / 14 ({progressPercent}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        acc.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate pt-0.5">
                    🎯 今日目标：
                    {GOOGLE_WARMING_SCHEDULE[acc.currentDay || 1]?.title || '系统安全打卡'}
                  </div>
                </div>

                {/* 5. 2FA TOTP Live Dynamic Code Box */}
                {totp && (
                  <div className="p-2.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-none mb-1">
                          2FA 动态口令
                        </div>
                        <div className="font-mono text-base font-extrabold text-blue-700 dark:text-blue-300 tracking-wider">
                          {totp.code.length === 6
                            ? `${totp.code.slice(0, 3)} ${totp.code.slice(3)}`
                            : totp.code}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-blue-500 font-mono font-bold">
                          {totp.remainingSeconds}s
                        </div>
                        <div className="w-10 h-1 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden mt-0.5">
                          <div
                            className="h-full bg-blue-600 transition-all duration-1000"
                            style={{ width: `${totp.progress}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => copyText(totp.code, acc.id + '_totp')}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition"
                      >
                        {copiedId === acc.id + '_totp' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === acc.id + '_totp' ? '已复制' : '复制'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Recovery Email & Note & Backup Codes (All visible with copy buttons) */}
                {(acc.recoveryEmail || acc.note || acc.backupCodes) && (
                  <div className="space-y-1 text-[11px] pt-1 text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80">
                    {acc.recoveryEmail && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">
                          📧 辅: <span className="text-zinc-700 dark:text-zinc-300 font-mono select-all">{acc.recoveryEmail}</span>
                        </span>
                        <button
                          onClick={() => copyText(acc.recoveryEmail!, acc.id + '_rec')}
                          className="text-[10px] text-zinc-400 hover:text-blue-500 shrink-0"
                        >
                          {copiedId === acc.id + '_rec' ? '已复制' : '复制'}
                        </button>
                      </div>
                    )}
                    {acc.backupCodes && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                          🛡️ 包含安全备用码
                        </span>
                        <button
                          onClick={() => copyText(acc.backupCodes!, acc.id + '_bc')}
                          className="text-[10px] text-zinc-400 hover:text-blue-500 shrink-0"
                        >
                          {copiedId === acc.id + '_bc' ? '已复制备用码' : '复制备用码'}
                        </button>
                      </div>
                    )}
                    {acc.note && (
                      <div className="text-[10px] text-zinc-400 line-clamp-2">
                        📝 备注: {acc.note}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Card Footer: Last Warmed At + Thumb-Friendly Primary Action Button */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-[10px] text-zinc-400 truncate">
                    {acc.lastWarmedAt
                      ? `上次: ${new Date(acc.lastWarmedAt).toLocaleDateString()}`
                      : '尚未开始打卡'}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {acc.status === 'completed' ? (
                      <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>已圆满出师</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          sound.playTap();
                          setActiveAccount(acc);
                          setDayActionChecks({});
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs transition"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>今日打卡 (D{acc.currentDay || 1})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. 14-Day Workspace Checklist Modal (今日任务核对与打卡) */}
      {activeAccount && activeTaskDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3.5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-extrabold text-sm shrink-0">
                  D{activeAccount.currentDay || 1}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate">
                    {activeAccount.email}
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {activeTaskDetails.title} · 当前第 {activeAccount.currentDay || 1}/14 天
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveAccount(null)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Description & Checklist */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <p className="font-semibold mb-0.5 flex items-center space-x-1">
                  <span>💡</span>
                  <span>本日养号实操目标</span>
                </p>
                <p>{activeTaskDetails.description}</p>
              </div>

              {/* Action Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  实操待办核验清单（点击打勾标记已完成）：
                </div>
                {activeTaskDetails.actions.map(act => {
                  const isChecked = !!dayActionChecks[act.key];
                  return (
                    <div
                      key={act.key}
                      onClick={() => {
                        sound.playTap();
                        setDayActionChecks(prev => ({ ...prev, [act.key]: !prev[act.key] }));
                      }}
                      className={`p-3 rounded-xl border transition flex items-start space-x-2.5 cursor-pointer ${
                        isChecked
                          ? 'bg-green-50/80 dark:bg-green-950/40 border-green-300 dark:border-green-800/60'
                          : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-[#07C160]" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <span
                        className={`text-xs leading-relaxed ${
                          isChecked
                            ? 'line-through text-zinc-400 font-medium'
                            : 'text-zinc-800 dark:text-zinc-200 font-semibold'
                        }`}
                      >
                        {act.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Account Quick Credentials Inspector */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2 text-xs">
                <div className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>🔑 账号凭据速查与一键复制</span>
                  {activeAccount.country && (
                    <span className="text-[10px] text-zinc-400 font-normal">
                      归属地：{activeAccount.country}
                    </span>
                  )}
                </div>

                {activeAccount.password && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400 shrink-0">登录密码：</span>
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-mono bg-zinc-200/60 dark:bg-zinc-700/60 px-2 py-0.5 rounded text-[11px] truncate select-all">
                        {activeAccount.password}
                      </span>
                      <button
                        onClick={() => copyText(activeAccount.password!, 'modal_pw')}
                        className="text-zinc-400 hover:text-blue-500 shrink-0 p-1"
                        title="复制密码"
                      >
                        {copiedId === 'modal_pw' ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {totpMap[activeAccount.id] && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400 shrink-0">2FA 实时口令：</span>
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm tracking-wider">
                        {totpMap[activeAccount.id].code}
                      </span>
                      <button
                        onClick={() => copyText(totpMap[activeAccount.id].code, 'modal_totp')}
                        className="text-zinc-400 hover:text-blue-500 shrink-0 p-1"
                        title="复制 2FA 口令"
                      >
                        {copiedId === 'modal_totp' ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeAccount.backupCodes && (
                  <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-[10px] text-zinc-400">备用安全码：</span>
                    <div className="font-mono text-[11px] bg-zinc-200/50 dark:bg-zinc-700/50 p-2 rounded-lg whitespace-pre-wrap leading-relaxed select-all">
                      {activeAccount.backupCodes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions: Responsive stacked/flex */}
            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="text-[10px] text-zinc-400 text-center sm:text-left">
                {isActiveAccountWarmedToday
                  ? '⚠️ 今日已打卡 (开启顶部「测试打卡」可跳过24小时限制)'
                  : '核对各项实操无误后，点击右侧完成打卡'}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveAccount(null)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold transition"
                >
                  关闭
                </button>

                {activeAccount.currentDay >= 14 ? (
                  <div className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>已圆满达成 14 天</span>
                  </div>
                ) : (
                  <button
                    disabled={isActiveAccountWarmedToday}
                    onClick={() => handleWarmStep(activeAccount)}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-xs transition ${
                      isActiveAccountWarmedToday
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white active:scale-95'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">完成打卡 ➔ 晋级第 {(activeAccount.currentDay || 1) + 1} 天</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Multi-mode Import Modal (支持 3D平台 JSON 备份文件、文本多行、AI智能解析) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  导入谷歌账号 (支持 3D平台备份)
                </h4>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Import Tab Selector */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setImportTab('file')}
                className={`py-1.5 px-1 rounded-lg transition text-center truncate ${
                  importTab === 'file'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                📁 JSON 备份
              </button>
              <button
                onClick={() => setImportTab('text')}
                className={`py-1.5 px-1 rounded-lg transition text-center truncate ${
                  importTab === 'text'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                📝 文本导入
              </button>
              <button
                onClick={() => setImportTab('ai')}
                className={`py-1.5 px-1 rounded-lg transition text-center truncate ${
                  importTab === 'ai'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                ✨ AI 解析
              </button>
            </div>

            {/* Tab 1: JSON File Upload */}
            {importTab === 'file' && (
              <div className="py-6 px-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-center space-y-3">
                <FileJson className="w-10 h-10 text-amber-500 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    选择或拖放 3D 平台导出的 JSON 备份文件
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    支持 <code className="font-mono">google-warming-backup-*.json</code>，完整恢复账号、密码、2FA、备用码与进度
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFileSelected}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  选择 JSON 文件并导入
                </button>
              </div>
            )}

            {/* Tab 2 & 3: Textarea input */}
            {(importTab === 'text' || importTab === 'ai') && (
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <span className="text-zinc-500 text-[11px]">
                    {importTab === 'text'
                      ? '支持 邮箱----密码----辅助邮箱----2FA密钥----地区 格式'
                      : '粘贴任意格式的未结构化账号文本，AI 自动提取关键字段'}
                  </span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span className="text-zinc-400 text-[10px]">默认分类:</span>
                    <input
                      type="text"
                      value={importCategory}
                      onChange={e => setImportCategory(e.target.value)}
                      className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs w-20 focus:outline-none"
                    />
                  </div>
                </div>

                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={
                    importTab === 'text'
                      ? `example@gmail.com----pwd123----rec@mail.com----JBSWY3DPEHPK3PXP----美国
sample2@gmail.com----pwd456----rec2@mail.com----MZXW6YTBOI======----日本`
                      : '粘贴任何形式的文本，AI 会自动识别 Gmail、密码、辅助邮箱、两步验证秘钥等...'
                  }
                  className="w-full h-32 sm:h-36 p-2.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono resize-none focus:outline-none focus:ring-1.5 focus:ring-amber-500"
                />

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => {
                      const sample = `alex.developer.2026@gmail.com----P@ssw0rd2026!Cute----backup_alex@hotmail.com----JBSWY3DPEHPK3PXP----美国----3191 6344----GCP----开发主力
sarah.creator.hk@gmail.com----M@obuCute2026#Safe----gkyhnzrzwmw@hotmail.com----MZXW6YTBOI======----中国香港----5521 8892----AdSense----YouTube创作者`;
                      setImportText(sample);
                    }}
                    className="px-3 py-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-xs"
                  >
                    填入示范数据
                  </button>

                  <button
                    disabled={isAiParsing}
                    onClick={importTab === 'text' ? handleImportTextSubmit : handleAiParseSubmit}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1 transition"
                  >
                    {isAiParsing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : importTab === 'ai' ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isAiParsing ? 'AI 解析中...' : importTab === 'ai' ? 'AI 识别并导入' : '立即解析导入'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Password Generator Modal */}
      {showPasswordGenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">强密码生成器</h4>
              </div>
              <button
                onClick={() => setShowPasswordGenModal(false)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 break-all select-all">
                  {generatedPassword || '点击下方重新生成'}
                </span>
                <button
                  onClick={() => copyText(generatedPassword, 'gen_pw')}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs shrink-0 ml-2"
                >
                  {copiedId === 'gen_pw' ? '已复制' : '复制'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>密码长度：{genPasswordLength} 位</span>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={genPasswordLength}
                  onChange={e => setGenPasswordLength(Number(e.target.value))}
                  className="w-32 accent-amber-500 cursor-pointer"
                />
              </div>

              <button
                onClick={handleGeneratePassword}
                className="w-full py-2 bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-zinc-300 dark:hover:bg-zinc-700 active:scale-95 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>换一个更复杂的强密码</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Account Edit / Create Modal (Mobile-Optimized Responsive Grid with Pinned Footer) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveAccount}
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in max-h-[88vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingAccount.id ? '编辑谷歌账号详情' : '添加新的谷歌账号'}
              </h4>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto py-2.5 space-y-3 pr-1 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Google / Gmail 邮箱 (必填)</label>
                <input
                  type="email"
                  required
                  value={editingAccount.email || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, email: e.target.value })}
                  placeholder="your.account@gmail.com"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160]"
                />
              </div>

              {/* Password & Recovery Email: Stack on mobile, 2 cols on sm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">登录密码</label>
                  <input
                    type="text"
                    value={editingAccount.password || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, password: e.target.value })}
                    placeholder="密码"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">辅助恢复邮箱</label>
                  <input
                    type="email"
                    value={editingAccount.recoveryEmail || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, recoveryEmail: e.target.value })}
                    placeholder="recovery@..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160]"
                  />
                </div>
              </div>

              {/* 2FA Secret & Country: Stack on mobile, 2 cols on sm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">2FA 密钥 (Base32)</label>
                  <input
                    type="text"
                    value={editingAccount.twoFASecret || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, twoFASecret: e.target.value.toUpperCase() })}
                    placeholder="JBSWY3DPEHPK3PXP"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">归属国家/地区</label>
                  <input
                    type="text"
                    value={editingAccount.country || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, country: e.target.value })}
                    placeholder="如：美国、中国香港、日本"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160]"
                  />
                </div>
              </div>

              {/* Category, Current Day, Status: Stack on mobile, 3 cols on sm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">分组/分类</label>
                  <input
                    type="text"
                    value={editingAccount.category || '未分类'}
                    onChange={e => setEditingAccount({ ...editingAccount, category: e.target.value })}
                    placeholder="GCP / AdSense"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">当前阶段天数</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={editingAccount.currentDay || 1}
                    onChange={e => setEditingAccount({ ...editingAccount, currentDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">养号状态</label>
                  <select
                    value={editingAccount.status || 'warming'}
                    onChange={e => setEditingAccount({ ...editingAccount, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160]"
                  >
                    <option value="warming">🌱 养号中</option>
                    <option value="completed">🏆 已出师</option>
                    <option value="paused">⏸️ 已暂停</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">备用安全码 (8 位数字，空格或换行分隔)</label>
                <textarea
                  value={editingAccount.backupCodes || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, backupCodes: e.target.value })}
                  placeholder="3191 6344 6829 7625 9012 4321..."
                  className="w-full h-16 p-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160] font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">备注信息</label>
                <input
                  type="text"
                  value={editingAccount.note || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, note: e.target.value })}
                  placeholder="用于海外业务/Claude绑卡/YouTube开通等"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#07C160]"
                />
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#07C160] hover:bg-[#06AD56] active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                保存账号
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
