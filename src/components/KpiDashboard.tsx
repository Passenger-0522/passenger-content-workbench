import React, { useState, useEffect } from 'react';
import {
  Target,
  Trophy,
  CheckCircle2,
  Calendar,
  Download,
  Copy,
  Check,
  Flame,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Trash2,
  ExternalLink,
  DollarSign,
  Plus,
  Send,
  AlertCircle
} from 'lucide-react';
import {
  KpiStats,
  Post,
  DashboardPublishStats,
  PublishRecord,
  LeadRecord,
  ContentProject,
  PlatformVariant,
  PlatformType
} from '../types';
import { api } from '../api';

interface KpiDashboardProps {
  kpiStats: any;
  onRefreshKpi: () => void;
  onEditPost: (topicId?: string) => void;
}

export const KpiDashboard: React.FC<KpiDashboardProps> = ({
  kpiStats,
  onRefreshKpi,
  onEditPost,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // PRD v1.2 Real Dashboard & Publishing States
  const [dashboardStats, setDashboardStats] = useState<DashboardPublishStats | null>(null);
  const [publishRecords, setPublishRecords] = useState<PublishRecord[]>([]);
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);

  // Confirm publish modal / state
  const [confirmingVariant, setConfirmingVariant] = useState<{
    projectId: string;
    variantId: string;
    platform: PlatformType;
    title: string;
  } | null>(null);
  const [publishUrlInput, setPublishUrlInput] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // New Lead Modal
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [leadTitle, setLeadTitle] = useState('');
  const [leadClient, setLeadClient] = useState('');
  const [leadType, setLeadType] = useState<any>('commercial_order');
  const [leadAmount, setLeadAmount] = useState<string>('');
  const [leadAmountUnknown, setLeadAmountUnknown] = useState(false);
  const [leadPlatform, setLeadPlatform] = useState<PlatformType>('xiaohongshu');

  const loadV12Data = async () => {
    try {
      const [stats, records, projs, leadsList] = await Promise.all([
        api.getPublishDashboard(),
        api.getPublishRecords(),
        api.getProjects(),
        api.getLeads(),
      ]);
      setDashboardStats(stats);
      setPublishRecords(records);
      setProjects(projs);
      setLeads(leadsList);
    } catch (e) {
      console.error('Failed to load v1.2 KPI data:', e);
    }
  };

  useEffect(() => {
    loadV12Data();
  }, []);

  const target = dashboardStats?.target || kpiStats?.target || 20;
  const publishedCount = dashboardStats?.publishedCount ?? (kpiStats?.completedCount || 0);
  const readyCount = dashboardStats?.readyCount ?? 0;
  const inProgressCount = dashboardStats?.inProgressCount ?? 0;
  const remaining = dashboardStats?.remainingToTarget ?? Math.max(0, target - publishedCount);
  const rate = Math.min(100, Math.round((publishedCount / target) * 100));
  const posts = kpiStats?.posts || [];

  // Handle user confirming publish (UC-14, UC-15)
  const handleConfirmPublish = async () => {
    if (!confirmingVariant) return;
    setIsConfirming(true);
    try {
      await api.confirmPublish(
        confirmingVariant.projectId,
        confirmingVariant.variantId,
        publishUrlInput.trim() || undefined
      );
      setConfirmingVariant(null);
      setPublishUrlInput('');
      await loadV12Data();
      onRefreshKpi();
    } catch (e: any) {
      alert(e.message || '确认发布失败');
    } finally {
      setIsConfirming(false);
    }
  };

  // Add new lead (UC-23)
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadTitle.trim() || !leadClient.trim()) return;
    try {
      await api.createLead({
        title: leadTitle.trim(),
        clientOrPlatform: leadClient.trim(),
        type: leadType,
        amount: leadAmountUnknown ? null : (parseFloat(leadAmount) || null),
        amountUnknown: leadAmountUnknown,
        status: 'inquiry',
        platform: leadPlatform,
      });
      setIsAddLeadOpen(false);
      setLeadTitle('');
      setLeadClient('');
      setLeadAmount('');
      setLeadAmountUnknown(false);
      const updatedLeads = await api.getLeads();
      setLeads(updatedLeads);
    } catch (e: any) {
      alert(e.message || '创建商业线索失败');
    }
  };

  // Copy single post
  const handleCopyPost = (post: Post) => {
    const text = `${post.title}\n\n${post.content}\n\n${post.tags.map((t) => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy all today's posts
  const handleCopyAll = () => {
    let full = `# 今日自媒体文案产出合集 (${kpiStats?.dateKey || '今日'})\n\n`;
    posts.forEach((p, idx) => {
      full += `## 第 ${idx + 1} 篇：${p.title}\n\n${p.content}\n\n${p.tags.map((t) => `#${t}`).join(' ')}\n\n---\n\n`;
    });
    navigator.clipboard.writeText(full);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Group variants into workflow & schedule categories (PRD Case 28)
  const [scheduleFilterTab, setScheduleFilterTab] = useState<
    'ready' | 'today_due' | 'overdue' | 'unscheduled' | 'in_progress' | 'all_unpublished'
  >('ready');

  const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());

  const todayDueVariants: Array<{ project: ContentProject; variant: PlatformVariant }> = [];
  const overdueVariants: Array<{ project: ContentProject; variant: PlatformVariant }> = [];
  const unscheduledVariants: Array<{ project: ContentProject; variant: PlatformVariant }> = [];
  const inProgressVariants: Array<{ project: ContentProject; variant: PlatformVariant }> = [];
  const readyVariants: Array<{ project: ContentProject; variant: PlatformVariant }> = [];
  const doneUnpublishedVariants: Array<{ project: ContentProject; variant: PlatformVariant }> = [];

  const xBreakdown = {
    short_post: 0,
    threadUnits: 0,
    threadTotalPosts: 0,
    quote: 0,
    long_article: 0,
  };

  projects.forEach((proj) => {
    (proj.variants || []).forEach((v) => {
      const item = { project: proj, variant: v };
      if (v.status !== 'published') {
        doneUnpublishedVariants.push(item);
        if (v.status === 'ready') readyVariants.push(item);
        if (v.status === 'draft') inProgressVariants.push(item);

        if (v.plannedPublishDate) {
          if (v.plannedPublishDate === todayDateStr) {
            todayDueVariants.push(item);
          } else if (v.plannedPublishDate < todayDateStr) {
            overdueVariants.push(item);
          } else {
            unscheduledVariants.push(item);
          }
        } else {
          unscheduledVariants.push(item);
        }
      }

      if (v.platform === 'x') {
        if (v.format === 'short_post') xBreakdown.short_post++;
        else if (v.format === 'thread') {
          xBreakdown.threadUnits++;
          xBreakdown.threadTotalPosts += (v.threadPosts?.length || 3);
        } else if (v.format === 'quote') xBreakdown.quote++;
        else if (v.format === 'long_article') xBreakdown.long_article++;
      }
    });
  });

  const handleUpdateVariantSchedule = async (projectId: string, variantId: string, plannedPublishDate: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    const updatedVariants = proj.variants.map(v => v.id === variantId ? { ...v, plannedPublishDate: plannedPublishDate || undefined } : v);
    try {
      await api.updateProject(projectId, { variants: updatedVariants });
      setProjects(projects.map(p => p.id === projectId ? { ...p, variants: updatedVariants } : p));
    } catch (err: any) {
      alert('更新排期失败: ' + err.message);
    }
  };

  const platformNames: Record<PlatformType, string> = {
    x: 'X (推特)',
    xiaohongshu: '小红书',
    gzh: '微信公众号',
    douyin: '抖音',
    channels: '视频号',
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>模块五：日更 KPI 真实发布统计与商业成果</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            五平台矩阵日更发布看板（目标 {target} 篇/日）
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            五平台协同发布（X 建议 10~15 条，小红书/微信公众号/抖音/视频号各 1~2 条）。严格区分「制作中 / 就绪待发 / 用户确认发布」，仅在平台真实上线并确认后方计入 KPI。
          </p>
        </div>

        {/* Export & Copy Actions */}
        <div className="flex items-center space-x-3 self-start md:self-center">
          <button
            onClick={handleCopyAll}
            disabled={posts.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-40"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">已复制全部合集</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制今日全部文案</span>
              </>
            )}
          </button>

          <a
            href={api.getExportUrl()}
            download
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 Markdown 合集包</span>
          </a>
        </div>
      </div>

      {/* KPI Stats Cards Grid (PRD v1.2 Strict Categorization) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        {/* Card 1: Published / Target (UC-14) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">真实已发布 (KPI)</span>
            <div className="text-2xl font-extrabold text-white flex items-baseline space-x-1">
              <span className={publishedCount >= target ? 'text-emerald-400' : 'text-indigo-400'}>
                {publishedCount}
              </span>
              <span className="text-xs font-normal text-slate-500">/ {target} 篇</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {publishedCount >= target ? '🎉 目标达成！' : `差 ${remaining} 篇`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Ready to publish */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">待发已就绪</span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">{readyCount} 篇</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">文案+图已通过，等待上线</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">加工制作中</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">{inProgressCount} 篇</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">写稿 / 作图 / 排版中</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Completion Rate */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">发布达成率</span>
            <div className="text-2xl font-extrabold text-white font-mono">{rate}%</div>
            <div className="w-24 bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  publishedCount >= target ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Commercial Leads */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">商业线索/收益</span>
            <div className="text-2xl font-extrabold text-orange-400 font-mono">{leads.length} 条</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">商单 · 咨询 · 陪跑</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 5-Platform Breakdown Panel */}
      {dashboardStats?.byPlatform && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">各平台日更目标拆解与实时状态</span>
            <span className="text-[11px] text-slate-500">
              各平台目标总和: {Object.values(dashboardStats.byPlatform).reduce((a, b) => a + b.target, 0)} 篇/天
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {(['x', 'xiaohongshu', 'gzh', 'douyin', 'channels'] as PlatformType[]).map((pKey) => {
              const pData = dashboardStats.byPlatform[pKey] || { target: 2, ready: 0, published: 0 };
              const isMet = pData.published >= pData.target;
              return (
                <div
                  key={pKey}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{platformNames[pKey]}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isMet
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {pData.published} / {pData.target}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>就绪待发: {pData.ready}</span>
                    <span>已发: {pData.published}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isMet ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{
                        width: `${Math.min(100, Math.round((pData.published / Math.max(1, pData.target)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* X (Twitter) Type Breakdown Panel (PRD Case 28) */}
      <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-900/40 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-sky-300">
          <span>X (推特) 细分发布形式统计 (Thread 1 篇 = 1 单元 / N 条 Posts 计入)</span>
          <span className="text-[10px] text-sky-400 font-mono">高频主阵地拆解</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">短推 (Short Post)</span>
            <div className="text-lg font-bold text-white font-mono">{xBreakdown.short_post} 条</div>
            <span className="text-[10px] text-slate-500">单条精炼观点</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">推文串 (Thread)</span>
            <div className="text-lg font-bold text-sky-400 font-mono">{xBreakdown.threadUnits} 篇</div>
            <span className="text-[10px] text-slate-500 font-mono">共 {xBreakdown.threadTotalPosts} 条 Post (按 1 篇计)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">引用推 (Quote)</span>
            <div className="text-lg font-bold text-white font-mono">{xBreakdown.quote} 条</div>
            <span className="text-[10px] text-slate-500">带观点引述</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] block">长推 / 长文</span>
            <div className="text-lg font-bold text-white font-mono">{xBreakdown.long_article} 篇</div>
            <span className="text-[10px] text-slate-500">长篇深度剖析</span>
          </div>
        </div>
      </div>

      {/* Categorized Publishing & Scheduling Queue (PRD Case 28) */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">排期与发布确认工作流</h3>
            <span className="text-xs text-slate-400">（单平台发布不隐藏其他版本）</span>
          </div>

          {/* Schedule Category Pills */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setScheduleFilterTab('ready')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                scheduleFilterTab === 'ready'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>待发就绪</span>
              <span className="text-[10px] bg-slate-800 px-1 rounded-full">{readyVariants.length}</span>
            </button>
            <button
              onClick={() => setScheduleFilterTab('today_due')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                scheduleFilterTab === 'today_due'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>今日应发</span>
              <span className="text-[10px] bg-slate-800 px-1 rounded-full">{todayDueVariants.length}</span>
            </button>
            <button
              onClick={() => setScheduleFilterTab('overdue')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                scheduleFilterTab === 'overdue'
                  ? 'bg-rose-500/20 text-rose-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>逾期未发</span>
              <span className="text-[10px] bg-slate-800 px-1 rounded-full">{overdueVariants.length}</span>
            </button>
            <button
              onClick={() => setScheduleFilterTab('unscheduled')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                scheduleFilterTab === 'unscheduled'
                  ? 'bg-slate-800 text-slate-200 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>未排期待定</span>
              <span className="text-[10px] bg-slate-800 px-1 rounded-full">{unscheduledVariants.length}</span>
            </button>
            <button
              onClick={() => setScheduleFilterTab('in_progress')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                scheduleFilterTab === 'in_progress'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>制作中草稿</span>
              <span className="text-[10px] bg-slate-800 px-1 rounded-full">{inProgressVariants.length}</span>
            </button>
            <button
              onClick={() => setScheduleFilterTab('all_unpublished')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                scheduleFilterTab === 'all_unpublished'
                  ? 'bg-indigo-600/30 text-indigo-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              全部未发布 ({doneUnpublishedVariants.length})
            </button>
          </div>
        </div>

        {/* Selected Category List */}
        {(() => {
          const displayList =
            scheduleFilterTab === 'ready'
              ? readyVariants
              : scheduleFilterTab === 'today_due'
              ? todayDueVariants
              : scheduleFilterTab === 'overdue'
              ? overdueVariants
              : scheduleFilterTab === 'unscheduled'
              ? unscheduledVariants
              : scheduleFilterTab === 'in_progress'
              ? inProgressVariants
              : doneUnpublishedVariants;

          if (displayList.length === 0) {
            return (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                当前分类暂无变体版本。可在上方选择其他排期视图或在项目工坊中排期。
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              {displayList.map(({ project, variant }) => (
                <div
                  key={variant.id}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono border border-indigo-900/60">
                        {platformNames[variant.platform] || variant.platform}
                      </span>
                      <span className="text-xs font-bold text-slate-200 truncate">{variant.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        variant.status === 'ready'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {variant.status === 'ready' ? '就绪待发' : '制作中草稿'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      母项目: {project.title} · 形式: {variant.format} · 配图: {variant.covers?.length || 0} 张
                    </div>
                  </div>

                  {/* Schedule Date Control & Publish Action */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="flex items-center space-x-1.5 text-xs">
                      <span className="text-slate-400 text-[10px]">计划发布日:</span>
                      <input
                        type="date"
                        value={variant.plannedPublishDate || ''}
                        onChange={e => handleUpdateVariantSchedule(project.id, variant.id, e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                        title="设置或调整该变体的计划发布日期 (Asia/Shanghai)"
                      />
                    </div>

                    <button
                      onClick={() =>
                        setConfirmingVariant({
                          projectId: project.id,
                          variantId: variant.id,
                          platform: variant.platform,
                          title: variant.title,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
                      title="手动确认已在平台公开发布，累加今日 KPI"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>记录已发布</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Commercial Leads & Revenue Records (PRD 5.5, UC-22, UC-23) */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-sm text-white">商业线索与变现转化</h3>
            <span className="text-xs font-mono text-orange-400">({leads.length} 笔)</span>
          </div>
          <button
            onClick={() => setIsAddLeadOpen(true)}
            className="px-3 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-semibold flex items-center space-x-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增线索 / 商单</span>
          </button>
        </div>

        {leads.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
            暂无商业转化记录。点击右上角记录商单合作、付费咨询或分成。
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800/40">
                      {lead.type === 'commercial_order'
                        ? '商单合作'
                        : lead.type === 'consulting'
                        ? '付费咨询'
                        : lead.type === 'coaching'
                        ? 'IP陪跑'
                        : '平台分成'}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{lead.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    客户/平台: <span className="text-slate-300">{lead.clientOrPlatform}</span>
                    {lead.platform && ` · 来源平台: ${platformNames[lead.platform] || lead.platform}`}
                    {lead.notes && ` · 备注: ${lead.notes}`}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-orange-400">
                    {lead.amountUnknown || lead.amount === null ? (
                      <span className="text-slate-500 italic">金额未知 / 待结算</span>
                    ) : (
                      `¥${lead.amount.toLocaleString()}`
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {lead.status === 'inquiry'
                      ? '初洽'
                      : lead.status === 'negotiating'
                      ? '谈判中'
                      : lead.status === 'confirmed'
                      ? '已签约'
                      : lead.status === 'delivered'
                      ? '已交付'
                      : '已到账'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published History Records */}
      {publishRecords.length > 0 && (
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">已确认发布历史</h3>
              <span className="text-xs font-mono text-emerald-400">({publishRecords.length} 篇)</span>
            </div>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {publishRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono">
                    {platformNames[rec.platform] || rec.platform}
                  </span>
                  <span className="font-medium text-slate-200">{rec.title}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <span>{new Date(rec.publishedAt).toLocaleString()}</span>
                  {rec.externalUrl && (
                    <a
                      href={rec.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111827] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>确认在平台已真实发布</span>
            </h3>
            <p className="text-xs text-slate-400">
              项目「{confirmingVariant.title}」已在 {platformNames[confirmingVariant.platform]} 上线发布？确认后将真实计入今日 KPI。
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                线上发布链接 (可选)：
              </label>
              <input
                type="text"
                value={publishUrlInput}
                onChange={(e) => setPublishUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmingVariant(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isConfirming}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isConfirming ? '确认中...' : '确定已发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleCreateLead}
            className="bg-[#111827] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-orange-400" />
              <span>新增商业线索与变现记录</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">合作类型</label>
                <select
                  value={leadType}
                  onChange={(e) => setLeadType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="commercial_order">商单合作</option>
                  <option value="consulting">1v1 付费咨询</option>
                  <option value="coaching">超级个体陪跑</option>
                  <option value="platform_incentive">平台创作分成</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">标的名称 / 需求简介</label>
                <input
                  type="text"
                  required
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                  placeholder="例如：AI工具测评植入商单"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">客户名称 / 平台方</label>
                <input
                  type="text"
                  required
                  value={leadClient}
                  onChange={(e) => setLeadClient(e.target.value)}
                  placeholder="例如：某科技公司市场部"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">预估/成交金额 (元)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={leadAmountUnknown}
                    value={leadAmount}
                    onChange={(e) => setLeadAmount(e.target.value)}
                    placeholder="例如：3500"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 disabled:opacity-40"
                  />
                  <label className="flex items-center space-x-1 text-[11px] text-slate-400 whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={leadAmountUnknown}
                      onChange={(e) => setLeadAmountUnknown(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span>金额未知</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">来源平台</label>
                <select
                  value={leadPlatform}
                  onChange={(e) => setLeadPlatform(e.target.value as PlatformType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="xiaohongshu">小红书</option>
                  <option value="x">X (推特)</option>
                  <option value="gzh">微信公众号</option>
                  <option value="douyin">抖音</option>
                  <option value="channels">视频号</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddLeadOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition"
              >
                保存线索
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
