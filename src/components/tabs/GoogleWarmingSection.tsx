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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      {/* 1. Header Toolbar */}
      <div className="p-3.5 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  谷歌 14 天科学养号工作台
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">
                  全自动信誉防风控
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                严格遵循全球权重晋升算法 · 14天系统化防封打卡
              </p>
            </div>
          </div>

          {/* Test Mode Switch & Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {/* Dev Test Mode Switch */}
            <label
              className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition border ${
                testMode
                  ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
              }`}
              title="开启后跳过 24 小时打卡间隔限制，可连续测试 14 天打卡流转"
            >
              <input
                type="checkbox"
                checked={testMode}
                onChange={e => setTestMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-[11px]">测试打卡</span>
            </label>

            <button
              onClick={() => {
                sound.playTap();
                handleGeneratePassword();
                setShowPasswordGenModal(true);
              }}
              className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              title="随机强密码生成器"
            >
              <Key className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportJSON}
              className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              title="导出为 3D 平台兼容 JSON 备份"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setShowImportModal(true);
              }}
              className="px-2.5 py-1.5 bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center space-x-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>导入</span>
            </button>

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
              className="px-2.5 py-1.5 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加账号</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-2 rounded-xl cursor-pointer transition ${
              statusFilter === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <div className="text-[10px] opacity-70">全部账号</div>
            <div className="text-sm font-extrabold">{stats.total}</div>
          </div>
          <div
            onClick={() => setStatusFilter('warming')}
            className={`p-2 rounded-xl cursor-pointer transition ${
              statusFilter === 'warming'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
            }`}
          >
            <div className="text-[10px] opacity-70">🌱 养号中</div>
            <div className="text-sm font-extrabold">{stats.warming}</div>
          </div>
          <div
            onClick={() => setStatusFilter('completed')}
            className={`p-2 rounded-xl cursor-pointer transition ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            <div className="text-[10px] opacity-70">🏆 已出师</div>
            <div className="text-sm font-extrabold">{stats.completed}</div>
          </div>
          <div
            onClick={() => setStatusFilter('paused')}
            className={`p-2 rounded-xl cursor-pointer transition ${
              statusFilter === 'paused'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
            }`}
          >
            <div className="text-[10px] opacity-70">⏸️ 已暂停</div>
            <div className="text-sm font-extrabold">{stats.paused}</div>
          </div>
        </div>

        {/* Search & Category Tabs */}
        <div className="flex items-center space-x-2 pt-1">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索 Gmail 邮箱、地区、备注..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07C160]"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  sound.playTap();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-200/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {cat === 'all' ? '全部' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Operations Bar (if selected) */}
        {selectedIds.length > 0 && (
          <div className="p-2 bg-zinc-900 text-white dark:bg-zinc-800 rounded-xl flex items-center justify-between text-xs animate-fade-in">
            <span className="font-semibold">已选 {selectedIds.length} 个账号</span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleBatchWarm}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold"
              >
                一键打卡
              </button>
              <button
                onClick={() => handleBatchStatus('completed')}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg"
              >
                设为完成
              </button>
              <button
                onClick={() => handleBatchStatus('paused')}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded-lg"
              >
                暂停
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded-lg"
              >
                删除
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-1 hover:bg-zinc-700 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Accounts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAccounts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Globe className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p className="text-xs text-zinc-500">未找到符合条件的谷歌账号</p>
            <button
              onClick={() => {
                sound.playTap();
                setShowImportModal(true);
              }}
              className="px-4 py-2 bg-[#07C160] text-white rounded-xl text-xs font-semibold"
            >
              从 3D 平台备份文件一键导入
            </button>
          </div>
        ) : (
          filteredAccounts.map(acc => {
            const totp = totpMap[acc.id];
            const isSelected = selectedIds.includes(acc.id);
            const progressPercent = Math.round(((acc.currentDay || 1) / 14) * 100);

            return (
              <div
                key={acc.id}
                className="p-3.5 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-xs hover:border-amber-400/40 transition space-y-2.5"
              >
                {/* Top row: Checkbox, Email, Country, Category, Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <button
                      onClick={() => {
                        setSelectedIds(prev =>
                          isSelected ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                        );
                      }}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#07C160]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {acc.email}
                    </span>

                    {acc.country && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0 font-medium">
                        📍 {acc.country}
                      </span>
                    )}

                    {acc.category && acc.category !== '未分类' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 shrink-0 font-medium">
                        {acc.category}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      acc.status === 'completed'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                        : acc.status === 'paused'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'
                    }`}
                  >
                    {acc.status === 'completed'
                      ? '🏆 14天已出师'
                      : acc.status === 'paused'
                      ? '⏸️ 已暂停'
                      : `🌱 养号第 ${acc.currentDay || 1} 天`}
                  </span>
                </div>

                {/* 14-Day Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                    <span>14 天养号周期进度</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      Day {acc.currentDay || 1} / 14 ({progressPercent}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        acc.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-linear-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 2FA TOTP Live Dynamic Code Row (If secret exists) */}
                {totp && (
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        2FA 动态口令：
                      </span>
                      <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-300 tracking-wider">
                        {totp.code}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-blue-500 font-mono font-bold">
                        {totp.remainingSeconds}s
                      </span>
                      <button
                        onClick={() => copyText(totp.code, acc.id + '_totp')}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-bold flex items-center space-x-0.5 shadow-xs"
                      >
                        {copiedId === acc.id + '_totp' ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === acc.id + '_totp' ? '已复制' : '复制'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Note & Recovery Email & Action Row */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                    {acc.recoveryEmail ? (
                      <span>辅: {acc.recoveryEmail}</span>
                    ) : acc.note ? (
                      <span>注: {acc.note}</span>
                    ) : (
                      <span>待打卡进阶</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Enter 14-Day Workspace Checklist */}
                    <button
                      onClick={() => {
                        sound.playTap();
                        setActiveAccount(acc);
                        setDayActionChecks({});
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>今日打卡</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playTap();
                        setEditingAccount(acc);
                        setShowEditModal(true);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="编辑账号详情"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="删除账号"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. 14-Day Workspace Checklist Modal (今日任务核对与打卡) */}
      {activeAccount && activeTaskDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-extrabold text-sm">
                  D{activeAccount.currentDay || 1}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {activeAccount.email}
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    {activeTaskDetails.title} · 当前第 {activeAccount.currentDay || 1}/14 天
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveAccount(null)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Description & Checklist */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <p className="font-semibold mb-0.5">💡 本日养号目标</p>
                <p>{activeTaskDetails.description}</p>
              </div>

              {/* Action Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  实操待办核验清单（点击打勾）：
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
                          ? 'bg-green-50/70 dark:bg-green-950/30 border-green-300 dark:border-green-800/50'
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">密码：</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono bg-zinc-200/60 dark:bg-zinc-700/60 px-2 py-0.5 rounded text-[11px]">
                        {activeAccount.password}
                      </span>
                      <button
                        onClick={() => copyText(activeAccount.password!, 'modal_pw')}
                        className="text-zinc-400 hover:text-blue-500"
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">2FA 实时口令：</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {totpMap[activeAccount.id].code}
                      </span>
                      <button
                        onClick={() => copyText(totpMap[activeAccount.id].code, 'modal_totp')}
                        className="text-zinc-400 hover:text-blue-500"
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
                    <div className="font-mono text-[11px] bg-zinc-200/50 dark:bg-zinc-700/50 p-1.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {activeAccount.backupCodes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center justify-between">
              <div className="text-[10px] text-zinc-400">
                {isActiveAccountWarmedToday
                  ? '⚠️ 今日已打卡 (开启顶部「测试打卡」可连续调试)'
                  : '核对完毕后，点击右侧完成打卡'}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveAccount(null)}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-semibold"
                >
                  关闭
                </button>

                {activeAccount.currentDay >= 14 ? (
                  <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1">
                    <Award className="w-4 h-4" />
                    <span>已圆满达成 14 天</span>
                  </div>
                ) : (
                  <button
                    disabled={isActiveAccountWarmedToday}
                    onClick={() => handleWarmStep(activeAccount)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs transition ${
                      isActiveAccountWarmedToday
                        ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>完成打卡 ➔ 晋级第 {activeAccount.currentDay + 1} 天</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Multi-mode Import Modal (支持 3D平台 JSON 备份文件、文本多行、AI智能解析) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  导入谷歌账号 (支持 3D平台备份)
                </h4>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Import Tab Selector */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setImportTab('file')}
                className={`py-1.5 rounded-lg transition ${
                  importTab === 'file'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                📁 3D平台 JSON 备份
              </button>
              <button
                onClick={() => setImportTab('text')}
                className={`py-1.5 rounded-lg transition ${
                  importTab === 'text'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                📝 分隔符文本导入
              </button>
              <button
                onClick={() => setImportTab('ai')}
                className={`py-1.5 rounded-lg transition ${
                  importTab === 'ai'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500'
                }`}
              >
                ✨ AI 智能解析
              </button>
            </div>

            {/* Tab 1: JSON File Upload */}
            {importTab === 'file' && (
              <div className="py-6 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-center space-y-3">
                <FileJson className="w-12 h-12 text-amber-500 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    选择或拖放 3D-Personal-Learning-Platform 导出的 JSON 备份文件
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    支持 <code className="font-mono">google-warming-backup-*.json</code>，完整还原密码、2FA、备用码、养号天数与状态
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  选择 JSON 文件并导入
                </button>
              </div>
            )}

            {/* Tab 2 & 3: Textarea input */}
            {(importTab === 'text' || importTab === 'ai') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    {importTab === 'text'
                      ? '支持 email----password----recoveryEmail----twoFASecret----country 格式'
                      : '粘贴任意格式的未结构化账号文本，AI 自动提取关键字段'}
                  </span>
                  <div className="flex items-center space-x-1">
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
                  className="w-full h-36 p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                <div className="flex items-center justify-end space-x-2">
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
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">强密码生成器</h4>
              </div>
              <button
                onClick={() => setShowPasswordGenModal(false)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full"
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
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs shrink-0 ml-2"
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
                className="w-full py-2 bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>换一个更复杂的</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Account Edit / Create Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAccount}
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-ios-modal border border-zinc-200 dark:border-zinc-800 animate-scale-in space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingAccount.id ? '编辑谷歌账号详情' : '添加新的谷歌账号'}
              </h4>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Google / Gmail 邮箱 (必填)</label>
                <input
                  type="email"
                  required
                  value={editingAccount.email || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, email: e.target.value })}
                  placeholder="your.account@gmail.com"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">登录密码</label>
                  <input
                    type="text"
                    value={editingAccount.password || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, password: e.target.value })}
                    placeholder="密码"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">辅助恢复邮箱</label>
                  <input
                    type="email"
                    value={editingAccount.recoveryEmail || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, recoveryEmail: e.target.value })}
                    placeholder="recovery@..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">2FA 密钥 (Base32)</label>
                  <input
                    type="text"
                    value={editingAccount.twoFASecret || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, twoFASecret: e.target.value.toUpperCase() })}
                    placeholder="JBSWY3DPEHPK3PXP"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">归属国家/地区</label>
                  <input
                    type="text"
                    value={editingAccount.country || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, country: e.target.value })}
                    placeholder="如：美国、中国香港、日本"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">分组/分类</label>
                  <input
                    type="text"
                    value={editingAccount.category || '未分类'}
                    onChange={e => setEditingAccount({ ...editingAccount, category: e.target.value })}
                    placeholder="GCP / AdSense"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">当前阶段天数</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={editingAccount.currentDay || 1}
                    onChange={e => setEditingAccount({ ...editingAccount, currentDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">养号状态</label>
                  <select
                    value={editingAccount.status || 'warming'}
                    onChange={e => setEditingAccount({ ...editingAccount, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="warming">🌱 养号中</option>
                    <option value="completed">🏆 已出师</option>
                    <option value="paused">⏸️ 已暂停</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">备用安全码 (8 位数字，空格或换行分隔)</label>
                <textarea
                  value={editingAccount.backupCodes || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, backupCodes: e.target.value })}
                  placeholder="3191 6344 6829 7625 9012 4321..."
                  className="w-full h-16 p-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">备注信息</label>
                <input
                  type="text"
                  value={editingAccount.note || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, note: e.target.value })}
                  placeholder="用于海外业务/Claude绑卡/YouTube开通等"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-semibold"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#07C160] hover:bg-[#06AD56] text-white rounded-xl text-xs font-bold shadow-xs"
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
