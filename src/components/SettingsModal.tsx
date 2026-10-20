import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Radio, Target, Sparkles, Check, HelpCircle } from 'lucide-react';
import { Settings } from '../types';
import { api } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings | null;
  onSave: (newSettings: Partial<Settings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<Settings>({
    geminiApiKey: '',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com',
    geminiModel: 'gemini-2.5-flash',
    tikhubApiKey: '',
    tikhubBaseUrl: 'https://api.tikhub.io',
    dailyKpiTarget: 20,
    niche: 'AI与效率工具 / 个人超级个体 / 商业认知',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // TikHub Scheduler State (PRD Case 29)
  const [schedulerConfig, setSchedulerConfig] = useState({
    enabled: true,
    scheduledHour: 9,
    scheduledMinute: 30,
    keywords: ['AI', '效率工具', '个人IP'],
    platforms: ['x', 'douyin'],
    missedRunPolicy: 'catch_up' as 'catch_up' | 'skip' | 'ignore',
    maxRequests: 50,
  });
  const [schedulerTraces, setSchedulerTraces] = useState<any[]>([]);
  const [isTriggeringScheduler, setIsTriggeringScheduler] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
    // Load scheduler status
    api.getSchedulerStatus()
      .then(res => {
        if (res) {
          setSchedulerConfig({
            enabled: res.enabled ?? true,
            scheduledHour: res.scheduledHour ?? 9,
            scheduledMinute: res.scheduledMinute ?? 30,
            keywords: res.keywords || ['AI', '效率工具', '个人IP'],
            platforms: res.platforms || ['x', 'douyin'],
            missedRunPolicy: res.missedRunPolicy || 'catch_up',
            maxRequests: res.maxRequests || 50
          });
          setSchedulerTraces(res.traces || []);
        }
      })
      .catch(() => {});
  }, [settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Promise.all([
        onSave(formData),
        api.saveSchedulerConfig(schedulerConfig).catch(() => {})
      ]);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">工作台核心参数配置</h2>
              <p className="text-xs text-slate-400">配置 Gemini 3.8 Flash、TikHub API 密钥与日更 KPI 目标</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Gemini AI Config Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                <Cpu className="w-4 h-4" />
                <span>底座大模型 (Google Gemini)</span>
              </span>
              <span className="text-[11px] text-slate-500">支持原生 Google AI 或 OpenAI 代理</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Gemini API Key</span>
                <span className="text-[11px] text-slate-400">从 aistudio.google.com 获取</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.geminiApiKey}
                  onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  大模型版本 / 模型标识
                </label>
                <select
                  value={formData.geminiModel}
                  onChange={(e) => setFormData({ ...formData, geminiModel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (超极速推荐)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (高阶旗舰)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (经典高速)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (深度长文推理)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Base URL (留空默认官方)
                </label>
                <input
                  type="text"
                  value={formData.geminiBaseUrl}
                  onChange={(e) => setFormData({ ...formData, geminiBaseUrl: e.target.value })}
                  placeholder="https://generativelanguage.googleapis.com"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* TikHub Config Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Radio className="w-4 h-4" />
                <span>热点聚合引擎 (TikHub API)</span>
              </span>
              <span className="text-[11px] text-slate-500">tikhub.io 全网热点聚合</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>TikHub API Key / Token</span>
                <span className="text-[11px] text-slate-400">未配置时如实显示待配置，手动导入完全可用，绝不伪造检索</span>
              </label>
              <input
                type="password"
                value={formData.tikhubApiKey || ''}
                onChange={(e) => setFormData({ ...formData, tikhubApiKey: e.target.value })}
                placeholder="从 tikhub.io 控制台复制 Bearer Token（如已配置可留空保持）"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Scheduler Config Panel (PRD Case 29) */}
            <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">定时热点自动抓取任务 (Scheduler)</span>
                  <span className="text-[10px] text-slate-400">每日定时检索并写入选题库，支持漏跑自动补跑</span>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedulerConfig.enabled}
                    onChange={e => setSchedulerConfig({ ...schedulerConfig, enabled: e.target.checked })}
                    className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 font-medium">启用每日调度</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">每日抓取时间 (时:分)</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={schedulerConfig.scheduledHour}
                      onChange={e => setSchedulerConfig({ ...schedulerConfig, scheduledHour: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-xs"
                    />
                    <span className="text-slate-500">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={schedulerConfig.scheduledMinute}
                      onChange={e => setSchedulerConfig({ ...schedulerConfig, scheduledMinute: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-xs"
                    />
                    <span className="text-slate-500 text-[10px] pl-1">每日执行</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">漏跑任务策略 (如关机重启)</label>
                  <select
                    value={schedulerConfig.missedRunPolicy}
                    onChange={e => setSchedulerConfig({ ...schedulerConfig, missedRunPolicy: e.target.value as any })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="catch_up">自动补跑 (catch_up 启动时即刻补全)</option>
                    <option value="skip">跳过今日 (skip 等待明日)</option>
                    <option value="ignore">忽略 (ignore)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">检索关键词 (逗号分隔)</label>
                <input
                  type="text"
                  value={schedulerConfig.keywords.join(', ')}
                  onChange={e => setSchedulerConfig({
                    ...schedulerConfig,
                    keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="AI, 效率工具, 商业认知"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1.5">抓取目标平台</label>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { key: 'x', label: 'X (推特)' },
                    { key: 'douyin', label: '抖音' },
                    { key: 'xiaohongshu', label: '小红书' },
                    { key: 'tiktok', label: 'TikTok' }
                  ].map(({ key, label }) => {
                    const isChecked = schedulerConfig.platforms.includes(key);
                    return (
                      <label key={key} className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...schedulerConfig.platforms, key]
                              : schedulerConfig.platforms.filter(p => p !== key);
                            setSchedulerConfig({ ...schedulerConfig, platforms: next });
                          }}
                          className="accent-emerald-500 rounded"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Run Now Trigger & Last Trace */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    setIsTriggeringScheduler(true);
                    try {
                      const res = await api.runSchedulerNow(true);
                      alert(`🎉 调度任务执行完成！\n抓取到 ${res.itemsCount || 0} 条热搜，状态: ${res.status}`);
                      const updated = await api.getSchedulerStatus();
                      if (updated?.traces) setSchedulerTraces(updated.traces);
                    } catch (e: any) {
                      alert('调度执行失败: ' + e.message);
                    } finally {
                      setIsTriggeringScheduler(false);
                    }
                  }}
                  disabled={isTriggeringScheduler}
                  className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <Radio className="w-3 h-3" />
                  <span>{isTriggeringScheduler ? '正在执行检索...' : '立即手动触发一次抓取'}</span>
                </button>

                <span className="text-[10px] text-slate-500 font-mono">
                  最近执行: {schedulerTraces.length > 0 ? `${schedulerTraces[0].executedAt?.slice(0, 16)} (${schedulerTraces[0].status})` : '暂无执行记录'}
                </span>
              </div>

              {/* Traces Error Coverage */}
              {schedulerTraces.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-500 block">最近调度日志与错误覆盖:</span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {schedulerTraces.slice(0, 3).map((tr, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] flex items-center justify-between font-mono">
                        <span className="text-slate-400">{tr.executedAt?.slice(5, 16)} · {tr.platform} ({tr.keyword || '热搜'})</span>
                        <span className={tr.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                          {tr.status} {tr.error ? `(${tr.error})` : `(${tr.count}条)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Productivity & Niche Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Target className="w-4 h-4" />
                <span>日更 KPI 与个人赛道定位</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  每日发布 KPI 总目标 (篇)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.dailyKpiTarget}
                    onChange={(e) => setFormData({ ...formData, dailyKpiTarget: parseInt(e.target.value) || 20 })}
                    className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">篇 / 天</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">系统已默认设定为 20 篇高频流水线目标</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  创作者垂直赛道定位
                </label>
                <input
                  type="text"
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                  placeholder="例如：科技/AI工具、职场跃升、商业副业"
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">AI选题将自动结合该赛道将热点降维转化</p>
              </div>
            </div>

            {/* Platform Sub-Targets */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-300 mb-2">
                各平台每日发布目标 (篇/天)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'x', label: 'X (推特)', defaultVal: 10 },
                  { key: 'xiaohongshu', label: '小红书', defaultVal: 2 },
                  { key: 'gzh', label: '公众号', defaultVal: 2 },
                  { key: 'douyin', label: '抖音', defaultVal: 2 },
                  { key: 'channels', label: '视频号', defaultVal: 2 }
                ].map(({ key, label, defaultVal }) => (
                  <div key={key} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 mb-1">{label}</div>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={((formData.targets as any)?.[key] !== undefined ? (formData.targets as any)[key] : defaultVal)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          targets: {
                            ...(formData.targets || { x: 10, xiaohongshu: 2, gzh: 2, douyin: 2, channels: 2 }),
                            [key]: val
                          }
                        });
                      }}
                      className="w-full text-center py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Backup & System Integrity (PRD 11.2 & UC-24) */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                数据安全与快照备份 (SQLite / 本地素材库)
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await api.createBackup();
                    alert(`✅ 全量备份成功！\n目录：${res.backupDir}`);
                  } catch (e: any) {
                    alert('备份失败：' + e.message);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition"
              >
                立即创建完整备份
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              备份覆盖所有选题、母稿、平台变体、已确认发布记录、历史口吻与导入资产，隔离存储于 backups/ 目录。
            </p>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/25 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>已保存</span>
                </>
              ) : (
                <span>{isSaving ? '保存中...' : '保存配置'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
