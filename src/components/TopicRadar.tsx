import React, { useState, useEffect } from 'react';
import {
  Flame,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  Layers,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Topic, TrendingItem } from '../types';
import { api } from '../api';

interface TopicRadarProps {
  topics: Topic[];
  onRefreshTopics: () => void;
  onGoToIdeas: (topicId: string) => void;
}

export const TopicRadar: React.FC<TopicRadarProps> = ({
  topics,
  onRefreshTopics,
  onGoToIdeas,
}) => {
  const [platform, setPlatform] = useState<'douyin' | 'xiaohongshu' | 'tiktok' | 'weibo'>('douyin');
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isMiningTopics, setIsMiningTopics] = useState(false);
  const [radarSource, setRadarSource] = useState<string>('cached_radar');

  // Topic filter supporting real workflow statuses (PRD Case 27)
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'to_do' | 'in_progress' | 'done' | 'deferred' | 'abandoned' | 'pending' | 'accepted' | 'generated'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual topic creation state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customAngle, setCustomAngle] = useState('');

  // Fetch TikHub trends
  const loadTrends = async (plat = platform) => {
    setIsLoadingTrends(true);
    try {
      const res = await api.getTrends(plat);
      setTrends(res.data);
      setRadarSource(res.source);
      // Pre-select top 3 trends
      setSelectedTrends(res.data.slice(0, 3).map((t) => t.keyword));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  useEffect(() => {
    loadTrends(platform);
  }, [platform]);

  // Toggle trend checkbox
  const toggleTrend = (keyword: string) => {
    setSelectedTrends((prev) =>
      prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]
    );
  };

  // Select all or top 5
  const selectTopTrends = (count: number) => {
    setSelectedTrends(trends.slice(0, count).map((t) => t.keyword));
  };

  // Mine topics using Gemini
  const handleMineTopics = async () => {
    if (selectedTrends.length === 0) {
      alert('请先勾选至少一个热点！');
      return;
    }
    setIsMiningTopics(true);
    try {
      await api.mineTopics(selectedTrends, 6);
      onRefreshTopics();
      setFilterStatus('pending');
    } catch (err: any) {
      alert(err.message || '选题生成失败，请检查 Gemini API 配置');
    } finally {
      setIsMiningTopics(false);
    }
  };

  // Accept topic
  const handleAcceptTopic = async (topic: Topic) => {
    try {
      await api.updateTopic(topic.id, { status: 'accepted' });
      onRefreshTopics();
    } catch (err) {
      console.error(err);
    }
  };

  // Reject topic
  const handleRejectTopic = async (topic: Topic) => {
    try {
      await api.deleteTopic(topic.id);
      onRefreshTopics();
    } catch (err) {
      console.error(err);
    }
  };

  // Add custom topic
  const handleAddCustomTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    try {
      await api.createTopic({
        title: customTitle,
        angleHook: customAngle || '独创视角与观点阐述',
        platform: 'custom',
        sourceHot: '手动原创录入',
        category: '原创灵感',
      });
      setCustomTitle('');
      setCustomAngle('');
      setIsAddingCustom(false);
      onRefreshTopics();
      setFilterStatus('accepted');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle updating topic status (PRD Case 27)
  const handleUpdateStatus = async (topicId: string, newStatus: any) => {
    try {
      await api.updateTopic(topicId, { status: newStatus });
      onRefreshTopics();
    } catch (err: any) {
      alert('更新选题状态失败: ' + err.message);
    }
  };

  // Filter topics
  const filteredTopics = topics.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery) {
      return (
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.angleHook.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.sourceHot.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const todoCount = topics.filter((t) => t.status === 'to_do').length;
  const inProgressCount = topics.filter((t) => t.status === 'in_progress').length;
  const doneCount = topics.filter((t) => t.status === 'done').length;
  const deferredCount = topics.filter((t) => t.status === 'deferred').length;
  const abandonedCount = topics.filter((t) => t.status === 'abandoned').length;
  const pendingCount = topics.filter((t) => t.status === 'pending').length;
  const acceptedCount = topics.filter((t) => t.status === 'accepted' || t.status === 'outline_ready').length;
  const generatedCount = topics.filter((t) => t.status === 'generated').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4" />
            <span>模块一：数据抓取与智能选题漏斗</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            TikHub 全网热点雷达 ➔ Gemini 3.8 Flash 爆款转化
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            系统接入 TikHub 聚合抓取全网实时飙升词与热榜，由 Gemini
            结合您的垂直定位，瞬间推导出具备高点击潜力的专属选题，您可自主筛选入选。
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddingCustom(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>自建原创选题</span>
          </button>
        </div>
      </div>

      {/* Grid: Left TikHub Radar / Right Screening Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: TikHub Radar (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            {/* Header & Platform Selector */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>TikHub 热点雷达</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    radarSource === 'live_tikhub'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {radarSource === 'live_tikhub' ? 'TikHub API 直连' : '热点雷达模拟源'}
                </span>
              </div>
              <button
                onClick={() => loadTrends(platform)}
                disabled={isLoadingTrends}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="刷新热榜"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTrends ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Platform Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/80 rounded-xl mb-4 border border-slate-800">
              <button
                onClick={() => setPlatform('douyin')}
                className={`py-1.5 text-xs font-medium rounded-lg transition ${
                  platform === 'douyin' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                抖音热搜
              </button>
              <button
                onClick={() => setPlatform('xiaohongshu')}
                className={`py-1.5 text-xs font-medium rounded-lg transition ${
                  platform === 'xiaohongshu' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                小红书
              </button>
              <button
                onClick={() => setPlatform('tiktok')}
                className={`py-1.5 text-xs font-medium rounded-lg transition ${
                  platform === 'tiktok' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                TikTok
              </button>
              <button
                onClick={() => setPlatform('weibo')}
                className={`py-1.5 text-xs font-medium rounded-lg transition ${
                  platform === 'weibo' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                微博热搜
              </button>
            </div>

            {/* Quick Actions for Selection */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
              <span>已勾选 {selectedTrends.length} 个热搜</span>
              <div className="space-x-2">
                <button
                  onClick={() => selectTopTrends(3)}
                  className="hover:text-indigo-400 transition"
                >
                  前3个
                </button>
                <span>·</span>
                <button
                  onClick={() => selectTopTrends(5)}
                  className="hover:text-indigo-400 transition"
                >
                  前5个
                </button>
                <span>·</span>
                <button
                  onClick={() => setSelectedTrends([])}
                  className="hover:text-red-400 transition"
                >
                  清空
                </button>
              </div>
            </div>

            {/* Trending Items List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {isLoadingTrends ? (
                <div className="py-12 text-center text-xs text-slate-500">正在抓取最新趋势数据...</div>
              ) : trends.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-slate-400 space-y-1.5">
                  <p className="font-semibold text-slate-300">
                    {radarSource === 'tikhub_unconfigured' ? 'TikHub API 未配置凭据' : '暂无热点数据'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {radarSource === 'tikhub_unconfigured'
                      ? '工作台不伪造虚假热搜。您可在设置中填写 Token，或直接在上方「新建自定义选题」进行创作。'
                      : '请切换平台或重新抓取趋势'}
                  </p>
                </div>
              ) : (
                trends.map((item, idx) => {
                  const isChecked = selectedTrends.includes(item.keyword);
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => toggleTrend(item.keyword)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-indigo-950/40 border-indigo-500/40'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-200 truncate">
                            {idx + 1}. {item.keyword}
                          </span>
                          <span className="text-[10px] font-mono font-medium text-amber-400/90 whitespace-nowrap bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {item.hotScore}
                          </span>
                        </div>
                        {item.desc && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Generate Button */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={handleMineTopics}
                disabled={isMiningTopics || selectedTrends.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isMiningTopics ? 'animate-spin' : ''}`} />
                <span>
                  {isMiningTopics
                    ? 'Gemini 3.8 Flash 正在思考爆款切入点...'
                    : `基于选中的 ${selectedTrends.length} 个热搜一键推导演生选题`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: User Screening & Funnel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col min-h-[560px]">
            {/* Header: Title & Funnel Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">我的选题漏斗库</h3>
                <span className="text-xs text-slate-400">共 {topics.length} 个</span>
              </div>

              {/* Status Switcher (PRD Case 27: to_do, in_progress, done, deferred, abandoned) */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterStatus === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  全部 ({topics.length})
                </button>
                <button
                  onClick={() => setFilterStatus('to_do')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                    filterStatus === 'to_do'
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>待做 (To-Do)</span>
                  <span className="text-[10px] bg-slate-800 px-1 rounded-full">{todoCount}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('in_progress')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                    filterStatus === 'in_progress'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>制作中</span>
                  <span className="text-[10px] bg-slate-800 px-1 rounded-full">{inProgressCount}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('done')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                    filterStatus === 'done'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>已完成稿件</span>
                  <span className="text-[10px] bg-slate-800 px-1 rounded-full">{doneCount}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                    filterStatus === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>待筛选</span>
                  <span className="text-[10px] bg-slate-800 px-1 rounded-full">{pendingCount}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('accepted')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                    filterStatus === 'accepted'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>已入选</span>
                  <span className="text-[10px] bg-slate-800 px-1 rounded-full">{acceptedCount}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-2">
              * 提示：选题「已完成 (done)」仅表示内容产出就绪，绝不自动计入公开发布 KPI。
            </p>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索选题标题、痛点或热搜词..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Topic Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[480px] pr-1">
              {filteredTopics.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl">
                  <Lightbulb className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">当前列表暂无选题</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    可在左侧勾选热搜后点击“推导选题”，或点击上方“自建原创选题”
                  </p>
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const isAccepted = topic.status === 'accepted' || topic.status === 'outline_ready';
                  const isGenerated = topic.status === 'generated';

                  return (
                    <div
                      key={topic.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                    >
                      {/* Card Top: Badges */}
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                            {topic.category || '自媒体'}
                          </span>
                          <span className="text-slate-500 truncate max-w-[200px]">
                            来源: {topic.sourceHot}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-amber-400 font-mono font-bold flex items-center space-x-0.5">
                            <Flame className="w-3 h-3" />
                            <span>爆款指数 {topic.estimatedViralScore}</span>
                          </span>
                          {isGenerated && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                              已成稿
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Title */}
                      <h4 className="text-sm font-bold text-white leading-snug tracking-tight">
                        {topic.title}
                      </h4>

                      {/* Card Hook & Target */}
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs space-y-1">
                        <div className="text-slate-300">
                          <span className="text-indigo-400 font-semibold">破题切入：</span>
                          {topic.angleHook}
                        </div>
                        {topic.targetAudience && (
                          <div className="text-slate-400 text-[11px]">
                            <span className="text-slate-500">痛点受众：</span>
                            {topic.targetAudience}
                          </div>
                        )}
                      </div>

                      {/* Actions & Status Changer (PRD Case 27) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center space-x-2">
                          <select
                            value={topic.status}
                            onChange={e => handleUpdateStatus(topic.id, e.target.value)}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-medium focus:outline-none"
                            title="修改选题状态（哪些做了/未做）"
                          >
                            <option value="to_do">待做 (To-Do)</option>
                            <option value="in_progress">制作中 (In Progress)</option>
                            <option value="done">已完成 (Done·未发布)</option>
                            <option value="accepted">已入选 (Accepted)</option>
                            <option value="pending">待筛选 (Pending)</option>
                            <option value="deferred">已搁置 (Deferred)</option>
                            <option value="abandoned">已放弃 (Abandoned)</option>
                          </select>

                          {topic.projectId && (
                            <button
                              onClick={() => onGoToIdeas(topic.id)}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 border border-indigo-900/60 px-2 py-1 rounded bg-indigo-950/40"
                              title="前往母项目工坊"
                            >
                              <span>母项目</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        {/* Move to next stage button */}
                        <button
                          onClick={() => onGoToIdeas(topic.id)}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1 shadow-sm transition"
                        >
                          <span>{topic.outlines ? '查看思路大纲' : '生成行文思路'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Topic Add Modal */}
      {isAddingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>录入自建原创选题</span>
            </h3>
            <form onSubmit={handleAddCustomTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  选题标题 / 灵感金句
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="例如：为什么大部分人做自媒体赚不到第一万块？"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  破题切入点 / 你的核心观点 (选填)
                </label>
                <textarea
                  rows={3}
                  value={customAngle}
                  onChange={(e) => setCustomAngle(e.target.value)}
                  placeholder="例如：戳破浮躁心态，指出核心问题是缺少商业闭环而非文笔..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  确认加入选题库
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
