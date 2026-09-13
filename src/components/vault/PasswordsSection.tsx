import React, { useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PasswordItem } from '../../types';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import {
  generateStrongPassword,
  calculatePasswordStrength,
} from '../../utils/crypto';
import { BottomSheet } from '../common/BottomSheet';
import { SwipeableItem } from '../common/SwipeableItem';
import { Button, Chip, EmptyState, Field, Input, Select, useToast } from '../ui';
import {
  KeyRound,
  ShieldCheck,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  Dices,
  RefreshCw,
  ChevronRight,
  Lock,
  X,
} from 'lucide-react';

interface PasswordsSectionProps {
  passwords: PasswordItem[];
  /** Persist with encryption awareness (provided by VaultTab) */
  persistPasswords: (updated: PasswordItem[]) => void;
  hasMasterPassword: boolean;
  onLockVault: () => void;
  onOpenMasterModal: () => void;
}

type PasswordCategory = PasswordItem['category'];

const CATEGORY_FILTERS: { id: 'all' | PasswordCategory; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'social', label: '社交' },
  { id: 'email', label: '邮箱' },
  { id: 'finance', label: '金融' },
  { id: 'work', label: '工作' },
  { id: 'game', label: '游戏' },
  { id: 'other', label: '其他' },
];

const STRENGTH_META: Record<string, { label: string; cls: string }> = {
  very_strong: { label: '极强', cls: 'text-ok' },
  strong: { label: '高强度', cls: 'text-ok' },
  fair: { label: '中等', cls: 'text-warn' },
  weak: { label: '需强化', cls: 'text-danger' },
};

