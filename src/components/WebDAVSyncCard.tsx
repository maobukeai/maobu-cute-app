import React, { useState, useEffect } from 'react';
import { WebDAVConfig, WebDAVBackupItem, FullAppBackup } from '../types';
import { db } from '../utils/storage';
import { sound } from '../utils/sound';
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
  Clock,
  HardDrive,
  ExternalLink,
} from 'lucide-react';

interface WebDAVSyncCardProps {
  onDataRestored: () => void;
}

export const WebDAVSyncCard: React.FC<WebDAVSyncCardProps> = ({ onDataRestored }) => {
  const settings = db.getSettings();
  const [config, setConfig] = useState<WebDAVConfig>(settings.webdav || DEFAULT_WEBDAV_CONFIG);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // History Backups Accordion
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<WebDAVBackupItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Save config to settings
  const saveConfig = (newConfig: WebDAVConfig) => {
    setConfig(newConfig);
    const updatedSettings = { ...settings, webdav: newConfig };
    db.saveSettings(updatedSettings);
  };

  // 1. Test & Save
  const handleTestAndSave = async () => {
    sound.playTap();
    setIsTesting(true);
    setTestResult(null);

    const res = await testWebDAVConnection(config);
    setIsTesting(false);
    setTestResult(res);

    const updatedConfig = { ...config, isReady: res.ok };
    saveConfig(updatedConfig);

    if (res.ok) {
      sound.playSuccess();
    }
  };

  // 2. Upload Backup
  const handleUploadNow = async () => {
    sound.playTap();
    setIsUploading(true);
    setTestResult(null);

    try {
      const fullBackup = db.exportFullBackup();
      const res = await uploadWebDAVBackup(config, fullBackup);

      if (res.ok) {
        sound.playSuccess();
        const nowStr = new Date().toLocaleString();
        const updatedConfig = { ...config, lastUploadedAt: nowStr, isReady: true };
        saveConfig(updatedConfig);
        alert(`✅ 云端备份上传成功！\n文件名称：${res.filename}`);
        if (showHistory) {
          loadHistoryList();
        }
      } else {
        alert(`❌ 上传失败: ${res.message}`);
      }
    } catch (err: any) {
      alert(`上传异常: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 3. Quick Sync / Restore from latest backup
  const handleSyncFromCloud = async () => {
    sound.playTap();
    setIsRestoring(true);

    try {
      const list = await listWebDAVBackups(config);
      if (list.length === 0) {
        alert('云端目录暂无任何历史备份文件');
        setIsRestoring(false);
        return;
      }

      // Latest backup is first
      const latest = list[0];
      const confirmed = window.confirm(
        `确定要从云端恢复最新备份吗？\n文件：${latest.name}\n上传时间：${new Date(latest.lastModified).toLocaleString()}`
      );
      if (!confirmed) {
        setIsRestoring(false);
        return;
      }

      const backupData = await downloadWebDAVBackup(config, latest.name);
      const success = db.importFullBackup(backupData);
      if (success) {
        sound.playSuccess();
        const nowStr = new Date().toLocaleString();
        const updatedConfig = { ...config, lastRestoredAt: nowStr };
        saveConfig(updatedConfig);
        onDataRestored();
        alert('🎉 云端数据同步恢复成功！');
      } else {
        alert('备份文件解析校验未通过');
      }
    } catch (err: any) {
      alert(`云端恢复失败: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Load history backups list
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
    if (next) {
      loadHistoryList();
    }
  };

  // Restore specific history backup
  const handleRestoreSpecific = async (item: WebDAVBackupItem) => {
    sound.playTap();
    const confirmed = window.confirm(
      `确定恢复该云端备份吗？\n${item.name}\n时间：${new Date(item.lastModified).toLocaleString()}`
    );
    if (!confirmed) return;

    try {
      const backupData = await downloadWebDAVBackup(config, item.name);
      const success = db.importFullBackup(backupData);
      if (success) {
        sound.playSuccess();
        const nowStr = new Date().toLocaleString();
        const updatedConfig = { ...config, lastRestoredAt: nowStr };
        saveConfig(updatedConfig);
        onDataRestored();
        alert('🎉 指定备份恢复成功！');
      }
    } catch (err: any) {
      alert(`恢复失败: ${err.message}`);
    }
  };

  // Delete specific history backup
  const handleDeleteSpecific = async (item: WebDAVBackupItem) => {
    sound.playTap();
    const confirmed = window.confirm(`确定删除该云端备份文件吗？\n${item.name}`);
    if (!confirmed) return;

    try {
      await deleteWebDAVBackup(config, item.name);
      loadHistoryList();
      sound.playTap();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl shadow-ios border border-white/80 dark:border-zinc-800/80 space-y-4">
      {/* Header: Title + Status Pill */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              WebDAV 云端备份与同步
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            通过坚果云等 WebDAV 服务在多台设备间同步配置并保留云端备份（备份包通常 &lt;1MB）
          </p>
        </div>

        {/* Status Pill */}
        <div className="shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              config.isReady
                ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                config.isReady ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'
              }`}
            ></span>
            {config.isReady ? '云端就绪' : '未连接'}
          </span>
        </div>
      </div>

      {/* Field 1: Server URL */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          服务地址
        </label>
        <input
          type="text"
          value={config.serverUrl}
          onChange={e => saveConfig({ ...config, serverUrl: e.target.value })}
          placeholder="https://dav.jianguoyun.com/dav/"
          className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      {/* Field 2 & 3: Account & Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Username */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            账号
          </label>
          <input
            type="text"
            value={config.username}
            onChange={e => saveConfig({ ...config, username: e.target.value })}
            placeholder="your_email@domain.com"
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">应用密码</span>
              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">已保存</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordHidden(!isPasswordHidden)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center space-x-0.5 text-[11px]"
            >
              {isPasswordHidden ? (
                <>
                  <EyeOff className="w-3 h-3 mr-0.5" />
                  <span>隐藏</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 mr-0.5" />
                  <span>显示</span>
                </>
              )}
            </button>
          </div>
          <input
            type={isPasswordHidden ? 'password' : 'text'}
            value={config.password}
            onChange={e => saveConfig({ ...config, password: e.target.value })}
            placeholder="坚果云应用密码"
            className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      {/* Field 4 & 5: Remote Dir & Retention Days */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Remote Dir */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            远端目录
          </label>
          <input
            type="text"
            value={config.remoteDir}
            onChange={e => saveConfig({ ...config, remoteDir: e.target.value })}
            placeholder="MaobuCute"
            className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Retention Days */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            云端保留天数
          </label>
          <select
            value={config.retentionDays}
            onChange={e => saveConfig({ ...config, retentionDays: Number(e.target.value) })}
            className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 transition font-medium"
          >
            <option value={7}>7 天</option>
            <option value={15}>15 天</option>
            <option value={30}>30 天</option>
            <option value={0}>永久保留</option>
          </select>
        </div>
      </div>

      {/* Helper Text with Safety Link */}
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
        坚果云用户请前往{' '}
        <a
          href="https://www.jianguoyun.com/#/safety"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:underline font-medium inline-flex items-center"
        >
          <span>账户安全页</span>
          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
        </a>{' '}
        生成「应用密码」；上传时会自动按保留天数清理过期备份。
      </div>

      {/* Test Result Message */}
      {testResult && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center space-x-1.5 ${
            testResult.ok
              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
          }`}
        >
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2 pt-1">
        {/* Test & Save Button */}
        <button
          onClick={handleTestAndSave}
          disabled={isTesting}
          className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
        >
          {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isTesting ? '检测中...' : '测试 / 保存配置'}</span>
        </button>

        {/* Upload Now Button (Primary Accent) */}
        <button
          onClick={handleUploadNow}
          disabled={isUploading}
          className="flex-1 min-w-[140px] px-4 py-2 rounded-xl bg-[#0084FF] hover:bg-[#0074E0] text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-sm"
        >
          {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          <span>{isUploading ? '正在打包上传...' : '立即生成并上传'}</span>
        </button>

        {/* Sync from Cloud Button */}
        <button
          onClick={handleSyncFromCloud}
          disabled={isRestoring}
          className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
        >
          {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
          <span>{isRestoring ? '正在恢复...' : '从云端同步配置'}</span>
        </button>
      </div>

      {/* Collapsible History Backups */}
      <div className="border border-zinc-200/70 dark:border-zinc-800/70 rounded-2xl overflow-hidden">
        <button
          onClick={handleToggleHistory}
          className="w-full p-3 bg-zinc-50/70 dark:bg-zinc-850/70 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition"
        >
          <div className="flex items-center space-x-2">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            <span>云端历史备份</span>
            {historyList.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                {historyList.length}
              </span>
            )}
          </div>
          {showHistory ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
        </button>

        {showHistory && (
          <div className="p-3 bg-white dark:bg-zinc-900 space-y-2 text-xs divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoadingHistory ? (
              <div className="py-6 text-center text-zinc-400 space-y-1">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-blue-500" />
                <p className="text-[11px]">正在读取云端目录列表...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-6 text-center text-zinc-400">
                <p className="text-[11px]">云端暂无历史备份，点击上方「立即生成并上传」创建</p>
              </div>
            ) : (
              historyList.map(item => (
                <div key={item.name} className="pt-2 flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                    <p className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-zinc-400">
                      <span>{new Date(item.lastModified).toLocaleString()}</span>
                      <span>·</span>
                      <span>{Math.round(item.size / 1024) || 1} KB</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleRestoreSpecific(item)}
                      className="px-2 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded-lg font-semibold hover:bg-green-100 text-[11px]"
                    >
                      恢复
                    </button>
                    <button
                      onClick={() => handleDeleteSpecific(item)}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded-lg"
                      title="删除此备份"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
        <div>
          最近上传：{config.lastUploadedAt || '尚未上传'}
        </div>
        <div>
          最近恢复：{config.lastRestoredAt || '尚未恢复'}
        </div>
      </div>
    </div>
  );
};
