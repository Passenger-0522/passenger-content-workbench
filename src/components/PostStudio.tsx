import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  Trash2,
  Save,
  CheckCircle2,
  Flame,
  Zap,
  ListChecks,
  ChevronRight,
  Download,
  Share2,
  FileCheck,
  Leaf,
  Layers
} from 'lucide-react';
import { Topic, Post, PersonaProfile, KpiStats } from '../types';
import { api } from '../api';

interface PostStudioProps {
  topics: Topic[];
  activeTopicId: string | null;
  onRefreshTopics: () => void;
  onRefreshKpi: () => void;
  persona: PersonaProfile | null;
  kpiStats: any;
  onGoToMatrix?: (data: { title: string; content: string }) => void;
}

export const PostStudio: React.FC<PostStudioProps> = ({
  topics,
  activeTopicId,
  onRefreshTopics,
  onRefreshKpi,
  persona,
  kpiStats,
  onGoToMatrix,
}) => {
  // Mode switcher: 'studio' | 'batch'
  const [viewMode, setViewMode] = useState<'studio' | 'batch'>('studio');

  // Studio Mode State
  const acceptedTopics = topics.filter((t) => t.status !== 'rejected');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    activeTopicId || acceptedTopics[0]?.id || ''
  );
  const currentTopic = acceptedTopics.find((t) => t.id === selectedTopicId) || acceptedTopics[0] || null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isCleaningAiTone, setIsCleaningAiTone] = useState(false);
  const [aiToneSuccess, setAiToneSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active Post editing
  const [currentTitle, setCurrentTitle] = useState('');
  const [candidateTitles, setCandidateTitles] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // Batch Mode State
  const [selectedBatchTopicIds, setSelectedBatchTopicIds] = useState<string[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [autoCleanAiTone, setAutoCleanAiTone] = useState(true);

  // Sync topic when activeTopicId prop changes
  useEffect(() => {
    if (activeTopicId) {
      setSelectedTopicId(activeTopicId);
    }
  }, [activeTopicId]);

  // Load existing post if topic already generated
  useEffect(() => {
    const fetchExistingPost = async () => {
      if (!currentTopic) return;
      try {
        const posts = await api.getPosts();
        const post = posts.find((p) => p.topicId === currentTopic.id);
        if (post) {
          setActivePostId(post.id);
          setCurrentTitle(post.title);
          setCandidateTitles(post.candidateTitles || [post.title]);
          setContent(post.content);
          setTags(post.tags || []);
        } else {
          setActivePostId(null);
          setCurrentTitle(currentTopic.title);
          setCandidateTitles([currentTopic.title]);
          setContent('');
          setTags(['爆款认知', '干货复盘', '超级个体']);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchExistingPost();
  }, [currentTopic?.id]);

  // Generate single post
  const handleGenerateSingle = async () => {
    if (!currentTopic) return;
    setIsGenerating(true);
    try {
      const res = await api.generatePost(currentTopic.id);
      if (res.post) {
        setActivePostId(res.post.id);
        setCurrentTitle(res.post.title);
        setCandidateTitles(res.post.candidateTitles || [res.post.title]);
        setContent(res.post.content);
        setTags(res.post.tags || []);
        onRefreshTopics();
        onRefreshKpi();
      }
    } catch (err: any) {
      alert(err.message || '生成文案失败，请检查 Gemini API 配置');
    } finally {
      setIsGenerating(false);
    }
  };

  // Polish post
  const handlePolish = async (instruction: string) => {
    if (!content.trim()) return;
    setIsPolishing(true);
    try {
      const res = await api.polishPost(content, instruction);
      if (res.polished) {
        setContent(res.polished);
        if (activePostId) {
          await api.updatePost(activePostId, { content: res.polished });
        }
      }
    } catch (err: any) {
      alert(err.message || '润色失败');
    } finally {
      setIsPolishing(false);
    }
  };

  // Clean AI Tone using lieflat-less-ai-tone Skill
  const handleCleanAiTone = async () => {
    if (!content.trim()) return;
    setIsCleaningAiTone(true);
    try {
      const res = await api.cleanWithLessAiTone(content);
      if (res.polished) {
        setContent(res.polished);
        if (activePostId) {
          await api.updatePost(activePostId, { content: res.polished });
        }
        setAiToneSuccess(true);
        setTimeout(() => setAiToneSuccess(false), 3500);
      }
    } catch (err: any) {
      alert(err.message || '去 AI 味改写失败');
    } finally {
      setIsCleaningAiTone(false);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    const fullText = `${currentTitle}\n\n${content}\n\n${tags.map((t) => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save manual post edits
  const handleSavePost = async () => {
    if (!activePostId) {
      // Create new post record
      try {
        const created = await api.updatePost('new', {
          topicId: currentTopic?.id,
          title: currentTitle,
          candidateTitles,
          content,
          tags,
          status: 'completed',
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        onRefreshKpi();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    try {
      await api.updatePost(activePostId, {
        title: currentTitle,
        content,
        tags,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Batch toggle
  const toggleBatchTopic = (id: string) => {
    setSelectedBatchTopicIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllBatchTopics = () => {
    setSelectedBatchTopicIds(acceptedTopics.map((t) => t.id));
  };

  // Run batch pipeline
  const handleRunBatchPipeline = async () => {
    if (selectedBatchTopicIds.length === 0) {
      alert('请勾选至少一个选题！');
      return;
    }
    setIsBatchRunning(true);
    setBatchProgress({ current: 0, total: selectedBatchTopicIds.length });

    try {
      await api.batchGeneratePosts(selectedBatchTopicIds, autoCleanAiTone);
      onRefreshTopics();
      onRefreshKpi();
      alert(`🎉 恭喜！批量流水线已成功生产完成，今日 KPI 达成数已自动累计！`);
      setSelectedBatchTopicIds([]);
    } catch (err: any) {
      alert(err.message || '批量生产失败，请检查 Gemini API 配置');
    } finally {
      setIsBatchRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Mode Switcher */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <PenTool className="w-4 h-4" />
            <span>模块四：爆款文案生成与流水线</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            行文思路 + 个人口吻DNA ➔ 每日 20 篇高频工业化产出
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            提供两种生产方式：精细打磨单篇的【工坊模式】，以及一口气勾选批量全自动化生成的【极速流水线模式】。
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 self-start md:self-center">
          <button
            onClick={() => setViewMode('studio')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              viewMode === 'studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>单篇精修工坊</span>
          </button>
          <button
            onClick={() => setViewMode('batch')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              viewMode === 'batch'
                ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>极速批量流水线 (冲刺20篇)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: STUDIO MODE */}
      {viewMode === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Context: Selected Topic & Outline Outline Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">切换撰写选题</span>
                <span className="text-[11px] text-slate-500">{acceptedTopics.length} 篇备选</span>
              </div>

              {/* Topic Select Dropdown */}
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              >
                {acceptedTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.status === 'generated' ? '✅ ' : '⏳ '} {t.title}
                  </option>
                ))}
              </select>

              {currentTopic && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider block">
                      确认的行文大纲
                    </span>
                    <h4 className="font-bold text-slate-200 text-xs mt-1">
                      {currentTopic.selectedOutline?.name || '默认大纲'}
                    </h4>
                  </div>

                  <div className="space-y-1.5 text-slate-400">
                    <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                      <span className="text-indigo-400 font-semibold block text-[11px]">前3秒开篇 Hook：</span>
                      <p className="text-[11px] mt-0.5 line-clamp-3">
                        {currentTopic.selectedOutline?.hook || currentTopic.angleHook}
                      </p>
                    </div>

                    <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                      <span className="text-emerald-400 font-semibold block text-[11px]">核心论述要点：</span>
                      <ul className="text-[11px] space-y-1 mt-1 list-disc list-inside">
                        {currentTopic.selectedOutline?.points?.map((pt, i) => (
                          <li key={i} className="line-clamp-2">
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Persona Indicator */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>注入口吻：</span>
                    <span className="text-amber-400/90 font-medium truncate max-w-[150px]">
                      {persona?.toneStyle || '极度凝练犀利'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Trigger */}
              <button
                onClick={handleGenerateSingle}
                disabled={isGenerating || !currentTopic}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Gemini 3.8 Flash 正在模仿口吻撰写...' : '开始生成正文文案'}</span>
              </button>
            </div>
          </div>

          {/* Right Content Editor (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
              {/* Header Title & Candidate Titles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    备选爆款标题（点击直接选用）：
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    字数: {content.length} 字
                  </span>
                </div>

                {candidateTitles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {candidateTitles.map((title, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTitle(title)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition ${
                          currentTitle === title
                            ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  placeholder="标题..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Main Content Textarea */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-semibold text-slate-300">正文内容：</label>
                    {aiToneSuccess && (
                      <span className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-fade-in font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>已按 lieflat-less-ai-tone 11项规则净化完成（信息守恒）</span>
                      </span>
                    )}
                  </div>
                  {/* AI Quick Polish Pills & Skill */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                    {/* Embedded lieflat-less-ai-tone Skill Action */}
                    <button
                      onClick={handleCleanAiTone}
                      disabled={isCleaningAiTone || !content}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition flex items-center space-x-1.5 shadow-sm border disabled:opacity-40 ${
                        aiToneSuccess
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                          : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                      }`}
                      title="调用 lieflat-less-ai-tone Skill（基于 283 万字实测语料的 11 项白名单规则去味，严格守恒信息，不增不减）"
                    >
                      <Leaf className={`w-3 h-3 ${isCleaningAiTone ? 'animate-spin' : 'text-emerald-400'}`} />
                      <span>{isCleaningAiTone ? '正在去AI味净化...' : '🍃 躺平·去AI味'}</span>
                      <span className="text-[9px] bg-emerald-800/80 text-emerald-200 px-1 py-0.5 rounded font-mono">Skill</span>
                    </button>

                    <span className="text-[10px] text-slate-500 ml-1 mr-0.5 flex items-center space-x-0.5">
                      <Wand2 className="w-3 h-3 text-indigo-400" />
                    </span>
                    <button
                      onClick={() => handlePolish('把语气改得更辛辣直接，砍掉任何废话，增强反差感')}
                      disabled={isPolishing || !content}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap transition disabled:opacity-40"
                    >
                      ⚡ 更犀利点
                    </button>
                    <button
                      onClick={() => handlePolish('改写成小红书风格，段落极短，适当加入高频emoji和标签，视觉更吸引人')}
                      disabled={isPolishing || !content}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap transition disabled:opacity-40"
                    >
                      📕 小红书精排版
                    </button>
                    <button
                      onClick={() => handlePolish('在文末强化金句总结，并设计一个引发强烈评论欲望的高互动提问')}
                      disabled={isPolishing || !content}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap transition disabled:opacity-40"
                    >
                      💬 强化互动CTA
                    </button>
                  </div>
                </div>

                <textarea
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="文案正文将在此生成，您也可以随时直接编辑..."
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 font-sans focus:outline-none focus:border-indigo-500 leading-relaxed whitespace-pre-wrap selection:bg-indigo-600"
                />
              </div>

              {/* Tags Editor */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  推荐话题标签：
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={tags.join(' ')}
                    onChange={(e) => setTags(e.target.value.split(/\s+/).filter(Boolean))}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-400 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    disabled={!content}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-40"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">已复制全文</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>一键复制全文</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSavePost}
                    disabled={!content}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-40"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">已保存修改</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>保存修改</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {onGoToMatrix && (
                    <button
                      onClick={() => onGoToMatrix({ title: currentTitle, content })}
                      disabled={!content}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center space-x-1.5 transition disabled:opacity-40"
                      title="一键将本文案分发转化为公众号、视频号、抖音、小红书、推特全套物料"
                    >
                      <Layers className="w-4 h-4 text-purple-300" />
                      <span>全矩阵分发 (一鱼多吃) 🚀</span>
                    </button>
                  )}
                  <button
                    onClick={handleSavePost}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>定稿！计入今日 KPI 🎯</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: BATCH PIPELINE MODE (Daily 20 Posts Booster!) */}
      {viewMode === 'batch' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>极速流水线：一键批量产出今日 20 篇帖子</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  勾选待生成的选题列表，Gemini 将并发自动构思思路 + 注入您的历史口吻完成全文撰写，完成后自动累计至今日 KPI。
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllBatchTopics}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
                >
                  全选入选选题 ({acceptedTopics.length})
                </button>
                <button
                  onClick={() => setSelectedBatchTopicIds([])}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 transition"
                >
                  清空选择
                </button>
              </div>
            </div>

            {/* Batch Action Bar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-300">
                  已选择 <strong className="text-amber-400 text-sm">{selectedBatchTopicIds.length}</strong> 个选题
                </span>
                <span className="text-xs text-slate-500">|</span>
                <span className="text-xs text-slate-400">
                  今日当前进度: {kpiStats?.completedCount || 0} / {kpiStats?.target || 20} 篇
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">|</span>
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition select-none">
                  <input
                    type="checkbox"
                    checked={autoCleanAiTone}
                    onChange={(e) => setAutoCleanAiTone(e.target.checked)}
                    className="rounded border-emerald-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                  />
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-medium">自动应用 lieflat-less-ai-tone 去AI味 (283万字语料规则)</span>
                </label>
              </div>

              <button
                onClick={handleRunBatchPipeline}
                disabled={isBatchRunning || selectedBatchTopicIds.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition disabled:opacity-40"
              >
                <Zap className={`w-4 h-4 ${isBatchRunning ? 'animate-bounce' : ''}`} />
                <span>
                  {isBatchRunning
                    ? `正在批量生产中 (${batchProgress.current}/${batchProgress.total})...`
                    : `一键启动批量生产 (${selectedBatchTopicIds.length}篇)`}
                </span>
              </button>
            </div>

            {/* Topics Checkbox Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {acceptedTopics.map((topic) => {
                const isSelected = selectedBatchTopicIds.includes(topic.id);
                const isDone = topic.status === 'generated';

                return (
                  <div
                    key={topic.id}
                    onClick={() => toggleBatchTopic(topic.id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-indigo-400 font-semibold">{topic.category}</span>
                        {isDone && (
                          <span className="text-emerald-400 font-mono flex items-center space-x-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>已成稿</span>
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-200 line-clamp-2 leading-relaxed">
                        {topic.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        思路: {topic.selectedOutline?.hook || topic.angleHook}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
