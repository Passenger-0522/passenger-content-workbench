import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderInput,
  ShieldAlert,
  ArrowRight,
  Database,
  Coins,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
  Copy
} from 'lucide-react';
import { ImportReceipt } from '../types';
import { api } from '../api';

export const ReceiptStudio: React.FC = () => {
  const [pendingPackages, setPendingPackages] = useState<string[]>([]);
  const [receipts, setReceipts] = useState<ImportReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ImportReceipt | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pendingRes, allReceipts] = await Promise.all([
        api.getPendingHandoff().catch(() => ({ pendingImportIds: [] })),
        api.getReceipts().catch(() => [])
      ]);

      setPendingPackages(pendingRes.pendingImportIds || []);
      setReceipts(allReceipts);
      if (allReceipts.length > 0) {
        setSelectedReceipt(allReceipts[0]);
      }
    } catch (e: any) {
      console.error('Failed to load receipts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualImport = async (importId: string) => {
    try {
      const res = await api.importHandoff(importId);
      alert(`✅ 导入成功！回执状态：${res.receipt.status}，增加素材：${res.receipt.assetsAdded}`);
      loadData();
    } catch (e: any) {
      alert('导入失败: ' + e.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'imported':
      case 'success':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 mr-0.5" />已入库</span>;
      case 'conflict_preserved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800 flex items-center space-x-1"><AlertTriangle className="w-3 h-3 mr-0.5" />正文冲突已保护</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800 flex items-center space-x-1"><ShieldAlert className="w-3 h-3 mr-0.5" />修改被拒绝</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800 flex items-center space-x-1"><XCircle className="w-3 h-3 mr-0.5" />导入失败</span>;
      case 'partial':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800 flex items-center space-x-1"><Info className="w-3 h-3 mr-0.5" />部分素材有效</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  const getCostPathBadge = (costPath?: string, executor?: string) => {
    if (costPath === 'subscription_quota' || executor === 'gemini') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-400 border border-sky-800" title="Gemini 订阅配额，余额不可查显示未知">
          订阅额度 (未知余额)
        </span>
      );
    }
    if (costPath === 'local_imagegen' || executor === 'codex') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-400 border border-purple-800" title="Codex 本地生图，配额用尽时为 paused_quota，绝不调用付费模型 API">
          本地生图 (paused_quota保护)
        </span>
      );
    }
    if (costPath === 'tikhub_billing') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800" title="TikHub 平台第三方独立计费，需单独配置">
          TikHub 独立计费
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800" title="本地排版与净化免费执行">
        本地免费 (0费用)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <span>外部工具交接回执与任务日志 (Task Receipts)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            全部落盘回执记录 · 执行方与技能追溯 · 计费路径严格审计 · 永不静默回退付费模型 API
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>刷新回执与就绪包</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Pending READY Packages + Stored Receipts List */}
        <div className="col-span-6 bg-[#14161c] border border-slate-800/80 rounded-2xl p-4 space-y-4">
          {/* Pending section */}
          {pendingPackages.length > 0 && (
            <div className="space-y-2 p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                <span>待入库 READY 就绪包 ({pendingPackages.length})</span>
                <span className="text-[10px] text-indigo-400 font-mono">后台自动扫描中</span>
              </div>
              <div className="space-y-1.5">
                {pendingPackages.map(pkg => (
                  <div
                    key={pkg}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-indigo-300 font-medium">{pkg}</span>
                    <button
                      onClick={() => handleManualImport(pkg)}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium transition"
                    >
                      手动扫入
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stored Receipts Header */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200 pt-1">
            <span className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>已归档历史任务回执 ({receipts.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">落盘位置: data/receipts/</span>
          </div>

          {/* Receipts list */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {receipts.map(rec => {
              const isSelected = selectedReceipt?.importId === rec.importId;
              return (
                <div
                  key={rec.receiptId || rec.importId}
                  onClick={() => setSelectedReceipt(rec)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-800/80 border-indigo-500/80 shadow-xs'
                      : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-slate-200 font-medium truncate max-w-[220px]">
                      {rec.importId}
                    </span>
                    {getStatusBadge(rec.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                      执行方: {rec.executionParty || 'external'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                      技能: {rec.skillId || 'native'}
                    </span>
                    {getCostPathBadge(rec.costPath, rec.executionParty)}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2 pt-1.5 border-t border-slate-800/60">
                    <span>增加资产: {rec.assetsAdded ?? 0} 件</span>
                    <span>{rec.importedAt ? new Date(rec.importedAt).toLocaleString('zh-CN', { hour12: false }) : '时间未知'}</span>
                  </div>
                </div>
              );
            })}

            {receipts.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                暂无历史交接回执。在项目工坊导出交接任务或通过 Antigravity 对话捕获将自动生成。
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Receipt Detail & Audit Spec */}
        <div className="col-span-6 bg-[#14161c] border border-slate-800/80 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>回执详情审计 (Receipt Audit)</span>
            </span>
            {selectedReceipt && (
              <span className="font-mono text-[10px] text-slate-500">
                ID: {selectedReceipt.receiptId || selectedReceipt.importId}
              </span>
            )}
          </h3>

          {selectedReceipt ? (
            <div className="space-y-4">
              {/* Overview Card */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">导入包标识 (importId):</span>
                  <span className="font-mono text-indigo-400 font-medium">{selectedReceipt.importId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">目标项目 ID (projectId):</span>
                  <span className="font-mono text-slate-300">{selectedReceipt.projectId || '无关联项目'}</span>
                </div>
                {selectedReceipt.taskId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">任务 ID (taskId):</span>
                    <span className="font-mono text-slate-300">{selectedReceipt.taskId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">处理状态 (status):</span>
                  <div>{getStatusBadge(selectedReceipt.status)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">执行主体 (executor):</span>
                  <span className="font-mono text-slate-200">{selectedReceipt.executionParty || '外部工具'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">调用技能 (skillId):</span>
                  <span className="font-mono text-slate-200">{selectedReceipt.skillId || '默认生图/交接'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">计费路径 (costPath):</span>
                  <div>{getCostPathBadge(selectedReceipt.costPath, selectedReceipt.executionParty)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">配额安全状态 (quotaStatus):</span>
                  <div>
                    {selectedReceipt.quotaStatus === 'paused' ? (
                      <span className="font-mono text-amber-400 font-semibold">paused_quota (配额耗尽已暂停，无付费回退)</span>
                    ) : selectedReceipt.quotaStatus === 'active' ? (
                      <span className="font-mono text-emerald-400 font-semibold">active (订阅配额正常生效)</span>
                    ) : (
                      <span className="font-mono text-slate-400">unknown (订阅余额不可查，严禁伪造余额)</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">落盘新增素材数 (assetsAdded):</span>
                  <span className="font-mono text-amber-400 font-semibold">{selectedReceipt.assetsAdded ?? 0}</span>
                </div>
              </div>

              {/* Skill Registry & Continuation Instructions (PRD Case 30) */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs">
                <span className="text-indigo-300 font-bold block flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>技能调用与外部任务接续指令</span>
                </span>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">技能注册路径:</span>
                    <span className="font-mono text-slate-300">
                      {selectedReceipt.skillId === 'punk-cover'
                        ? '.agents/skills/punk-cover/'
                        : selectedReceipt.skillId === 'lieflat-less-ai-tone'
                        ? '.agents/skills/lieflat-less-ai-tone/'
                        : `.agents/skills/${selectedReceipt.skillId || 'native'}/`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">任务包存储目录:</span>
                    <span className="font-mono text-slate-300">
                      data/incoming/{selectedReceipt.importId}/
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">费用约束规则:</span>
                    <span className="text-emerald-400 font-mono">
                      ENABLE_MODEL_API=false (严禁回退付费API)
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 font-medium">外部工具对话接续 Prompt:</span>
                    <button
                      onClick={() => {
                        const prompt = `请读取 data/incoming/${selectedReceipt.importId}/manifest.json 任务包，并根据其中的正文和规范生成对应封面图片或排版，完成后写入 READY 标记。`;
                        navigator.clipboard.writeText(prompt);
                        alert('已复制任务接续 Prompt 到剪贴板！');
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制接续指令</span>
                    </button>
                  </div>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400 select-all">
                    请读取 data/incoming/{selectedReceipt.importId}/manifest.json 任务包，并根据其中的正文和规范生成对应封面图片或排版，完成后写入 READY 标记。
                  </div>
                </div>
              </div>

              {/* Conflict Alert if any */}
              {selectedReceipt.conflict && (
                <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl space-y-1.5 text-xs text-amber-300">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>正文版本冲突保护生效</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    {selectedReceipt.conflict.message || '外部任务基于旧修订版本，已保护网站当前权威正文。'}
                  </p>
                  <div className="text-[10px] font-mono text-amber-400/80 pt-1">
                    任务基准版本: Rev {selectedReceipt.conflict.baseRevision} · 网站当前版本: Rev {selectedReceipt.conflict.currentRevision}
                  </div>
                </div>
              )}

              {/* Warnings List if any */}
              {selectedReceipt.warnings && selectedReceipt.warnings.length > 0 && (
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">处理警告与审计提示 ({selectedReceipt.warnings.length}):</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {selectedReceipt.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw JSON View */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">落盘回执完整 JSON 数据:</span>
                <pre className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-[10px] font-mono text-slate-400 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(selectedReceipt, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">
              请在左侧选择一份交接回执以查看完整审计细节
            </div>
          )}

          {/* Bottom Protocol Box */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs leading-relaxed text-slate-400">
            <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider block font-semibold">
              PRD v1.2 双客户端交接与计费准则：
            </span>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li><strong>无付费 API 回退：</strong> Codex 或 Gemini 网页订阅额度耗尽时直接进入 paused_quota 状态，严禁转为按量付费 API 产生账单。</li>
              <li><strong>TikHub 独立结算：</strong> 热点与博主检索独立配置 API Key 并单列计费，不与模型配额混同。</li>
              <li><strong>双端正文互锁：</strong> 正文锁定期间 Codex 仅允许生成图片与排版，严禁覆写 Approved Copy。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
