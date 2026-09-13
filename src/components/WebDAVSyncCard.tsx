import React, { useState } from 'react';
import { WebDAVConfig, WebDAVBackupItem, AccentColor } from '../types';
import { db } from '../utils/storage';
import { sound } from '../utils/sound';
import { useToast } from './ui';
import {
  DEFAULT_WEBDAV_CONFIG,
  testWebDAVConnection,
  uploadWebDAVBackup,
  listWebDAVBackups,
  downloadWebDAVBackup,
  deleteWebDAVBackup,
} from '../utils/webdav';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  UploadCloud,
  DownloadCloud,
  ChevronDown,
  ChevronRight,
  Trash2,
  HardDrive,
  Settings2,
} from 'lucide-react';

interface WebDAVSyncCardProps {
  onDataRestored: () => void;
  accentColor?: AccentColor;
}

export const WebDAVSyncCard: React.FC<WebDAVSyncCardProps> = ({ onDataRestored }) => {
  const toast = useToast();
  const settings = db.getSettings();
  const [config, setConfig] = useState<WebDAVConfig>(settings.webdav || DEFAULT_WEBDAV_CONFIG);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // History Backups Accordion
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<WebDAVBackupItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const isJianguoyun = config.serverUrl?.includes('jianguoyun.com');

  // Save config
  const saveConfig = (newConfig: WebDAVConfig) => {
    setConfig(newConfig);
    const updatedSettings = { ...settings, webdav: newConfig };
    db.saveSettings(updatedSettings);
  };

  const handleApplyPreset = (preset: 'jianguoyun' | 'custom') => {
    sound.playTap();
    if (preset === 'jianguoyun') {
      const updated: WebDAVConfig = {
        ...config,
        serverUrl: 'https://dav.jianguoyun.com/dav/',
        remoteDir: config.remoteDir || 'MaobuCute',
        retentionDays: config.retentionDays || 15,
      };
      saveConfig(updated);
    } else {
      setShowAdvanced(true);
    }
  };

  // 1. Test & Save
  const handleTestAndSave = async () => {
    sound.playTap();
    if (!config.serverUrl || !config.username || !config.password) {
      setTestResult({ ok: false, message: '请填写服务地址、账号和密码' });
      sound.playError?.();
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testWebDAVConnection(config);
      setIsTesting(false);
      setTestResult(res);

      const updatedConfig = { ...config, isReady: res.ok };
      saveConfig(updatedConfig);

      if (res.ok) {
        sound.playSuccess();
      }
    } catch (e: any) {
      setIsTesting(false);
      setTestResult({ ok: false, message: e?.message || '连接失败' });
    }
  };

  // 2. Upload Backup
  const handleUploadNow = async () => {
    sound.playTap();
    if (!config.serverUrl || !config.username || !config.password) {
      toast.warn('请先填写 WebDAV 服务地址、账号和密码');
      return;
    }

    setIsUploading(true);
    setTestResult(null);

    try {
      const fullBackup = db.exportFullBackup();
      const res = await uploadWebDAVBackup(config, fullBackup);

      if (res.ok) {
        sound.playSuccess();
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedConfig = { ...config, lastUploadedAt: nowStr, isReady: true };
        saveConfig(updatedConfig);
        toast.success(`上传成功：${res.filename}`);
        if (showHistory) loadHistoryList();
      } else {
        toast.error(`上传失败：${res.message}`);
      }
    } catch (err: any) {
      toast.error(`上传异常：${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 3. Quick Sync / Restore
  const handleSyncFromCloud = async () => {
    sound.playTap();
    if (!config.serverUrl || !config.username || !config.password) {
      toast.warn('请先填写 WebDAV 账号');
      return;
    }

    setIsRestoring(true);
    try {
      const list = await listWebDAVBackups(config);
      if (list.length === 0) {
        toast.info('云端目录暂无历史备份');
        setIsRestoring(false);
        return;
      }

      const latest = list[0];
      const confirmed = await toast.confirm({
        title: '恢复云端备份？',
        message: `将恢复 ${latest.name} 并覆盖本地数据`,
        confirmText: '恢复',
        danger: true,
      });
      if (!confirmed) {
        setIsRestoring(false);
        return;
      }

      const backupData = await downloadWebDAVBackup(config, latest.name);
      const success = db.importFullBackup(backupData);
      if (success) {
        sound.playSuccess();
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedConfig = { ...config, lastRestoredAt: nowStr };
        saveConfig(updatedConfig);
        onDataRestored();
        toast.success('云端数据恢复成功');
      } else {
        toast.error('备份文件格式不兼容');
      }
    } catch (err: any) {
      toast.error(`恢复失败：${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // History list
  const loadHistoryList = async () => {
    setIsLoadingHistory(true);
    try {
      const list = await listWebDAVBackups(config);
      setHistoryList(list);
    } catch {
      setHistoryList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleHistory = () => {
    sound.playTap();
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadHistoryList();
  };

  const handleRestoreSpecific = async (item: WebDAVBackupItem) => {
    sound.playTap();
    const confirmed = await toast.confirm({
      title: '恢复此备份？',
      message: `将恢复 ${item.name} 并覆盖本地数据`,
      confirmText: '恢复',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const backupData = await downloadWebDAVBackup(config, item.name);
      if (db.importFullBackup(backupData)) {
        sound.playSuccess();
        onDataRestored();
        toast.success('恢复成功');
      }
    } catch (err: any) {
      toast.error(`恢复失败：${err.message}`);
    }
  };

  const handleDeleteSpecific = async (item: WebDAVBackupItem) => {
    sound.playTap();
    const confirmed = await toast.confirm({
      title: '删除此备份？',
      message: `${item.name} 将从云端删除，不可恢复`,
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteWebDAVBackup(config, item.name);
      loadHistoryList();
    } catch (err: any) {
      toast.error(`删除失败：${err.message}`);
    }
  };

  return (
    <div className="glass-card p-2.5 sm:p-3 rounded-2xl shadow-ios border border-white/80 dark:border-line space-y-2 text-xs">
      {/* Compact Top Header */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Cloud className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="font-bold text-ink text-xs truncate">
            WebDAV 同步
          </span>
          {/* Quick Presets Inline */}
          <div className="flex items-center space-x-1 bg-surface-2 p-0.5 rounded-lg text-caption">
            <button
              type="button"
              onClick={() => handleApplyPreset('jianguoyun')}
              className={`px-1.5 py-0.5 rounded font-semibold transition ${
                isJianguoyun ? 'bg-blue-600 text-white shadow-xs' : 'text-ink-2 hover:text-ink'
              }`}
            >
              坚果云
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('custom')}
              className={`px-1.5 py-0.5 rounded transition ${
                !isJianguoyun ? 'bg-surface-3 text-ink font-semibold shadow-xs' : 'text-ink-2 hover:text-ink'
              }`}
            >
              自定义
            </button>
          </div>
        </div>

        {/* Status indicator */}
        <div className="shrink-0 flex items-center space-x-1 text-caption">
          <span className={`w-1.5 h-1.5 rounded-full ${config.isReady ? 'bg-ok animate-pulse' : 'bg-zinc-400'}`} />
          <span className={config.isReady ? 'text-ok font-semibold' : 'text-ink-3'}>
            {config.isReady ? '已连接' : '未连接'}
          </span>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-1 text-ink-3 hover:text-ink-2"
            title="高级选项"
          >
            <Settings2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Advanced URL only shown if custom or expanded */}
      {(showAdvanced || !isJianguoyun) && (
        <div className="space-y-0.5">
          <span className="text-caption text-ink-3">服务地址</span>
          <input
            type="text"
            value={config.serverUrl}
            onChange={e => saveConfig({ ...config, serverUrl: e.target.value })}
            placeholder="https://dav.jianguoyun.com/dav/"
            className="w-full h-8 px-2.5 text-caption font-mono rounded-lg bg-surface-2 border-none outline-none text-ink"
          />
        </div>
      )}

      {/* Account & Password Compact Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={config.username}
          onChange={e => saveConfig({ ...config, username: e.target.value })}
          placeholder="坚果云登录账号"
          className="w-full h-8 px-2.5 text-caption rounded-lg bg-surface-2 border-none outline-none text-ink"
        />
        <div className="relative">
          <input
            type={isPasswordHidden ? 'password' : 'text'}
            value={config.password}
            onChange={e => saveConfig({ ...config, password: e.target.value })}
            placeholder="独立应用密码"
            className="w-full h-8 pl-2.5 pr-7 text-caption font-mono rounded-lg bg-surface-2 border-none outline-none text-ink"
          />
          <button
            type="button"
            onClick={() => setIsPasswordHidden(!isPasswordHidden)}
            className="absolute right-2 top-2 text-ink-3 hover:text-ink-2"
          >
            {isPasswordHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Advanced Settings (RemoteDir, Retention) */}
      {showAdvanced && (
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <input
            type="text"
            value={config.remoteDir}
            onChange={e => saveConfig({ ...config, remoteDir: e.target.value })}
            placeholder="远端目录 (默认 MaobuCute)"
            className="w-full h-7 px-2 text-caption font-mono rounded-lg bg-surface-2 border-none outline-none text-ink"
          />
          <select
            value={config.retentionDays}
            onChange={e => saveConfig({ ...config, retentionDays: Number(e.target.value) })}
            className="w-full h-7 px-2 text-caption rounded-lg bg-surface-2 border-none outline-none text-ink"
          >
            <option value={7}>保留 7 天备份</option>
            <option value={15}>保留 15 天 (推荐)</option>
            <option value={30}>保留 30 天</option>
            <option value={0}>永久保留</option>
          </select>
        </div>
      )}

      {/* Test Result Message Inline */}
      {testResult && (
        <div className={`p-1.5 rounded-lg text-caption flex items-center space-x-1 ${
          testResult.ok ? 'bg-ok/10 text-ok dark:bg-ok/20 dark:text-ok' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
        }`}>
          {testResult.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
          <span className="truncate">{testResult.message}</span>
        </div>
      )}

      {/* Compact 3-Button Action Row */}
      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={handleTestAndSave}
          disabled={isTesting}
          className="h-8 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink text-caption font-semibold flex items-center justify-center space-x-1 transition active:scale-95"
        >
          {isTesting ? <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> : <Save className="w-3 h-3 text-ink-2" />}
          <span>{isTesting ? '验证中' : '测试配置'}</span>
        </button>

        <button
          type="button"
          onClick={handleUploadNow}
          disabled={isUploading}
          className="h-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-caption font-bold flex items-center justify-center space-x-1 shadow-xs transition active:scale-95"
        >
          {isUploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
          <span>{isUploading ? '打包中...' : '立即备份'}</span>
        </button>

        <button
          type="button"
          onClick={handleSyncFromCloud}
          disabled={isRestoring}
          className="h-8 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink text-caption font-semibold flex items-center justify-center space-x-1 transition active:scale-95"
        >
          {isRestoring ? <RefreshCw className="w-3 h-3 animate-spin text-ok" /> : <DownloadCloud className="w-3 h-3 text-ink-2" />}
          <span>{isRestoring ? '恢复中' : '从云还原'}</span>
        </button>
      </div>

      {/* History Backups Compact Accordion */}
      <div className="border-t border-line pt-1.5 flex items-center justify-between text-caption text-ink-3">
        <button
          type="button"
          onClick={handleToggleHistory}
          className="flex items-center space-x-1 text-ink-2 hover:text-blue-500 transition"
        >
          <HardDrive className="w-3 h-3" />
          <span>云端快照历史</span>
          {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <span className="truncate">
          上次: {config.lastUploadedAt ? `${config.lastUploadedAt}` : '未上传'}
        </span>
      </div>

      {/* History Snapshots List (Compact) */}
      {showHistory && (
        <div className="p-1.5 bg-surface-2 rounded-xl space-y-1 text-caption max-h-36 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="py-2 text-center text-ink-3">正在读取快照...</div>
          ) : historyList.length === 0 ? (
            <div className="py-2 text-center text-ink-3">暂无云端快照</div>
          ) : (
            historyList.map(item => (
              <div key={item.name} className="flex items-center justify-between py-1 border-b border-line last:border-none">
                <div className="min-w-0 flex-1 pr-1 truncate">
                  <span className="font-mono text-ink-2 truncate block">{item.name}</span>
                  <span className="text-caption text-ink-3">{Math.round(item.size / 1024) || 1} KB</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestoreSpecific(item)}
                    className="px-1.5 py-0.5 bg-ok/15 text-ok rounded text-caption font-bold"
                  >
                    还原
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSpecific(item)}
                    className="p-1 text-ink-3 hover:text-rose-500 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
