import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  FileText,
  Quote,
  MessageSquare,
  Hash,
  Calendar,
  ArrowRight,
  TrendingUp,
  Flame,
  Sliders,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { TwitterTweetItem, ContentProject, PlatformVariant } from '../types';
import { api } from '../api';

export type TweetEmotionKey = 'wtf' | 'first_principle' | 'geek' | 'rapid';

export interface EmotionPreset {
  id: TweetEmotionKey;
  name: string;
  emoji: string;
  badge: string;
  desc: string;
  tag: string;
  colorClass: string;
  activeClass: string;
}

export const EMOTION_PRESETS: EmotionPreset[] = [
  {
    id: 'wtf',
    name: '卧槽体',
    emoji: '💥',
    badge: '暴躁震惊 / 情绪拉满',
    desc: '卧槽起手，冲击力极强，短句换行，零句号零破折号，大白话击碎认知',
    tag: '卧槽体',
    colorClass: 'text-rose-400 border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/50',
    activeClass: 'bg-rose-900/80 text-rose-200 border-rose-500 shadow-rose-900/40 shadow-sm'
  },
  {
    id: 'first_principle',
    name: '商业认知',
    emoji: '🧠',
    badge: '第一性原理 / 变现壁垒',
    desc: '结合咨询陪跑与业务本质，直切商业护城河，大白话大实话，零句号',
    tag: '第一性原理',
    colorClass: 'text-amber-400 border-amber-800/60 bg-amber-950/40 hover:bg-amber-900/50',
    activeClass: 'bg-amber-900/80 text-amber-200 border-amber-500 shadow-amber-900/40 shadow-sm'
  },
  {
    id: 'geek',
    name: '极客实操',
    emoji: '🛠️',
    badge: '工具流 / 案例复刻',
    desc: '硬核案例剖析，从伪代码到落地复现，干货满满，开发者必看，零句号',
    tag: '极客实操',
    colorClass: 'text-sky-400 border-sky-800/60 bg-sky-950/40 hover:bg-sky-900/50',
    activeClass: 'bg-sky-900/80 text-sky-200 border-sky-500 shadow-sky-900/40 shadow-sm'
  },
  {
    id: 'rapid',
    name: '短推快打',
    emoji: '⚡',
    badge: '百字曝光 / 高频速发',
    desc: '百字极致压缩，干脆利落，日更 15-20 篇随手刷屏必备，零句号',
    tag: '高频快打',
    colorClass: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40 hover:bg-emerald-900/50',
    activeClass: 'bg-emerald-900/80 text-emerald-200 border-emerald-500 shadow-emerald-900/40 shadow-sm'
  }
];

const CURATED_OPTIONS_REA: Record<TweetEmotionKey, { title: string; content: string; tags: string[] }> = {
  wtf: {
    title: '卧槽！GitHub上这个5万星项目把逆向门槛干碎了 (卧槽体)',
    content: `卧槽！GitHub 上这个 5 万星的开源项目把逆向门槛干碎了，居然直接给 AI Agent 装上了全栈反编译外挂！

它把 Hopper、Ghidra、IDA 以及 Electron 解包工具打包成了标准 MCP，你对着 Cursor 讲人话让它去把 Notion 剪切板底层逻辑扒出来，Agent 就会自己在本地跑反编译、查调用栈、理证据链，转头直接写出能跑的可用代码

以前看别人做只能干瞪眼，现在动动嘴皮子就能让 AI 像素级复现，客户端交互在 Agent 面前彻底成了明牌，独立开发真该狠狠抄作业！

代码地址：github.com/morluto/rea`,
    tags: ['卧槽体', 'AI工具', 'Cursor', '逆向工程', 'MCP']
  },
  first_principle: {
    title: '这可能是最近最值得警惕的开源项目 (商业认知)',
    content: `这可能是最近最值得所有人警惕的开源项目，GitHub 刚破 5 万星的 REA，把 AI 时代的代码护城河直接推平了

它做的事情极其纯粹，把反编译引擎和进程调试工具全做成 MCP 接进 Cursor，不管别人有没有开源代码，Agent 都能直接逆向客户端逻辑并重写出可用版本，官方甚至已经完整复刻了 Notion 的剪切板跨进程架构

纯代码实现的秘密在 AI 面前越来越透明，以后的真正壁垒就是吃透真实业务、搞定客户信任和咨询交付闭环，这套玩法太值得深思了

项目地址：github.com/morluto/rea`,
    tags: ['第一性原理', '商业认知', '咨询陪跑', '壁垒', '开源项目']
  },
  geek: {
    title: '抄竞品作业的方式彻底变天了 (极客实操)',
    content: `抄竞品作业的方式彻底变天了，GitHub 5 万星的 REA 专门干一件事，让 Cursor 和 Claude 去逆向分析没有源码的应用

不管是复杂的 Electron 客户端还是底层的二进制文件，它把 Hopper 和 Ghidra 逆向工具全接进了本地环境，你在聊天框里问它这个交互怎么实现的，它读完伪代码转头就帮你把业务代码写好了

官方演示里甚至直接逆出了 Notion 的 IPC 桥接协议，连古早游戏的算法都能一比一还原，所有客户端黑盒在 Agent 面前都成了明牌，想要研究竞品底层机制的强烈建议去跑跑看

项目地址：github.com/morluto/rea`,
    tags: ['极客实操', '开发者', 'Notion', '反编译', 'AI编程']
  },
  rapid: {
    title: '卧槽！以后客户端真没有技术秘密了 (短推快打)',
    content: `卧槽！以后客户端真没有技术秘密了，GitHub 5 万星的 REA 把 Hopper 和 Ghidra 反编译工具全打包成了 MCP！

现在只要在 Cursor 里敲一行提示词，Agent 就会自动去反编译竞品客户端，扒出底层实现细节并直接写出可用代码，代码本身的护城河彻底没了，抓紧建自己的商业飞轮和个人 IP 才是正事！

github.com/morluto/rea`,
    tags: ['高频快打', '个人IP', '商业护城河', 'AI时代']
  }
};