export const PasswordsSection: React.FC<PasswordsSectionProps> = ({
  passwords,
  persistPasswords,
  hasMasterPassword,
  onLockVault,
  onOpenMasterModal,
}) => {
  const toast = useToast();
  const [passwordSearch, setPasswordSearch] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordItem | null>(null);
  const [selectedPasswordForDetail, setSelectedPasswordForDetail] = useState<PasswordItem | null>(null);
  const [pwCategoryFilter, setPwCategoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form
  const [pwTitle, setPwTitle] = useState('');
  const [pwUsername, setPwUsername] = useState('');
  const [pwPassword, setPwPassword] = useState('');
  const [pwWebsite, setPwWebsite] = useState('');
  const [pwCategory, setPwCategory] = useState<PasswordCategory>('social');
  const [pwNotes, setPwNotes] = useState('');

  // Password Generator Sheet
  const [showGenModal, setShowGenModal] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPw, setGeneratedPw] = useState('');

  const copyWithFeedback = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    haptics.selection();
    sound.playTap();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  const handleDeletePassword = async (id: string): Promise<boolean> => {
    sound.playTap();
    const targetItem = passwords.find(p => p.id === id);
    const confirmed = await toast.confirm({
      title: '删除密码？',
      message: `确定要删除「${targetItem?.title || '该凭证'}」吗？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return false;
    const updated = passwords.filter(p => p.id !== id);
    persistPasswords(updated);
    toast.success('密码已删除');
    return true;
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

  // ── Filtering (deferred so typing never blocks the input) ───
  const deferredSearch = useDeferredValue(passwordSearch);
  const filteredList = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return passwords.filter(p => {
      const matchesCat = pwCategoryFilter === 'all' || p.category === pwCategoryFilter;
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        (p.website && p.website.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [passwords, pwCategoryFilter, deferredSearch]);

  const [renderAllPw, setRenderAllPw] = useState(false);
  const visibleList = renderAllPw ? filteredList : filteredList.slice(0, 100);

  return (
    <div className="space-y-3">
      {/* Toolbar: search + primary actions aligned right */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索账号、网站、标题..."
            value={passwordSearch}
            onChange={e => setPasswordSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 text-sub rounded-full bg-surface border border-line text-ink placeholder:text-ink-3 outline-none focus:ring-2 ring-accent/40 shadow-elev-1 transition-all"
          />
          {passwordSearch && (
            <button
              onClick={() => setPasswordSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-surface-2 text-ink-3 hover:text-ink tactile-press"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          variant="soft"
          size="sm"
          onClick={() => {
            sound.playTap();
            handleRunGenerator();
            setShowGenModal(true);
          }}
          title="强密码生成器"
        >
          <Dices className="w-3.5 h-3.5" />
          <span>生成</span>
        </Button>

        <Button variant="primary" size="sm" onClick={handleOpenAddPassword} haptic="medium">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>新增</span>
        </Button>

        {hasMasterPassword ? (
          <>
            <Button
              variant="neutral"
              size="icon-sm"
              onClick={onLockVault}
              title="重新锁定密码箱"
            >
              <Lock className="w-4 h-4 text-ink-2" />
            </Button>
            <Button
              variant="soft"
              size="icon-sm"
              onClick={() => {
                sound.playTap();
                onOpenMasterModal();
              }}
              title="管理主密码"
            >
              <KeyRound className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              sound.playTap();
              onOpenMasterModal();
            }}
            title="设置主密码加密存储"
            className="bg-warn/10 text-warn"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>设主密码</span>
          </Button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="-mx-4 px-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_FILTERS.map(cat => (
          <Chip
            key={cat.id}
            selected={pwCategoryFilter === cat.id}
            onClick={() => setPwCategoryFilter(cat.id)}
          >
            {cat.label}
          </Chip>
        ))}
      </div>

      {/* Password list */}
      {passwords.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="密码保险箱暂无密码"
          hint="存入你的第一条凭据，支持 AES-GCM 256 位加密落盘保护"
          actionLabel="添加第一个密码凭据"
          onAction={handleOpenAddPassword}
          className="mt-2"
        />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={Search}
          title="没有匹配的凭据"
          hint="未找到匹配该分类或搜索的密码凭据，换个关键词试试"
          className="mt-2"
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          <AnimatePresence initial={false}>
            {visibleList.map(item => {
              const strength = calculatePasswordStrength(item.password);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                >
                  <SwipeableItem
                    leftAction={{
                      label: '复制密码',
                      icon: <Copy className="w-4 h-4 text-white" />,
                      colorClass: 'bg-ok text-white',
                      onTrigger: () => copyWithFeedback(item.password, item.id),
                    }}
                    rightActions={[
                      {
                        label: '编辑',
                        icon: <Edit3 className="w-3.5 h-3.5 text-white" />,
                        colorClass: 'bg-accent text-white',
                        onClick: () => handleOpenEditPassword(item),
                      },
                      {
                        label: '删除',
                        icon: <Trash2 className="w-3.5 h-3.5 text-white" />,
                        colorClass: 'bg-danger text-white',
                        onClick: () => { void handleDeletePassword(item.id); },
                      },
                    ]}
                    className="rounded-2xl"
                  >
                    <div
                      onClick={() => {
                        sound.playTap();
                        setSelectedPasswordForDetail(item);
                      }}
                      className="px-3.5 py-3 flex items-center justify-between cursor-pointer"
                    >
                      {/* Left avatar & details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line/60 flex items-center justify-center text-ink font-semibold text-xs tracking-wider uppercase shrink-0 select-none">
                          {(item.title.trim()[0] || 'K').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sub font-semibold text-ink truncate">{item.title}</h4>
                            {strength.score < 40 && (
                              <span className="text-caption px-1.5 py-0.5 rounded-full bg-warn/10 text-warn font-semibold shrink-0">
                                需强化
                              </span>
                            )}
                          </div>
                          <p className="text-caption text-ink-3 truncate mt-0.5">
                            {item.username || '(无用户名)'}
                          </p>
                        </div>
                      </div>

                      {/* Right quick copy & chevron */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            copyWithFeedback(item.password, item.id);
                          }}
                          className="px-2.5 py-1.5 rounded-full bg-surface-2 text-ink-2 text-caption font-mono hover:text-ink tactile-press flex items-center gap-1"
                          title="复制密码"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-ok" />
                              <span className="text-ok font-bold">已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>复制</span>
                            </>
                          )}
                        </button>
                        <ChevronRight className="w-4 h-4 text-ink-3" />
                      </div>
                    </div>
                  </SwipeableItem>
                </motion.div>
              );
            })}
            {!renderAllPw && filteredList.length > 100 && (
              <button
                onClick={() => setRenderAllPw(true)}
                className="w-full py-3 text-caption font-semibold text-ink-2 bg-surface border border-line rounded-2xl tactile-press"
              >
                显示全部 {filteredList.length} 条
              </button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit password sheet */}
      <BottomSheet
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={editingPassword ? '编辑密码凭证' : '存入新密码'}
      >
        <form onSubmit={handleSavePassword} className="space-y-4 pb-2">
          <Field label="标题 / 平台名称" required>
            <Input
              required
              placeholder="例如：微信、GitHub、Steam..."
              value={pwTitle}
              onChange={e => setPwTitle(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="用户名 / 账号">
              <Input
                placeholder="用户名或邮箱"
                value={pwUsername}
                onChange={e => setPwUsername(e.target.value)}
              />
            </Field>
            <Field label="分类">
              <Select value={pwCategory} onChange={e => setPwCategory(e.target.value as PasswordCategory)}>
                <option value="social">社交应用</option>
                <option value="email">电子邮箱</option>
                <option value="finance">金融资产</option>
                <option value="work">工作办公</option>
                <option value="game">游戏娱乐</option>
                <option value="other">其他分类</option>
              </Select>
            </Field>
          </div>

          <Field label="密码" required>
            <div className="relative">
              <Input
                required
                placeholder="输入或生成密码"
                value={pwPassword}
                onChange={e => setPwPassword(e.target.value)}
                className="pr-[118px] font-mono"
              />
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
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg bg-accent/10 text-accent text-caption font-semibold flex items-center gap-1 tactile-press"
              >
                <Dices className="w-3 h-3" />
                <span>随机生成</span>
              </button>
            </div>
          </Field>

          <Field label="网站 URL (选填)">
            <Input
              type="text"
              placeholder="https://example.com"
              value={pwWebsite}
              onChange={e => setPwWebsite(e.target.value)}
            />
          </Field>

          <div className="pt-1 flex items-center justify-end gap-2.5">
            <Button type="button" variant="ghost" size="md" onClick={() => setShowPasswordModal(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary" size="md" className="min-w-[108px]">
              保存凭证
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Strong password generator sheet */}
      <BottomSheet isOpen={showGenModal} onClose={() => setShowGenModal(false)} title="强密码随机生成器">
        <div className="space-y-4 pb-2">
          {/* Generated password box */}
          <div className="p-3.5 bg-surface-2 rounded-2xl flex items-center justify-between gap-2">
            <span className="truncate select-all text-ink font-bold font-mono text-body">
              {generatedPw}
            </span>
            <button
              onClick={() => copyWithFeedback(generatedPw, 'gen_pw')}
              className="p-1.5 text-ink-3 hover:text-accent shrink-0"
              title="复制"
            >
              {copiedId === 'gen_pw' ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Length */}
          <Field label={`密码长度：${genLength} 位`}>
            <input
              type="range"
              min="8"
              max="32"
              value={genLength}
              onChange={e => {
                setGenLength(Number(e.target.value));
                handleRunGenerator();
              }}
              className="w-full accent-accent"
            />
          </Field>

          {/* Character toggles */}
          <div className="flex flex-wrap gap-1.5">
            <Chip selected={genUpper} onClick={() => { setGenUpper(v => !v); handleRunGenerator(); }}>
              大写字母 (A-Z)
            </Chip>
            <Chip selected={genLower} onClick={() => { setGenLower(v => !v); handleRunGenerator(); }}>
              小写字母 (a-z)
            </Chip>
            <Chip selected={genNumbers} onClick={() => { setGenNumbers(v => !v); handleRunGenerator(); }}>
              数字 (0-9)
            </Chip>
            <Chip selected={genSymbols} onClick={() => { setGenSymbols(v => !v); handleRunGenerator(); }}>
              特殊符号 (!@#)
            </Chip>
          </div>

          <div className="pt-1 flex items-center justify-between gap-2">
            <Button type="button" variant="neutral" size="md" onClick={handleRunGenerator}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新生成</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setPwPassword(generatedPw);
                setShowGenModal(false);
                setShowPasswordModal(true);
              }}
            >
              使用此密码
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Password detail sheet */}
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
              className="text-caption font-semibold text-accent px-2 py-1 tactile-press"
            >
              编辑
            </button>
          )
        }
      >
        {selectedPasswordForDetail && (
          <div className="space-y-3 pb-3">
            {/* Identity card */}
            <div className="flex items-center gap-3 p-3.5 bg-surface-2 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-line/60 flex items-center justify-center shrink-0 text-ink font-bold text-lg uppercase select-none">
                {(selectedPasswordForDetail.title.trim()[0] || 'K').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-headline font-bold text-ink truncate">
                  {selectedPasswordForDetail.title}
                </h3>
                <p className="text-caption text-ink-2 truncate mt-0.5">
                  {selectedPasswordForDetail.website || selectedPasswordForDetail.category}
                </p>
              </div>
            </div>

            {/* Credentials group */}
            <div className="rounded-2xl bg-surface-2 divide-y divide-line overflow-hidden">
              {/* Username row */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-caption text-ink-3 uppercase tracking-wide">用户名 / 账号</div>
                  <div className="text-sub font-medium text-ink mt-0.5 break-all">
                    {selectedPasswordForDetail.username || '(未填写)'}
                  </div>
                </div>
                {selectedPasswordForDetail.username && (
                  <button
                    onClick={() => copyWithFeedback(selectedPasswordForDetail.username, 'detail_user')}
                    className="p-1.5 text-ink-3 hover:text-accent rounded-lg tactile-press shrink-0"
                    title="复制账号"
                  >
                    {copiedId === 'detail_user' ? (
                      <Check className="w-4 h-4 text-ok" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Password row */}
              <div className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-caption text-ink-3 uppercase tracking-wide">密码凭据</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleRevealPassword(selectedPasswordForDetail.id)}
                      className="p-1 text-ink-3 hover:text-ink tactile-press"
                      title={revealedPasswords[selectedPasswordForDetail.id] ? '隐藏密码' : '显示密码'}
                    >
                      {revealedPasswords[selectedPasswordForDetail.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => copyWithFeedback(selectedPasswordForDetail.password, 'detail_pw')}
                      className="p-1 text-ink-3 hover:text-accent tactile-press"
                      title="复制密码"
                    >
                      {copiedId === 'detail_pw' ? (
                        <Check className="w-4 h-4 text-ok" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="font-mono text-body tracking-wider text-ink break-all select-all">
                  {revealedPasswords[selectedPasswordForDetail.id]
                    ? selectedPasswordForDetail.password
                    : '••••••••••••••••'}
                </div>
                <div className="flex items-center gap-2 pt-1 text-caption text-ink-3">
                  <span>密码强度：</span>
                  {(() => {
                    const st = calculatePasswordStrength(selectedPasswordForDetail.password);
                    const meta = STRENGTH_META[st.label] ?? { label: '未知', cls: 'text-ink-2' };
                    return (
                      <span className={`font-semibold ${meta.cls}`}>
                        {meta.label} ({st.score}分)
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Website row */}
              {selectedPasswordForDetail.website && (
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 pr-2">
                    <div className="text-caption text-ink-3 uppercase tracking-wide">关联网址</div>
                    <div className="text-caption text-accent truncate mt-0.5">
                      {selectedPasswordForDetail.website}
                    </div>
                  </div>
                  <a
                    href={
                      selectedPasswordForDetail.website.startsWith('http')
                        ? selectedPasswordForDetail.website
                        : `https://${selectedPasswordForDetail.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-ink-3 hover:text-accent rounded-lg tactile-press shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedPasswordForDetail.notes && (
              <div className="p-3.5 bg-surface-2 rounded-2xl space-y-1">
                <div className="text-caption text-ink-3 uppercase tracking-wide">备注信息</div>
                <p className="text-caption text-ink-2 leading-relaxed whitespace-pre-wrap">
                  {selectedPasswordForDetail.notes}
                </p>
              </div>
            )}

            {/* Danger zone */}
            <Button
              type="button"
              variant="danger-soft"
              size="md"
              className="w-full"
              onClick={async () => {
                const deleted = await handleDeletePassword(selectedPasswordForDetail.id);
                if (deleted) {
                  setSelectedPasswordForDetail(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>删除此密码凭据</span>
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
