import React, { useState, useMemo } from 'react';
import { BenchmarkAccount, BenchmarkWork } from '../types';
import { api } from '../api';
import { 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  X, 
  Search, 
  Sliders, 
  Sparkles, 
  Flame, 
  ChevronRight,
  TrendingUp,
  Clock,
  Layers,
  FileText
} from 'lucide-react';

interface BenchmarkStudioProps {
  accounts: BenchmarkAccount[];
  onRefreshAccounts: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenDeconstructModal?: (title: string) => void;
}

export const BenchmarkStudio: React.FC<BenchmarkStudioProps> = ({
  accounts,
  onRefreshAccounts,
  onNavigateTab,
  onOpenDeconstructModal
}) => {
  // State for filters matching the screenshot
  const [subTab, setSubTab] = useState<'incoming' | 'benchmarks' | 'reports'>('benchmarks');
  const [threshold, setThreshold] = useState<number>(4); // 4x 爆款门槛
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week'); // 这一周 | 30天 | 全部
  const [workFilter, setWorkFilter] = useState<'viral' | 'all'>('viral'); // 爆款 | 全部作品
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<'multiplier' | 'likes' | 'time'>('multiplier'); // 按倍数 | 按点赞 | 按时间
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modal for adding a new benchmark / mentor
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [newAccountType, setNewAccountType] = useState<'benchmark' | 'mentor'>('benchmark');
  const [newAccountPlatform, setNewAccountPlatform] = useState<string>('douyin');
  const [newAccountProfileUrl, setNewAccountProfileUrl] = useState<string>('');
  const [newAccountDirection, setNewAccountDirection] = useState<string>('');
  const [newAccountWhy, setNewAccountWhy] = useState<string>('');
  const [newAccountFans, setNewAccountFans] = useState<string>('');
  const [newAccountMedian, setNewAccountMedian] = useState<string>('');

  // Follower Snapshot Modal State (PRD Cases 35/36)
  const [activeSnapshotAccount, setActiveSnapshotAccount] = useState<BenchmarkAccount | null>(null);
  const [snapFansRaw, setSnapFansRaw] = useState<string>('');
  const [snapPrecision, setSnapPrecision] = useState<'exact' | 'approximate' | 'unknown' | 'error'>('approximate');
  const [snapSource, setSnapSource] = useState<'manual' | 'tikhub'>('manual');
  const [snapError, setSnapError] = useState<string>('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  // Timeline / Sample Report Modal State (PRD Case 39)
  const [activeTimelineAccount, setActiveTimelineAccount] = useState<BenchmarkAccount | null>(null);
  const [geminiReportInput, setGeminiReportInput] = useState<string>('');
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Handle toggling account between "老师" and "对标"
  const handleToggleType = async (account: BenchmarkAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextType = account.type === 'benchmark' ? 'mentor' : 'benchmark';
    try {
      await api.updateBenchmark(account.id, { type: nextType });
      onRefreshAccounts();
    } catch (err) {
      console.error('Failed to toggle account type:', err);
    }
  };

  // Handle deleting an account
  const handleDeleteAccount = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定要移除账号「${name}」吗？`)) return;
    try {
      await api.deleteBenchmark(id);
      onRefreshAccounts();
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  // Handle syncing all accounts
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await api.syncBenchmarks();
      onRefreshAccounts();
    } catch (err) {
      console.error('Failed to sync benchmarks:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle adding account (PRD 35/36: never invent default fan or engagement metrics)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      await api.createBenchmark({
        name: newAccountName.trim(),
        type: newAccountType,
        platform: newAccountPlatform as any,
        profileUrl: newAccountProfileUrl.trim() || undefined,
        contentDirection: newAccountDirection.trim() || undefined,
        whyBenchmark: newAccountWhy.trim() || undefined,
        fansCount: newAccountFans.trim() ? newAccountFans.trim() : '未知',
        medianEngagement: newAccountMedian.trim() ? parseInt(newAccountMedian) : 0,
      });
      setIsAddModalOpen(false);
      setNewAccountName('');
      setNewAccountProfileUrl('');
      setNewAccountDirection('');
      setNewAccountWhy('');
      setNewAccountFans('');
      setNewAccountMedian('');
      onRefreshAccounts();
    } catch (err) {
      console.error('Failed to add account:', err);
    }
  };

  // Handle saving follower snapshot (PRD 35/36)
  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSnapshotAccount) return;
    setIsSavingSnapshot(true);
    try {
      await api.addFollowerSnapshot(activeSnapshotAccount.id, {
        fansCountRaw: snapFansRaw.trim() || '未知',
        precision: snapPrecision,
        source: snapSource,
        error: snapPrecision === 'error' ? (snapError.trim() || '采集失败') : undefined
      });
      setActiveSnapshotAccount(null);
      setSnapFansRaw('');
      setSnapError('');
      onRefreshAccounts();
    } catch (err: any) {
      alert('保存粉丝快照失败: ' + err.message);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Helper to compute snapshot diff between two recent snapshots
  const computeSnapshotDiff = (snapshots?: any[]) => {
    if (!snapshots || snapshots.length < 2) return null;
    const sorted = [...snapshots].sort((a, b) => (b.observedAt || '').localeCompare(a.observedAt || ''));
    const latest = sorted[0];
    const prev = sorted[1];
    if (latest.fansCount !== null && latest.fansCount !== undefined && prev.fansCount !== null && prev.fansCount !== undefined) {
      const diff = latest.fansCount - prev.fansCount;
      if (diff === 0) return '0 (无变动)';
      return `${diff > 0 ? '+' : ''}${diff.toLocaleString()} (有界变动)`;
    }
    return '非数值快照对比';
  };

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      if (searchKeyword.trim()) {
        const matchesName = acc.name.toLowerCase().includes(searchKeyword.toLowerCase());
        const matchesWork = acc.works?.some(w => w.title.toLowerCase().includes(searchKeyword.toLowerCase()));
        if (!matchesName && !matchesWork) return false;
      }
      return true;
    });
  }, [accounts, searchKeyword]);

  // Aggregate viral samples based on time range and threshold
  const sampleWorks = useMemo(() => {
    const list: Array<BenchmarkWork & { accountName: string }> = [];
    accounts.forEach(acc => {
      acc.works?.forEach(w => {
        if (dateRange === 'week' && w.publishTime < '2026-10-06') return;
        if (dateRange === 'month' && w.publishTime < '2026-09-09') return;
        if (workFilter === 'viral' && w.multiplier < threshold) return;
        list.push({ ...w, accountName: acc.name });
      });
    });

    if (sortBy === 'multiplier') {
      list.sort((a, b) => b.multiplier - a.multiplier);
    } else if (sortBy === 'likes') {
      list.sort((a, b) => b.likes - a.likes);
    } else {
      list.sort((a, b) => b.publishTime.localeCompare(a.publishTime));
    }
    return list;
  }, [accounts, dateRange, workFilter, threshold, sortBy]);

  const totalWorksAcrossAccounts = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (a.works?.length || 0), 0);
  }, [accounts]);

  const olderWorksCount = Math.max(0, totalWorksAcrossAccounts - sampleWorks.length);

  const latestSyncTime = useMemo(() => {
    let latest = '';
    accounts.forEach(a => {
      if (a.latestSnapshot?.observedAt && a.latestSnapshot.observedAt > latest) {
        latest = a.latestSnapshot.observedAt;
      }
      if (a.lastSyncedAt && a.lastSyncedAt > latest) {
        latest = a.lastSyncedAt;
      }
    });
    return latest ? new Date(latest).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未记录';
  }, [accounts]);

  // Helper to draw smooth trend sparklines with peak points
  const renderSparkline = (data: number[], median: number) => {
    if (!data || data.length === 0) return null;
    const width = 240;
    const height = 65;
    const padding = 6;
    const minVal = Math.min(...data) * 0.8;
    const maxVal = Math.max(...data, median * 1.5) * 1.15;
    const range = maxVal - minVal || 1;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return { x, y, val };
    });

    // Generate smooth SVG curve
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    // Median line y
    const medianY = height - padding - ((median - minVal) / range) * (height - padding * 2);

    // Identify peaks (above median * 1.4)
    const peakPoints = points.filter(p => p.val >= median * 1.4);

    return (
      <svg className="w-full h-16 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.28" />
            <stop offset="85%" stopColor="#ffedd5" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <path d={areaD} fill="url(#trendGrad)" />

        {/* Median dashed reference line */}
        <line
          x1={padding}
          y1={medianY}
          x2={width - padding}
          y2={medianY}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="2,3"
          strokeOpacity="0.6"
        />

        {/* Trend Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#475569"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Viral Spike Dots */}
        {peakPoints.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="2.8"
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-1">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-1.5 text-xs font-medium text-[#e1523d]">
            <span>进项</span>
            <span>·</span>
            <span>老师和对标</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            老师和对标
          </h1>

          {/* Explanatory notes */}
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            老师是学理念的，对标是看要不要复制的；点击卡片上的「老师 / 对标」切换。他们新发的视频在「进来的」的「老师」「对标」两栏里，你自己去看。这里不自动拆任何一条：想拆就点那条的「拆解」。
          </p>
        </div>

        {/* Sync Action and Schedule Note */}
        <div className="flex flex-col items-start md:items-end space-y-1.5 shrink-0">
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? '正在检查最新作品...' : '同步老师和对标'}</span>
          </button>
          <span className="text-[11px] text-slate-400 text-right leading-tight max-w-xs">
            最近采样：{latestSyncTime} · 仅采集公开最新页，不自动消耗点数
          </span>
        </div>
      </div>

      {/* 2. Sub-Tabs Bar */}
      <div className="flex items-center space-x-8 border-b border-slate-200 text-xs sm:text-sm font-medium">
        <button
          onClick={() => onNavigateTab('radar')}
          className="pb-2.5 text-slate-500 hover:text-slate-800 transition-colors"
        >
          进来的
        </button>
        <button
          onClick={() => setSubTab('benchmarks')}
          className="pb-2.5 text-[#e1523d] border-b-2 border-[#e1523d] font-semibold"
        >
          老师和对标
        </button>
        <button
          onClick={() => onNavigateTab('ideas')}
          className="pb-2.5 text-slate-500 hover:text-slate-800 transition-colors flex items-center space-x-1"
        >
          <span>拆解报告</span>
          <span className="text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full font-mono">2</span>
        </button>
      </div>

      {/* 3. Filter and Control Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: 爆款门槛 + Date Range */}
        <div className="flex flex-wrap items-center gap-4">
          {/* 爆款门槛 Slider */}
          <div className="flex items-center space-x-2 pl-1">
            <span className="text-slate-500 font-medium whitespace-nowrap">爆款门槛</span>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-24 sm:w-28 h-1.5 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
            <span className="text-orange-600 font-bold font-mono text-xs w-5">{threshold}×</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Date range pills */}
          <div className="inline-flex bg-slate-100/90 p-0.5 rounded-lg text-slate-600">
            <button
              onClick={() => setDateRange('week')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                dateRange === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              这一周
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                dateRange === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              30天
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                dateRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              全部
            </button>
          </div>

          {/* Viral vs All Works */}
          <div className="inline-flex bg-slate-100/90 p-0.5 rounded-lg text-slate-600">
            <button
              onClick={() => setWorkFilter('viral')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                workFilter === 'viral' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              爆款
            </button>
            <button
              onClick={() => setWorkFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                workFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              全部作品
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜标题"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 w-32 sm:w-40"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Right: Sort buttons */}
        <div className="flex items-center space-x-1.5 ml-auto">
          <button
            onClick={() => setSortBy('multiplier')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              sortBy === 'multiplier' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            按倍数
          </button>
          <button
            onClick={() => setSortBy('likes')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              sortBy === 'likes' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            按点赞
          </button>
          <button
            onClick={() => setSortBy('time')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              sortBy === 'time' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            按时间
          </button>
        </div>
      </div>

      {/* 4. Accounts Cards Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredAccounts.map((account) => {
          const isMentor = account.type === 'mentor';
          return (
            <div
              key={account.id}
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow p-3.5 flex flex-col justify-between relative group"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  {/* Type Tag (对标 / 老师) with interactive toggle */}
                  <button
                    onClick={(e) => handleToggleType(account, e)}
                    title="点击在「老师 / 对标」之间切换"
                    className={`px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                      isMentor
                        ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {isMentor ? '老师' : '对标'}
                  </button>

                  {/* Account Name */}
                  <span className="text-xs font-semibold text-slate-800 truncate" title={account.name}>
                    {account.name}
                  </span>
                </div>

                {/* Fans count & delete button */}
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {account.fansCount}
                  </span>
                  <button
                    onClick={(e) => handleDeleteAccount(account.id, account.name, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-0.5"
                    title="移除此账号"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sparkline Trend Chart */}
              <div className="my-1.5">
                {renderSparkline(account.trendData, account.medianEngagement)}
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 py-1.5 border-t border-slate-100 font-mono">
                <div>
                  <span className="text-slate-400 font-sans mr-0.5">中位</span>
                  <span className="font-semibold text-slate-700">{account.medianEngagement.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans mr-0.5">作品</span>
                  <span className="font-semibold text-slate-700">{account.worksCount}</span>
                </div>
                <div>
                  <span className="text-orange-500 font-sans mr-0.5">爆款</span>
                  <span className="font-bold text-orange-600">{account.viralCount}</span>
                </div>
              </div>

              {/* Snapshots diff comparison if available (PRD 35/36) */}
              {computeSnapshotDiff(account.snapshots) && (
                <div className="text-[10px] text-slate-500 font-mono my-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400">两期快照对比:</span>
                  <span className="text-indigo-600 font-semibold">{computeSnapshotDiff(account.snapshots)}</span>
                </div>
              )}

              {/* Card Footer: Timestamp & Actions */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100/60">
                {account.isLegacyUnverified ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[9px] border border-amber-200" title="历史未验证基准账号，不代表实时采集">
                    未验证历史数据
                  </span>
                ) : (
                  <span>{account.lastSyncedAt || '刚刚记录'}</span>
                )}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setActiveSnapshotAccount(account);
                      setSnapFansRaw(account.latestSnapshot?.fansCountRaw || account.fansCount || '');
                      setSnapPrecision(account.latestSnapshot?.precision || 'approximate');
                    }}
                    className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-medium transition-colors"
                    title="添加粉丝快照"
                  >
                    快照
                  </button>
                  <button
                    onClick={() => setActiveTimelineAccount(account)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors"
                    title="查看样本时间线与拆解报告"
                  >
                    报告
                  </button>
                  <a
                    href={account.profileUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-700 flex items-center space-x-0.5 transition-colors"
                  >
                    <span>主页</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Account Card (+ 加一个老师或对标) */}
        <div
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center p-6 cursor-pointer text-slate-400 hover:text-slate-600 min-h-[170px]"
        >
          <div className="w-7 h-7 rounded-full bg-white shadow-xs flex items-center justify-center mb-2 text-slate-500">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 mb-1">加一个老师或对标</span>
          <span className="text-[11px] text-slate-400">抖音，小红书，X，视频号</span>
        </div>
      </div>

      {/* 5. Bottom Section: 爆款样本 */}
      <div className="space-y-3 pt-4">
        {/* Header & Legend */}
        <div className="flex items-center justify-between text-xs">
          <div className="font-semibold text-slate-800">
            爆款样本 {sampleWorks.length} 条{olderWorksCount > 0 ? ` · 更早的 ${olderWorksCount} 条在「全部」里` : ''}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center space-x-3">
            <span>互动结构：</span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-emerald-500 inline-block rounded-xs" />
              <span>收藏</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-blue-500 inline-block rounded-xs" />
              <span>转发</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-amber-500 inline-block rounded-xs" />
              <span>评论（相对点赞）</span>
            </span>
          </div>
        </div>

        {/* Content Box */}
        {sampleWorks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 flex flex-col items-center justify-center text-center space-y-1.5 shadow-xs">
            <span className="text-xs font-medium text-slate-700">当前时间范围暂无新爆款</span>
            <span className="text-xs text-slate-400">
              {olderWorksCount > 0 ? `更早的 ${olderWorksCount} 条在「全部」里。` : '暂无历史样本，添加对标或导入内容后可查看。'}
            </span>
            <button
              onClick={() => setDateRange('all')}
              className="mt-2 text-xs text-[#e1523d] hover:underline font-medium"
            >
              查看全部历史爆款样本 →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {sampleWorks.map((work) => (
              <div key={work.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-bold font-mono">
                      {work.multiplier.toFixed(1)}× 爆款
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {work.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                    <span>来源：{work.accountName}</span>
                    <span>发布时间：{work.publishTime}</span>
                  </div>
                </div>

                {/* Metrics Breakdown Bar */}
                <div className="flex items-center space-x-6 text-xs shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-slate-800 font-mono">{work.likes.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">点赞</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600 font-mono">{work.favorites.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">收藏</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600 font-mono">{work.shares.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">转发</div>
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenDeconstructModal) {
                        onOpenDeconstructModal(work.title);
                      } else {
                        onNavigateTab('ideas');
                      }
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors"
                  >
                    拆解
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">加一个老师或对标账号</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">账号名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：dontbesilent 聊赚钱、徐兆猛"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">主页链接 / 平台账号唯一标识 (可选)</label>
                <input
                  type="text"
                  placeholder="例如：https://v.douyin.com/... 或 @handle"
                  value={newAccountProfileUrl}
                  onChange={(e) => setNewAccountProfileUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">角色定位</label>
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="benchmark">对标（看要不要复制）</option>
                    <option value="mentor">老师（学底层理念）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">主要平台</label>
                  <select
                    value={newAccountPlatform}
                    onChange={(e) => setNewAccountPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="douyin">抖音</option>
                    <option value="xiaohongshu">小红书</option>
                    <option value="channels">视频号</option>
                    <option value="twitter">推特 / X</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">粉丝体量 (选填，未知留空)</label>
                  <input
                    type="text"
                    placeholder="如：50万粉（留空记为未知）"
                    value={newAccountFans}
                    onChange={(e) => setNewAccountFans(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">中位互动数 (选填，未知留空)</label>
                  <input
                    type="number"
                    placeholder="留空记为 0"
                    value={newAccountMedian}
                    onChange={(e) => setNewAccountMedian(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">内容垂直方向 (可选)</label>
                <input
                  type="text"
                  placeholder="例如：商业模式拆解、AI工具流"
                  value={newAccountDirection}
                  onChange={(e) => setNewAccountDirection(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium shadow-sm"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follower Snapshot Modal (PRD Cases 35/36) */}
      {activeSnapshotAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                粉丝快照采集 · {activeSnapshotAccount.name}
              </h3>
              <button
                onClick={() => setActiveSnapshotAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              严格审计：两期快照展示有界变动；采集失败时保留上一有效值，绝不伪造历史趋势。
            </p>

            <form onSubmit={handleSaveSnapshot} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">采集来源</label>
                  <select
                    value={snapSource}
                    onChange={(e) => setSnapSource(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="manual">手动录入</option>
                    <option value="tikhub">TikHub 采集</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">数值精确度</label>
                  <select
                    value={snapPrecision}
                    onChange={(e) => setSnapPrecision(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="approximate">约数 (如 50万)</option>
                    <option value="exact">精确 (如 501,234)</option>
                    <option value="unknown">未知</option>
                    <option value="error">采集失败 (保留前值)</option>
                  </select>
                </div>
              </div>

              {snapPrecision !== 'error' ? (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">粉丝数文本</label>
                  <input
                    type="text"
                    required
                    placeholder="例如：52.3万、12000"
                    value={snapFansRaw}
                    onChange={(e) => setSnapFansRaw(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-rose-600 font-medium mb-1">采集失败原因</label>
                  <input
                    type="text"
                    required
                    placeholder="例如：平台接口限流或凭据失效"
                    value={snapError}
                    onChange={(e) => setSnapError(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg focus:outline-none focus:border-rose-500 text-rose-700 bg-rose-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">保存失败状态时，系统自动保留上一有效快照数值。</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSnapshotAccount(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingSnapshot}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-sm"
                >
                  {isSavingSnapshot ? '保存中...' : '录入快照'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Timeline & Sample Report Modal (PRD Case 39) */}
      {activeTimelineAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  账号样本分析报告 · {activeTimelineAccount.name}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  平台: {activeTimelineAccount.platform} | 粉丝体量: {activeTimelineAccount.fansCount}
                </span>
              </div>
              <button
                onClick={() => setActiveTimelineAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Timeline Info Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">已观测样本作品数:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {activeTimelineAccount.works?.length || activeTimelineAccount.worksCount || 0} 篇
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">最早观测样本时间:</span>
                <span className="font-semibold text-slate-700 font-mono">
                  {activeTimelineAccount.earliestSampleDate || activeTimelineAccount.earliestSampleTime || '暂无历史作品采样'} (最早观测样本，非账号注册时间)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">最近数据观测时间:</span>
                <span className="font-semibold text-slate-700 font-mono">
                  {activeTimelineAccount.lastSyncedAt || '暂无'}
                </span>
              </div>
            </div>

            {/* External Gemini Subscription Report Import / Handoff */}
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-indigo-900 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Gemini 订阅深度拆解报告 / 观察笔记</span>
              </span>
              <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                无需付费 API。使用外部 Gemini 订阅分析账号作品后，粘贴分析笔记，严格区分「事实陈述」与「策略推论」：
              </p>
              <textarea
                value={geminiReportInput || (activeTimelineAccount as any).geminiReportNotes || ''}
                onChange={(e) => setGeminiReportInput(e.target.value)}
                placeholder="例如：\n[事实陈述]：近7日发布4条关于AI工具的短视频，点赞中位数为2300...\n[策略推论]：该博主主要通过前3秒痛点设问拉高完播率..."
                rows={4}
                className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none font-sans"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    if (!geminiReportInput.trim()) return;
                    try {
                      await api.updateBenchmark(activeTimelineAccount.id, {
                        ...activeTimelineAccount,
                        geminiReportNotes: geminiReportInput.trim()
                      } as any);
                      alert('✅ 拆解报告已成功保存至账号档案');
                    } catch (e: any) {
                      alert('保存失败: ' + e.message);
                    }
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
                >
                  保存拆解报告
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveTimelineAccount(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