function transformTextWithEmotion(raw: string, emotion: TweetEmotionKey): string {
  if (!raw.trim()) {
    return CURATED_OPTIONS_REA[emotion].content;
  }
  
  if (raw.includes('morluto') || raw.includes('rea') || raw.includes('逆向') || raw.includes('反编译')) {
    return CURATED_OPTIONS_REA[emotion].content;
  }

  // 严格去AI化 (lieflat-less-ai-tone)：去句号换成逗号、去破折号、去提示腔、去翻案腔、去“不是...而是...”，保持自然连贯段落不碎行
  let cleaned = raw
    .replace(/[。]/g, '，')
    .replace(/，+/g, '，')
    .replace(/——+/g, ' ')
    .replace(/[-]{2,}/g, ' ')
    .replace(/说白了[，,]?\s*/g, '')
    .replace(/说穿了[，,]?\s*/g, '')
    .replace(/先说结论[，,：:]?\s*/g, '')
    .replace(/总而言之[，,]?\s*/g, '')
    .replace(/换句话说[，,]?\s*/g, '')
    .replace(/不得不说[，,]?\s*/g, '')
    .replace(/(从来|根本|绝非|并)?不是[^，,。！!？?]+[，,]\s*(而|却)是/g, '')
    .replace(/，\s*$/g, '')
    .trim();

  // 保留自然的原始大段落（2~3段），而不是按句随便断行
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map(p => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  if (emotion === 'wtf') {
    if (!paragraphs[0].startsWith('卧槽') && !paragraphs[0].startsWith('我操')) {
      paragraphs[0] = '卧槽！' + paragraphs[0];
    }
    return paragraphs.join('\n\n');
  }

  if (emotion === 'first_principle') {
    if (!paragraphs[0].includes('第一性原理') && !paragraphs[0].includes('本质')) {
      paragraphs[0] = '这背后的第一性原理很直接，' + paragraphs[0];
    }
    return paragraphs.join('\n\n');
  }

  if (emotion === 'geek') {
    if (!paragraphs[0].includes('实操') && !paragraphs[0].includes('底层')) {
      paragraphs[0] = '硬核实操拆解，' + paragraphs[0];
    }
    return paragraphs.join('\n\n');
  }

  if (emotion === 'rapid') {
    return paragraphs.join(' ').slice(0, 140);
  }

  return paragraphs.join('\n\n');
}

interface TwitterStudioProps {
  onRefreshKpi?: () => void;
  onGoToProjects?: () => void;
}

export const TwitterStudio: React.FC<TwitterStudioProps> = ({ onRefreshKpi, onGoToProjects }) => {
  const [tweets, setTweets] = useState<TwitterTweetItem[]>([]);
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Daily target setting (15-20 posts)
  const [dailyTarget, setDailyTarget] = useState<number>(18);

  // Drafter state
  const [draftContent, setDraftContent] = useState('');
  const [draftFormat, setDraftFormat] = useState<'short_post' | 'thread' | 'quote' | 'long_article'>('short_post');
  const [draftThreadPosts, setDraftThreadPosts] = useState<string[]>(['', '']);
  const [draftTags, setDraftTags] = useState<string[]>(['思考', 'AI']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [quoteUrl, setQuoteUrl] = useState('');
  const [plannedDate, setPlannedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  });
  const [editingTweetId, setEditingTweetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedSyncProjectId, setSelectedSyncProjectId] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'gemini_condense' | 'thread' | 'raw'>('gemini_condense');
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtering & Search
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'ready' | 'draft' | 'published' | 'native' | 'synced'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Expanded thread card IDs
  const [expandedThreadIds, setExpandedThreadIds] = useState<Record<string, boolean>>({});

  // Emotion / Style Options States
  const [activeEmotion, setActiveEmotion] = useState<TweetEmotionKey>('wtf');
  const [showOptionComparison, setShowOptionComparison] = useState(false);
  const [emotionSwitchedNotice, setEmotionSwitchedNotice] = useState<string | null>(null);

  const handleSwitchEmotion = (emotion: TweetEmotionKey) => {
    setActiveEmotion(emotion);
    const newContent = transformTextWithEmotion(draftContent, emotion);
    setDraftContent(newContent);
    const preset = EMOTION_PRESETS.find(p => p.id === emotion);
    if (preset) {
      const otherPresetTags = EMOTION_PRESETS.map(ep => ep.tag);
      setDraftTags([preset.tag, ...draftTags.filter(t => !otherPresetTags.includes(t))]);
      setEmotionSwitchedNotice(`已切换为【${preset.name}】（已自动去句号 · 零破折号）`);
      setTimeout(() => setEmotionSwitchedNotice(null), 3000);
    }
  };

  const handleApplyOptionFromModal = (emotion: TweetEmotionKey) => {
    handleSwitchEmotion(emotion);
    setShowOptionComparison(false);
  };

  const handleSwitchTweetCardEmotion = async (tweet: TwitterTweetItem, emotion: TweetEmotionKey) => {
    const preset = EMOTION_PRESETS.find(p => p.id === emotion);
    const newContent = transformTextWithEmotion(tweet.content, emotion);
    try {
      const otherPresetTags = EMOTION_PRESETS.map(ep => ep.tag);
      const newTags = preset ? [preset.tag, ...(tweet.tags?.filter(t => !otherPresetTags.includes(t)) || [])] : tweet.tags;
      await api.updateTwitterTweet(tweet.projectId, tweet.variantId, {
        content: newContent,
        notes: `已切换为【${preset?.name}】风格 (零句号 零破折号)`,
        tags: newTags
      });
      await loadData();
      setEmotionSwitchedNotice(`推文已更新为【${preset?.name}】风格并自动保存！`);
      setTimeout(() => setEmotionSwitchedNotice(null), 3000);
    } catch (err: any) {
      alert('切换情绪失败: ' + err.message);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tweetList, projectList] = await Promise.all([
        api.getTwitterTweets().catch(() => []),
        api.getProjects().catch(() => [])
      ]);
      setTweets(tweetList);
      setProjects(projectList);
      if (projectList.length > 0 && !selectedSyncProjectId) {
        setSelectedSyncProjectId(projectList[0].id);
      }
    } catch (e) {
      console.error('Failed to load Twitter Studio data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Today stats
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const todayTweets = tweets.filter(t => t.plannedPublishDate === todayStr || t.createdAt.startsWith(todayStr));
  const publishedToday = tweets.filter(t => t.status === 'published' && (t.publishedAt?.startsWith(todayStr) || t.updatedAt?.startsWith(todayStr)));
  const readyToday = todayTweets.filter(t => t.status === 'ready');
  const draftsToday = todayTweets.filter(t => t.status === 'draft');

  const progressPercent = Math.min(100, Math.round((publishedToday.length / dailyTarget) * 100));
  const remainingCount = Math.max(0, dailyTarget - publishedToday.length);

  // Filtered tweet list
  const filteredTweets = tweets.filter(t => {
    if (filterTab === 'today') return t.plannedPublishDate === todayStr || t.createdAt.startsWith(todayStr);
    if (filterTab === 'ready') return t.status === 'ready';
    if (filterTab === 'draft') return t.status === 'draft';
    if (filterTab === 'published') return t.status === 'published';
    if (filterTab === 'native') return !t.isSyncedFromProject;
    if (filterTab === 'synced') return t.isSyncedFromProject;
    return true;
  });

  // Handle Save / Create Tweet
  const handleSaveTweet = async (status: 'draft' | 'ready' | 'published' = 'draft') => {
    const finalContent = draftFormat === 'thread'
      ? draftThreadPosts.filter(p => p.trim()).join('\n\n')
      : draftContent.trim();

    if (!finalContent) {
      alert('请输入推特正文内容');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingTweetId) {
        // Edit existing
        const tweetToEdit = tweets.find(t => t.id === editingTweetId);
        if (tweetToEdit) {
          await api.updateTwitterTweet(tweetToEdit.projectId, tweetToEdit.variantId, {
            content: finalContent,
            format: draftFormat,
            threadPosts: draftFormat === 'thread' ? draftThreadPosts.filter(p => p.trim()) : undefined,
            tags: draftTags,
            status,
            plannedPublishDate: plannedDate
          });
        }
      } else {
        // Create new
        await api.createTwitterTweet({
          content: finalContent,
          format: draftFormat,
          threadPosts: draftFormat === 'thread' ? draftThreadPosts.filter(p => p.trim()) : undefined,
          tags: draftTags,
          status,
          plannedPublishDate: plannedDate,
          quoteUrl: draftFormat === 'quote' ? quoteUrl : undefined
        });
      }

      // Reset form
      setDraftContent('');
      setDraftThreadPosts(['', '']);
      setEditingTweetId(null);
      setQuoteUrl('');
      await loadData();
      if (onRefreshKpi) onRefreshKpi();
    } catch (e: any) {
      alert('保存失败: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit click
  const handleStartEdit = (t: TwitterTweetItem) => {
    setEditingTweetId(t.id);
    setDraftFormat(t.format);
    setDraftTags(t.tags || ['思考']);
    setPlannedDate(t.plannedPublishDate || todayStr);

    if (t.format === 'thread' && t.threadPosts && t.threadPosts.length > 0) {
      setDraftThreadPosts(t.threadPosts);
      setDraftContent('');
    } else {
      setDraftContent(t.content);
      setDraftThreadPosts(['', '']);
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTweetId(null);
    setDraftContent('');
    setDraftThreadPosts(['', '']);
    setDraftFormat('short_post');
  };

  // Handle Record Publish
  const handleTogglePublish = async (t: TwitterTweetItem) => {
    try {
      if (t.status === 'published') {
        // Revert to ready
        await api.updateTwitterTweet(t.projectId, t.variantId, { status: 'ready' });
      } else {
        // Confirm publish
        await api.recordTwitterPublish(t.projectId, t.variantId);
      }
      await loadData();
      if (onRefreshKpi) onRefreshKpi();
    } catch (e: any) {
      alert('更新发布状态失败: ' + e.message);
    }
  };

  // Handle Delete Tweet
  const handleDeleteTweet = async (tweet: TwitterTweetItem) => {
    const confirmMsg = tweet.status === 'published'
      ? `确认删除这篇已发布的推文吗？\n删除后将移出推特工作台，并扣减已发布统计。`
      : `确认删除这篇不想发布的推文吗？\n删除后不可恢复。`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setDeletingId(tweet.id);
      await api.deleteTwitterTweet(tweet.projectId, tweet.variantId);
      if (editingTweetId === tweet.id) {
        setEditingTweetId(null);
        setDraftContent('');
        setDraftThreadPosts(['', '']);
        setDraftFormat('short_post');
      }
      await loadData();
      if (onRefreshKpi) onRefreshKpi();
      setEmotionSwitchedNotice('🗑️ 推文已成功删除');
      setTimeout(() => setEmotionSwitchedNotice(null), 2500);
    } catch (err: any) {
      alert('删除推文失败: ' + (err?.message || '未知错误'));
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Sync from Project
  const handleSyncFromProject = async () => {
    if (!selectedSyncProjectId) return;
    try {
      setIsSyncing(true);
      await api.syncProjectToTwitter({
        projectId: selectedSyncProjectId,
        mode: syncMode,
        plannedPublishDate: todayStr
      });
      setIsSyncModalOpen(false);
      await loadData();
      if (onRefreshKpi) onRefreshKpi();
      alert('🎉 成功从项目母稿同步生成推特内容！');
    } catch (e: any) {
      alert('同步失败: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Copy tweet text
  const handleCopyText = (t: TwitterTweetItem) => {
    let copyText = t.content;
    if (t.format === 'thread' && t.threadPosts && t.threadPosts.length > 0) {
      copyText = t.threadPosts.join('\n\n---\n\n');
    }
    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Export today's tweet pack
  const handleExportTodayPack = () => {
    const listToExport = filteredTweets;
    const lines = [
      '---',
      `exportType: "twitter_daily_pack"`,
      `date: "${todayStr}"`,
      `totalTweets: ${listToExport.length}`,
      `dailyTarget: ${dailyTarget}`,
      `publishedCount: ${publishedToday.length}`,
      '---',
      '',
      `# 𝕏 推特每日发布包 (${todayStr})`,
      `> 目标: 每日 ${dailyTarget} 篇 · 当前就绪/已发总数: ${listToExport.length} 篇`,
      ''
    ];

    listToExport.forEach((t, idx) => {
      lines.push(`## [推文 ${idx + 1}] 形态: ${t.format} | 状态: ${t.status}`);
      lines.push(`- 关联母稿: ${t.projectTitle}`);
      lines.push(`- 标签: ${t.tags?.join(' ') || '#思考'}`);
      lines.push(`- 排期: ${t.plannedPublishDate || '今日'}`);
      lines.push('');
      if (t.format === 'thread' && t.threadPosts && t.threadPosts.length > 0) {
        lines.push('### Thread 串逐条内容:');
        t.threadPosts.forEach((tp, pIdx) => {
          lines.push(`${pIdx + 1}/${t.threadPosts!.length} ${tp}`);
          lines.push('');
        });
      } else {
        lines.push(t.content);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twitter-daily-pack-${todayStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Character counter helper
  const charCount = draftContent.length;
  const isOverLimit = draftFormat === 'short_post' && charCount > 280;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 select-none font-sans">
      {/* 1. Header & Daily Target Meter (15-20 posts/day) */}
      <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-slate-700 text-white flex items-center justify-center font-black text-xl shadow-md">
              𝕏
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">推特独立工作台 (X Studio)</h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60 text-[11px] font-mono font-semibold">
                  核心高频阵地
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                独立创作原生推文，高网感、低门槛；支持一键情绪风格切换与母稿素材导入
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
              title="点击从已有母稿素材一键导入并转为推特推文"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>从母稿素材一键导入</span>
            </button>

            <button
              onClick={handleExportTodayPack}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
              title="导出今日全部推文清单 Markdown"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>导出今日推文包</span>
            </button>
          </div>
        </div>

        {/* Target Progress Bar & Meter */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-slate-200">
                今日发布进度: <span className="text-emerald-400 font-mono text-sm">{publishedToday.length}</span> / {dailyTarget} 篇
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">
                待发就绪: <span className="text-amber-400 font-mono font-semibold">{readyToday.length}</span> 篇
              </span>
              <span className="text-slate-400">
                灵感草稿: <span className="text-slate-300 font-mono font-semibold">{draftsToday.length}</span> 篇
              </span>
            </div>

            {/* Target Selector (15-20) */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-[11px]">每日目标:</span>
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                {[15, 18, 20].map(num => (
                  <button
                    key={num}
                    onClick={() => setDailyTarget(num)}
                    className={`px-2 py-0.5 rounded transition ${
                      dailyTarget === num
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}篇
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              title={`已发布 ${publishedToday.length} 篇`}
            />
            <div
              className="bg-amber-500/80 h-full transition-all duration-300"
              style={{ width: `${Math.min(100 - progressPercent, (readyToday.length / dailyTarget) * 100)}%` }}
              title={`就绪待发 ${readyToday.length} 篇`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {remainingCount === 0 ? (
                <span className="text-emerald-400 font-semibold">🎉 今日推特目标已达成！继续保持高频创作！</span>
              ) : (
                <span>
                  🔥 距离今日目标还差 <span className="text-amber-400 font-bold font-mono">{remainingCount}</span> 篇达标（建议分早中晚批次发推）
                </span>
              )}
            </span>
            <span className="text-slate-500 font-mono">完成率 {progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Drafter / Creator (高频快速发推引擎) */}
      <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white">
              {editingTweetId ? '✏️ 编辑推文' : '⚡️ 极速发推 / 随手记'}
            </span>
            {editingTweetId && (
              <button
                onClick={handleCancelEdit}
                className="text-[10px] text-slate-500 hover:text-slate-300 underline"
              >
                取消编辑新建
              </button>
            )}
          </div>

          {/* Format Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDraftFormat('short_post')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                draftFormat === 'short_post'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              短推 (&lt;280字)
            </button>
            <button
              onClick={() => setDraftFormat('thread')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                draftFormat === 'thread'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🧵 推文串 (Thread)
            </button>
            <button
              onClick={() => setDraftFormat('quote')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                draftFormat === 'quote'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              观点引用 (Quote)
            </button>
            <button
              onClick={() => setDraftFormat('long_article')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                draftFormat === 'long_article'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              深度长推
            </button>
          </div>
        </div>

        {/* Quote URL Input if Quote format */}
        {draftFormat === 'quote' && (
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">引用的原推链接 / 外部观点来源:</label>
            <input
              type="text"
              value={quoteUrl}
              onChange={e => setQuoteUrl(e.target.value)}
              placeholder="https://x.com/username/status/... 或行业热点新闻链接"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        )}

        {/* Emotion / Tone Preset Toolbar (严格去AI化 · 零句号 · 零破折号) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">一键切换情绪风格:</span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">严格去AI化 · 零句号 · 零破折号</span>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionComparison(true)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 transition flex items-center space-x-1"
            >
              <Sliders className="w-3 h-3" />
              <span>📋 对比 4 种预设选项</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EMOTION_PRESETS.map(preset => {
              const isActive = activeEmotion === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSwitchEmotion(preset.id)}
                  className={`p-2.5 rounded-xl border text-left transition space-y-1 ${
                    isActive ? preset.activeClass : preset.colorClass
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center space-x-1">
                      <span>{preset.emoji}</span>
                      <span>{preset.name}</span>
                    </span>
                    {isActive && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className="text-[10px] opacity-80 truncate">{preset.badge}</p>
                </button>
              );
            })}
          </div>

          {emotionSwitchedNotice && (
            <div className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-800/40 flex items-center space-x-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{emotionSwitchedNotice}</span>
            </div>
          )}
        </div>

        {/* Text Input Section */}
        {draftFormat === 'thread' ? (
          /* Multi-post Thread Editor */
          <div className="space-y-3">
            {draftThreadPosts.map((postText, idx) => (
              <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-blue-400 font-mono">
                    {idx + 1}/{draftThreadPosts.length} 推
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-mono">{postText.length}/280 字</span>
                    {draftThreadPosts.length > 2 && (
                      <button
                        onClick={() => {
                          const updated = draftThreadPosts.filter((_, i) => i !== idx);
                          setDraftThreadPosts(updated);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title="删除本条"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={postText}
                  onChange={e => {
                    const updated = [...draftThreadPosts];
                    updated[idx] = e.target.value;
                    setDraftThreadPosts(updated);
                  }}
                  placeholder={idx === 0 ? "第 1 条：黄金开头钩子，点明核心命题..." : `第 ${idx + 1} 条：展开关键事实或逻辑...`}
                  rows={2}
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
              </div>
            ))}
            <button
              onClick={() => setDraftThreadPosts([...draftThreadPosts, ''])}
              className="w-full py-2 bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-800 rounded-xl text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center space-x-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>增加一条推文 (+1 Tweet)</span>
            </button>
          </div>
        ) : (
          /* Single Textarea */
          <div className="space-y-1.5">
            <textarea
              value={draftContent}
              onChange={e => setDraftContent(e.target.value)}
              placeholder={
                draftFormat === 'short_post'
                  ? "写下今天的一条短思考或金句观点（无需写标题，正文直接表达；字数控制在280字以内）..."
                  : draftFormat === 'quote'
                  ? "写下你对引用内容的犀利评价、反直觉洞察或第一性原理思考..."
                  : "写下深度长推正文..."
              }
              rows={4}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none font-sans leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>快捷键: ⌘ + Enter 快速保存为草稿</span>
              <span className={`font-mono font-medium ${isOverLimit ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                {charCount} / 280 字符 {isOverLimit && '(已超长)'}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Bar: Tags, Planned Date & Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          {/* Quick Tags */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400">标签:</span>
            <div className="flex flex-wrap gap-1.5">
              {['思考', 'AI', '超级个体', '出海', '认知', '实操'].map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (draftTags.includes(tag)) {
                      setDraftTags(draftTags.filter(t => t !== tag));
                    } else {
                      setDraftTags([...draftTags, tag]);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                    draftTags.includes(tag)
                      ? 'bg-blue-950 text-blue-300 border-blue-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Actions */}
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>排期:</span>
              <input
                type="date"
                value={plannedDate}
                onChange={e => setPlannedDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-xs focus:outline-none font-mono"
              />
            </div>

            {editingTweetId && (
              <button
                type="button"
                onClick={() => {
                  const t = tweets.find(item => item.id === editingTweetId);
                  if (t) handleDeleteTweet(t);
                }}
                disabled={isSubmitting || deletingId === editingTweetId}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-medium flex items-center space-x-1 transition disabled:opacity-50"
                title="删除当前编辑的推文"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除此篇</span>
              </button>
            )}

            <button
              onClick={() => handleSaveTweet('draft')}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition disabled:opacity-50"
            >
              存为草稿
            </button>

            <button
              onClick={() => handleSaveTweet('ready')}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition disabled:opacity-50"
            >
              标为待发就绪
            </button>

            <button
              onClick={() => handleSaveTweet('published')}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50 shadow-md shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>记录已发布 (计入KPI)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tweets Stream & Filter Tabs */}
      <div className="space-y-4">
        {/* Stream Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            {[
              { id: 'all', label: '全部推文', count: tweets.length },
              { id: 'today', label: '今日推特', count: todayTweets.length },
              { id: 'ready', label: '待发就绪', count: tweets.filter(t => t.status === 'ready').length },
              { id: 'draft', label: '草稿', count: tweets.filter(t => t.status === 'draft').length },
              { id: 'published', label: '已发布', count: tweets.filter(t => t.status === 'published').length },
              { id: 'native', label: '原生独立', count: tweets.filter(t => !t.isSyncedFromProject).length },
              { id: 'synced', label: '母稿同步', count: tweets.filter(t => t.isSyncedFromProject).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                  filterTab === tab.id
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500">
            共 {filteredTweets.length} 篇推文
          </div>
        </div>

        {/* Tweets List Cards */}
        <div className="space-y-3">
          {filteredTweets.map(tweet => {
            const isThread = tweet.format === 'thread';
            const isExpanded = expandedThreadIds[tweet.id] ?? false;

            return (
              <div
                key={tweet.id}
                className={`p-4 rounded-2xl border transition-all ${
                  tweet.status === 'published'
                    ? 'bg-slate-950/40 border-slate-800/60'
                    : tweet.status === 'ready'
                    ? 'bg-[#14161c] border-amber-900/40 shadow-sm'
                    : 'bg-[#14161c] border-slate-800 hover:border-slate-700 shadow-md'
                } space-y-3`}
              >
                {/* Tweet Header: Metadata badges & Actions */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {/* Format Badge */}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-950 text-blue-400 border border-blue-800/60">
                      {tweet.format === 'short_post' && '短推 (<280)'}
                      {tweet.format === 'thread' && `🧵 Thread (${tweet.threadPosts?.length || 2}条)`}
                      {tweet.format === 'quote' && '观点引用'}
                      {tweet.format === 'long_article' && '深度长推'}
                    </span>

                    {/* Source Origin Badge */}
                    {tweet.isSyncedFromProject ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-800/60 flex items-center space-x-1">
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>同步自母稿</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                        𝕏 原生独立
                      </span>
                    )}

                    {/* Status Badge */}
                    {tweet.status === 'published' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        ✅ 已发布
                      </span>
                    ) : tweet.status === 'ready' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800/60">
                        ⚡️ 待发就绪
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                        草稿
                      </span>
                    )}

                    {/* Planned Date */}
                    {tweet.plannedPublishDate && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        📅 {tweet.plannedPublishDate}
                      </span>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {/* Emotion Quick Switcher on Card */}
                    <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5" title="一键切换此推文的情绪风格并自动保存">
                      {EMOTION_PRESETS.map(ep => {
                        const isMatch = tweet.tags?.includes(ep.tag) || (ep.id === 'wtf' && (tweet.content.includes('卧槽') || tweet.content.includes('我操')));
                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => handleSwitchTweetCardEmotion(tweet, ep.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] transition flex items-center space-x-0.5 ${
                              isMatch
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                            title={`一键转换为【${ep.name}】(${ep.badge})`}
                          >
                            <span>{ep.emoji}</span>
                            <span className="hidden sm:inline">{ep.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Copy to clipboard */}
                    <button
                      onClick={() => handleCopyText(tweet)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] flex items-center space-x-1 border border-slate-800 transition"
                      title="复制正文到剪贴板，可直接粘贴到 X.com 发布"
                    >
                      {copiedId === tweet.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>复制推文</span>
                        </>
                      )}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleStartEdit(tweet)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] flex items-center space-x-1 border border-slate-800 transition"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400" />
                      <span>编辑</span>
                    </button>

                    {/* Publish toggle */}
                    <button
                      onClick={() => handleTogglePublish(tweet)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition ${
                        tweet.status === 'published'
                          ? 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
                          : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{tweet.status === 'published' ? '撤销已发布' : '记录已发布'}</span>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTweet(tweet)}
                      disabled={deletingId === tweet.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/70 text-slate-400 hover:text-rose-400 text-[11px] flex items-center space-x-1 border border-slate-800 hover:border-rose-800/60 transition disabled:opacity-50"
                      title="删除不想发布的推文"
                    >
                      <Trash2 className="w-3 h-3 text-slate-400 group-hover:text-rose-400" />
                      <span>{deletingId === tweet.id ? '删除中...' : '删除'}</span>
                    </button>
                  </div>
                </div>

                {/* Tweet Body Content */}
                <div className="space-y-2">
                  {isThread && tweet.threadPosts && tweet.threadPosts.length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                        <span className="text-blue-400 font-mono font-bold mr-1.5">1/{tweet.threadPosts.length}</span>
                        {tweet.threadPosts[0]}
                      </div>

                      {/* Expand / Collapse remaining thread posts */}
                      {isExpanded ? (
                        <div className="space-y-2 pl-3 border-l-2 border-blue-900/60 ml-2">
                          {tweet.threadPosts.slice(1).map((tp, pIdx) => (
                            <div key={pIdx} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                              <span className="text-blue-400 font-mono font-bold mr-1.5">{pIdx + 2}/{tweet.threadPosts!.length}</span>
                              {tp}
                            </div>
                          ))}
                          <button
                            onClick={() => setExpandedThreadIds({ ...expandedThreadIds, [tweet.id]: false })}
                            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                          >
                            <ChevronUp className="w-3 h-3" />
                            <span>收起 Thread 展开</span>
                          </button>
                        </div>
                      ) : (
                        tweet.threadPosts.length > 1 && (
                          <button
                            onClick={() => setExpandedThreadIds({ ...expandedThreadIds, [tweet.id]: true })}
                            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-mono"
                          >
                            <ChevronDown className="w-3 h-3" />
                            <span>展开全部 {tweet.threadPosts.length} 条 Thread 串</span>
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {tweet.content}
                    </div>
                  )}

                  {/* Tags & notes */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      {tweet.tags?.map(tag => (
                        <span key={tag} className="text-blue-400/80 font-mono">
                          #{tag}
                        </span>
                      ))}
                      {tweet.notes && (
                        <span className="text-slate-500 italic ml-2">({tweet.notes})</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono">
                      <span>字数: {tweet.content.length}</span>
                      <span>更新: {new Date(tweet.updatedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTweets.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500 bg-[#14161c] border border-dashed border-slate-800 rounded-2xl space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
              <div>暂无符合筛选条件的推文</div>
              <div className="text-[11px] text-slate-600">
                可使用上方快速发推框创作，或点击「从母稿素材一键导入」将已有项目一键提炼为推特内容
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Sync from Mother Draft Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-slate-800 rounded-2xl w-full max-w-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">从母稿素材一键导入并转为推特</h3>
              </div>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              选择已有素材项目，工作台将自动按照你选择的模式提炼或拆分为符合推特节奏的专属推文：
            </p>

            {/* Project Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">选择源项目:</label>
              <select
                value={selectedSyncProjectId || ''}
                onChange={e => setSelectedSyncProjectId(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.isLegacyDraft ? '[历史存稿] ' : '[项目] '} {p.title} ({p.masterDraft?.revisions?.[0]?.content?.length || 0} 字)
                  </option>
                ))}
              </select>
            </div>

            {/* Sync Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">同步提炼模式:</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSyncMode('gemini_condense')}
                  className={`p-3 rounded-xl border text-left transition space-y-1 ${
                    syncMode === 'gemini_condense'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gemini 网感提炼</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    去除客套引言与标题，压缩为280字高浓度短推，直击要害
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncMode('thread')}
                  className={`p-3 rounded-xl border text-left transition space-y-1 ${
                    syncMode === 'thread'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>智能拆分 Thread 串</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    按要点拆解为 3~7 条有序推文串（1/N, 2/N...），适合干货复盘
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncMode('raw')}
                  className={`p-3 rounded-xl border text-left transition space-y-1 ${
                    syncMode === 'raw'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>保留原文转长推</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    完整转入长推格式，不改变原始文字
                  </p>
                </button>
              </div>
            </div>

            {/* Selected Project Content Preview */}
            {selectedSyncProjectId && (
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block font-semibold">母稿正文预览:</span>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans">
                  {projects.find(p => p.id === selectedSyncProjectId)?.masterDraft?.revisions?.[0]?.content?.slice(0, 500) || '暂无内容'}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSyncFromProject}
                disabled={isSyncing}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '正在同步提炼...' : '确认同步到推特工作台'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Four Emotion Options Comparison Modal (严格去AI化 · 零句号 · 零破折号) */}
      {showOptionComparison && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">4 种推特情绪与风格选项对比</h3>
                  <p className="text-[11px] text-slate-400">严格去AI化 (lieflat-less-ai-tone) · 全文零句号 · 全文零破折号 · 大实话</p>
                </div>
              </div>
              <button
                onClick={() => setShowOptionComparison(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1 pr-1">
              {EMOTION_PRESETS.map(preset => {
                const previewContent = transformTextWithEmotion(draftContent, preset.id);
                return (
                  <div
                    key={preset.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{preset.emoji}</span>
                          <span className="font-bold text-white text-sm">{preset.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                            {preset.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{previewContent.length}字</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{preset.desc}</p>
                      <div className="p-3 bg-[#111215] border border-slate-800/80 rounded-xl text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-56 overflow-y-auto select-text">
                        {previewContent}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">#{preset.tag}</span>
                      <button
                        type="button"
                        onClick={() => handleApplyOptionFromModal(preset.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1 transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>选用此选项填入</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOptionComparison(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
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
