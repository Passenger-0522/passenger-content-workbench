import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Copy,
  Check,
  Download,
  Video,
  FileText,
  Image as ImageIcon,
  Palette,
  ExternalLink,
  RefreshCw,
  Zap,
  Leaf,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Hash,
  Feather,
  Smartphone
} from 'lucide-react';
import { MatrixPack, PlatformMaterial, CoverDesign, CarouselCard, Post, PersonaProfile } from '../types';
import { api } from '../api';

interface MatrixStudioProps {
  posts: Post[];
  activePost?: Post | null;
  persona: PersonaProfile | null;
  initialPlatform?: 'wechatArticle' | 'wechatChannels' | 'douyin' | 'xiaohongshu' | 'twitter' | 'covers';
}

export const MatrixStudio: React.FC<MatrixStudioProps> = ({
  posts,
  activePost,
  persona,
  initialPlatform,
}) => {
  // Saved Matrix Packs
  const [matrixPacks, setMatrixPacks] = useState<MatrixPack[]>([]);
  const [currentPack, setCurrentPack] = useState<MatrixPack | null>(null);
  const [isLoadingPacks, setIsLoadingPacks] = useState(false);

  // Input states
  const [sourceTitle, setSourceTitle] = useState(activePost?.title || '');
  const [sourceContent, setSourceContent] = useState(activePost?.content || '');
  const [selectedPostId, setSelectedPostId] = useState<string>(activePost?.id || '');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active view tab in Matrix Studio
  // 'wechatArticle' | 'wechatChannels' | 'douyin' | 'xiaohongshu' | 'twitter' | 'covers'
  const [activePlatform, setActivePlatform] = useState<
    'wechatArticle' | 'wechatChannels' | 'douyin' | 'xiaohongshu' | 'twitter' | 'covers'
  >(initialPlatform || 'wechatArticle');

  // Sync initialPlatform
  useEffect(() => {
    if (initialPlatform) {
      setActivePlatform(initialPlatform);
    }
  }, [initialPlatform]);

  // Load packs list on mount
  useEffect(() => {
    loadPacks();
  }, []);

  // Sync if activePost prop changes
  useEffect(() => {
    if (activePost) {
      setSourceTitle(activePost.title);
      setSourceContent(activePost.content);
      setSelectedPostId(activePost.id);
    }
  }, [activePost]);

  const loadPacks = async () => {
    setIsLoadingPacks(true);
    try {
      const list = await api.getMatrixPacks();
      setMatrixPacks(list);
      if (list.length > 0 && !currentPack) {
        setCurrentPack(list[0]);
        setSourceTitle(list[0].sourceTitle);
        setSourceContent(list[0].sourceContent);
      }
    } catch (e) {
      console.error('Failed to load matrix packs:', e);
    } finally {
      setIsLoadingPacks(false);
    }
  };

  // Select an existing post as source
  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setSourceTitle(post.title);
      setSourceContent(post.content);
    }
  };

  // One-Click Generate Matrix Pack
  const handleGenerate = async () => {
    if (!sourceContent.trim()) {
      alert('请先填写或选择母本文案内容！');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await api.generateMatrixPack(sourceTitle || '未命名爆款', sourceContent, selectedPostId);
      if (res.pack) {
        setCurrentPack(res.pack);
        setMatrixPacks((prev) => [res.pack, ...prev.filter((p) => p.id !== res.pack.id)]);
      }
    } catch (err: any) {
      alert(err.message || '生成全矩阵物料失败，请检查 Gemini API 配置');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Copy entire platform content with title and tags
  const handleCopyPlatform = (platform: PlatformMaterial) => {
    let full = `【${platform.platformName}】${platform.title}\n\n`;
    full += `${platform.content}\n\n`;
    if (platform.secondaryContent) {
      full += `--- 附加内容 ---\n${platform.secondaryContent}\n\n`;
    }
    if (platform.tags?.length) {
      full += `标签：${platform.tags.map((t) => `#${t}`).join(' ')}\n\n`;
    }
    handleCopyText(full, `platform-${platform.platform}`);
  };

  // Save changes to current pack
  const handleSaveCurrentPack = async () => {
    if (!currentPack) return;
    try {
      await api.saveMatrixPack(currentPack.id, currentPack);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
      alert('保存修改失败');
    }
  };

  // Delete pack
  const handleDeletePack = async (id: string) => {
    if (!confirm('确定删除该矩阵物料包吗？')) return;
    try {
      await api.deleteMatrixPack(id);
      setMatrixPacks((prev) => prev.filter((p) => p.id !== id));
      if (currentPack?.id === id) {
        const remaining = matrixPacks.filter((p) => p.id !== id);
        setCurrentPack(remaining[0] || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update specific platform in state
  const updatePlatformData = (
    platformKey: 'wechatArticle' | 'wechatChannels' | 'douyin' | 'xiaohongshu' | 'twitter',
    field: string,
    value: any
  ) => {
    if (!currentPack) return;
    setCurrentPack({
      ...currentPack,
      platforms: {
        ...currentPack.platforms,
        [platformKey]: {
          ...currentPack.platforms[platformKey],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>一鱼多吃 · 全平台矩阵式内容分发工坊</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
              🍃 已嵌入 lieflat-less-ai-tone 语言学去味
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            一篇核心母本 ➔ 微信公众号 · 视频号 · 抖音 · 小红书 · 推特 全套物料一键生成
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            完美解决多平台逐个改写的疲惫：视频类全套封面（视频号2个封面、抖音1个、小红书1个）+ 标题口播脚本；图文类多图卡片拆解；推特纯文字单推与长 Thread。
          </p>
        </div>

        {/* Action Buttons */}
        {currentPack && (
          <div className="flex items-center space-x-2 self-start md:self-center">
            <a
              href={api.getMatrixExportUrl(currentPack.id)}
              download
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>导出全套 Markdown</span>
            </a>
            <button
              onClick={handleSaveCurrentPack}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>已保存修改</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>保存物料包</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Source Panel & Right Output Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Input & Post Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>输入母本内容</span>
              </h3>
              <span className="text-[10px] text-slate-400">作为各平台源素材</span>
            </div>

            {/* Quick Picker from existing Posts */}
            {posts.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  从已写完的文章中快速载入：
                </label>
                <select
                  value={selectedPostId}
                  onChange={(e) => handleSelectPost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 truncate"
                >
                  <option value="">-- 选择已有文案作为母本 --</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.wordCount}字)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">母本标题：</label>
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="例如：为什么很多天天用AI的人，反而最先被淘汰？"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">母本文案全文：</label>
              <textarea
                rows={11}
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                placeholder="粘贴你的文章正文、初稿或视频口播稿..."
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed whitespace-pre-wrap"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                <span>字数：{sourceContent.length}</span>
                <span className="text-emerald-400/90 font-mono">已接入去AI味守则</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !sourceContent.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>正在极速适配 5 大平台全套物料...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>一键生成全平台矩阵物料包 🚀</span>
                </>
              )}
            </button>
          </div>

          {/* Saved History Matrix Packs */}
          {matrixPacks.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>历史矩阵分发包 ({matrixPacks.length})</span>
                <button
                  onClick={loadPacks}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>刷新</span>
                </button>
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {matrixPacks.map((pack) => {
                  const isCurrent = currentPack?.id === pack.id;
                  return (
                    <div
                      key={pack.id}
                      onClick={() => {
                        setCurrentPack(pack);
                        setSourceTitle(pack.sourceTitle);
                        setSourceContent(pack.sourceContent);
                      }}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isCurrent
                          ? 'bg-indigo-950/40 border-indigo-500 text-white'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="font-medium truncate text-xs">{pack.sourceTitle || '未命名物料包'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{new Date(pack.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePack(pack.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-Platform Outputs (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {!currentPack ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Layers className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">全平台矩阵工坊就绪</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  在左侧选择一篇母本文案或粘贴文字，点击「一键生成全平台矩阵物料包」，系统将并发适配输出：
                </p>
              </div>

              {/* Platform Preview Feature Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-xl mx-auto pt-2 text-left">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <span className="text-emerald-400 font-bold block">🟢 微信公众号</span>
                  <span className="text-[11px] text-slate-400 block">长图文深度排版 · 2.35:1 头图封面 · 金句引用</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <span className="text-teal-400 font-bold block">🎥 微信视频号</span>
                  <span className="text-[11px] text-slate-400 block">短视频口播 · 2个封面（原本封面 + 转发卡片）</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <span className="text-rose-400 font-bold block">🔴 抖音</span>
                  <span className="text-[11px] text-slate-400 block">短视频分镜口播 · 9:16 竖版封面 · 4张图文轮播</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <span className="text-red-400 font-bold block">📕 小红书</span>
                  <span className="text-[11px] text-slate-400 block">3:4 专属封面 · 4-6张图文卡片拆解 · Emoji精排正文</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <span className="text-sky-400 font-bold block">🐦 推特 (X)</span>
                  <span className="text-[11px] text-slate-400 block">纯文字单条爆款推文 · 🧵 深度长 Thread 拆解</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <span className="text-amber-400 font-bold block">🎨 封面视觉工坊</span>
                  <span className="text-[11px] text-slate-400 block">一览所有封面比例、排版构图与 AI 生图 Prompt</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Platform Navigation Tabs */}
              <div className="flex items-center space-x-1.5 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800 overflow-x-auto">
                <button
                  onClick={() => setActivePlatform('wechatArticle')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activePlatform === 'wechatArticle'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span>🟢 微信公众号</span>
                </button>

                <button
                  onClick={() => setActivePlatform('wechatChannels')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activePlatform === 'wechatChannels'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>🎥 微信视频号 (双封面)</span>
                </button>

                <button
                  onClick={() => setActivePlatform('douyin')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activePlatform === 'douyin'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>🔴 抖音 (视频+图文)</span>
                </button>

                <button
                  onClick={() => setActivePlatform('xiaohongshu')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activePlatform === 'xiaohongshu'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>📕 小红书 (图文卡片)</span>
                </button>

                <button
                  onClick={() => setActivePlatform('twitter')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activePlatform === 'twitter'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Feather className="w-3.5 h-3.5" />
                  <span>🐦 推特 / X (纯文字)</span>
                </button>

                <button
                  onClick={() => setActivePlatform('covers')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activePlatform === 'covers'
                      ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-sm'
                      : 'text-amber-400/90 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-amber-300" />
                  <span>🎨 封面视觉工坊</span>
                </button>
              </div>

              {/* PLATFORM 1: WECHAT ARTICLE */}
              {activePlatform === 'wechatArticle' && currentPack.platforms.wechatArticle && (
                <PlatformArticleCard
                  data={currentPack.platforms.wechatArticle}
                  onUpdate={(field, val) => updatePlatformData('wechatArticle', field, val)}
                  onCopy={() => handleCopyPlatform(currentPack.platforms.wechatArticle)}
                  copiedKey={copiedKey}
                  onCopySnippet={handleCopyText}
                />
              )}

              {/* PLATFORM 2: WECHAT CHANNELS (2 Covers!) */}
              {activePlatform === 'wechatChannels' && currentPack.platforms.wechatChannels && (
                <PlatformChannelsCard
                  data={currentPack.platforms.wechatChannels}
                  onUpdate={(field, val) => updatePlatformData('wechatChannels', field, val)}
                  onCopy={() => handleCopyPlatform(currentPack.platforms.wechatChannels)}
                  copiedKey={copiedKey}
                  onCopySnippet={handleCopyText}
                />
              )}

              {/* PLATFORM 3: DOUYIN (1 Cover, Video + Image Cards) */}
              {activePlatform === 'douyin' && currentPack.platforms.douyin && (
                <PlatformDouyinCard
                  data={currentPack.platforms.douyin}
                  onUpdate={(field, val) => updatePlatformData('douyin', field, val)}
                  onCopy={() => handleCopyPlatform(currentPack.platforms.douyin)}
                  copiedKey={copiedKey}
                  onCopySnippet={handleCopyText}
                />
              )}

              {/* PLATFORM 4: XIAOHONGSHU (1 Cover, 4-6 Carousel Cards, Emoji Post) */}
              {activePlatform === 'xiaohongshu' && currentPack.platforms.xiaohongshu && (
                <PlatformXiaohongshuCard
                  data={currentPack.platforms.xiaohongshu}
                  onUpdate={(field, val) => updatePlatformData('xiaohongshu', field, val)}
                  onCopy={() => handleCopyPlatform(currentPack.platforms.xiaohongshu)}
                  copiedKey={copiedKey}
                  onCopySnippet={handleCopyText}
                />
              )}

              {/* PLATFORM 5: TWITTER / X (Pure Text + Long Thread) */}
              {activePlatform === 'twitter' && currentPack.platforms.twitter && (
                <PlatformTwitterCard
                  data={currentPack.platforms.twitter}
                  onUpdate={(field, val) => updatePlatformData('twitter', field, val)}
                  onCopy={() => handleCopyPlatform(currentPack.platforms.twitter)}
                  copiedKey={copiedKey}
                  onCopySnippet={handleCopyText}
                />
              )}

              {/* VIEW 6: COVERS SHOWCASE */}
              {activePlatform === 'covers' && (
                <AllCoversGallery
                  pack={currentPack}
                  onCopySnippet={handleCopyText}
                  copiedKey={copiedKey}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   SUBCOMPONENTS FOR EACH PLATFORM
   ========================================================================= */

// 1. 微信公众号组件
const PlatformArticleCard: React.FC<{
  data: PlatformMaterial;
  onUpdate: (field: string, val: any) => void;
  onCopy: () => void;
  copiedKey: string | null;
  onCopySnippet: (text: string, key: string) => void;
}> = ({ data, onUpdate, onCopy, copiedKey, onCopySnippet }) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-white">🟢 微信公众号 · 深度图文专栏</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              深度排版长文
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">适合建立行业权威度与私域沉淀，自带小标题导语排版与头图设计</p>
        </div>
        <button
          onClick={onCopy}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition self-start sm:self-auto shadow-sm"
        >
          {copiedKey === 'platform-wechatArticle' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>已复制公众号全文</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>一键复制排版长文</span>
            </>
          )}
        </button>
      </div>

      {/* Title & Candidate Titles */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">公众号主打文章标题：</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
        />
        {data.candidateTitles?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500">备选标题：</span>
            {data.candidateTitles.map((cand, i) => (
              <button
                key={i}
                onClick={() => onUpdate('title', cand)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-left"
              >
                {cand}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cover Showcase (2.35:1) */}
      {data.covers?.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>{data.covers[0].name}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">比例 {data.covers[0].ratio}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual Preview Simulation */}
            <div className="aspect-[2.35/1] rounded-lg bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/30 p-4 flex flex-col justify-between relative overflow-hidden shadow-inner">
              <div className="text-[10px] uppercase font-mono text-emerald-400/80">微信公众号 · 封面头图预览</div>
              <div>
                <h4 className="text-sm font-black text-white leading-tight drop-shadow-md">
                  {data.covers[0].headline}
                </h4>
                <p className="text-[11px] text-emerald-200/80 mt-1 line-clamp-1">{data.covers[0].subheadline}</p>
              </div>
            </div>

            {/* Prompt & Notes */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">AI 生图 Prompt (Midjourney / SD)：</span>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-start justify-between">
                  <span className="line-clamp-2">{data.covers[0].visualPrompt}</span>
                  <button
                    onClick={() => onCopySnippet(data.covers[0].visualPrompt, 'prompt-wechat')}
                    className="ml-2 text-indigo-400 hover:text-indigo-300 shrink-0"
                    title="复制Prompt"
                  >
                    {copiedKey === 'prompt-wechat' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">💡 排版建议：{data.covers[0].layoutNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Content */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300">正文排版长文：</label>
        <textarea
          rows={14}
          value={data.content}
          onChange={(e) => onUpdate('content', e.target.value)}
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans whitespace-pre-wrap"
        />
      </div>

      {/* Platform Tips */}
      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300/90 flex items-start space-x-2">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span><strong>公众号发布建议</strong>：{data.platformTips}</span>
      </div>
    </div>
  );
};

// 2. 微信视频号组件（重点：2个封面）
const PlatformChannelsCard: React.FC<{
  data: PlatformMaterial;
  onUpdate: (field: string, val: any) => void;
  onCopy: () => void;
  copiedKey: string | null;
  onCopySnippet: (text: string, key: string) => void;
}> = ({ data, onUpdate, onCopy, copiedKey, onCopySnippet }) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-white">🎥 微信视频号 · 短视频专栏</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
              包含 2 个封面方案
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            严格按照规范生成：<strong>①原本视频封面</strong> 与 <strong>②朋友圈转发卡片封面</strong>
          </p>
        </div>
        <button
          onClick={onCopy}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition self-start sm:self-auto shadow-sm"
        >
          {copiedKey === 'platform-wechatChannels' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>已复制视频号文案</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>一键复制视频号文案</span>
            </>
          )}
        </button>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">视频号标题（30字内情绪共鸣）：</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-teal-500"
        />
        {data.candidateTitles?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500">备选标题：</span>
            {data.candidateTitles.map((cand, i) => (
              <button
                key={i}
                onClick={() => onUpdate('title', cand)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-left"
              >
                {cand}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2 Covers Required by User */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-teal-400 flex items-center space-x-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>视频号双封面设计物料（原本封面 + 朋友圈转发封面）</span>
          </span>
          <span className="text-[10px] text-slate-400">专为微信社交裂变优化</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cover 1: 原本视频封面 (6:7 或 9:16) */}
          {data.covers?.[0] && (
            <div className="p-4 rounded-xl bg-slate-950 border border-teal-500/30 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1">
                  <span className="text-teal-400">①</span>
                  <span>{data.covers[0].name}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/20">
                  比例 {data.covers[0].ratio}
                </span>
              </div>

              {/* Preview Box */}
              <div className="aspect-[3/4] max-h-48 rounded-lg bg-gradient-to-b from-teal-950/80 via-slate-900 to-black border border-slate-800 p-4 flex flex-col justify-between text-center shadow-inner">
                <div className="text-[10px] text-teal-400/80 uppercase font-mono">视频播放原本主封面</div>
                <div>
                  <h4 className="text-base font-black text-white leading-snug drop-shadow-md">
                    {data.covers[0].headline}
                  </h4>
                  <p className="text-xs text-teal-300 font-semibold mt-1.5">{data.covers[0].subheadline}</p>
                </div>
                <div className="text-[9px] text-slate-500">（底部留白避开字幕）</div>
              </div>

              {/* Prompt */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>AI 生图 Prompt：</span>
                  <button
                    onClick={() => onCopySnippet(data.covers[0].visualPrompt, 'prompt-channels-1')}
                    className="text-teal-400 hover:text-teal-300 flex items-center space-x-1"
                  >
                    {copiedKey === 'prompt-channels-1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>复制Prompt</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono line-clamp-2">
                  {data.covers[0].visualPrompt}
                </div>
              </div>
            </div>
          )}

          {/* Cover 2: 朋友圈/社群转发卡片 (2.35:1) */}
          {data.covers?.[1] && (
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1">
                  <span className="text-indigo-400">②</span>
                  <span>{data.covers[1].name}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/20">
                  比例 {data.covers[1].ratio}
                </span>
              </div>

              {/* Preview Box */}
              <div className="aspect-[2.35/1] rounded-lg bg-gradient-to-r from-indigo-950 via-slate-900 to-black border border-slate-800 p-4 flex flex-col justify-between shadow-inner">
                <div className="text-[10px] text-indigo-400 uppercase font-mono">朋友圈/群聊天小卡片预览</div>
                <div>
                  <h4 className="text-sm font-black text-white leading-snug drop-shadow-md">
                    {data.covers[1].headline}
                  </h4>
                  <p className="text-[11px] text-indigo-200 mt-1">{data.covers[1].subheadline}</p>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>AI 生图 Prompt：</span>
                  <button
                    onClick={() => onCopySnippet(data.covers[1].visualPrompt, 'prompt-channels-2')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    {copiedKey === 'prompt-channels-2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>复制Prompt</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono line-clamp-2">
                  {data.covers[1].visualPrompt}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Script & Copy */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300">短视频口播脚本 / 视频简介文案：</label>
        <textarea
          rows={10}
          value={data.content}
          onChange={(e) => onUpdate('content', e.target.value)}
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500 leading-relaxed font-sans whitespace-pre-wrap"
        />
      </div>

      {/* Platform Tips */}
      <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/20 text-xs text-teal-300/90 flex items-start space-x-2">
        <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <span><strong>视频号运营诀窍</strong>：{data.platformTips}</span>
      </div>
    </div>
  );
};

// 3. 抖音组件（1个封面，视频口播 + 图文4张卡片）
const PlatformDouyinCard: React.FC<{
  data: PlatformMaterial;
  onUpdate: (field: string, val: any) => void;
  onCopy: () => void;
  copiedKey: string | null;
  onCopySnippet: (text: string, key: string) => void;
}> = ({ data, onUpdate, onCopy, copiedKey, onCopySnippet }) => {
  const [subTab, setSubTab] = useState<'video' | 'imageText'>('video');

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-white">🔴 抖音 · 视频与图文双栖</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
              1个竖版封面 (9:16)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">支持一键切换短视频快节奏口播文案，或抖音正火爆的 4 张图文轮播方案</p>
        </div>

        {/* Switch Video vs Image Mode */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setSubTab('video')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'video' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              短视频口播
            </button>
            <button
              onClick={() => setSubTab('imageText')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'imageText' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              图文轮播卡片
            </button>
          </div>

          <button
            onClick={onCopy}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            {copiedKey === 'platform-douyin' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>已复制抖音全文</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>一键复制抖音文案</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">抖音反差吸睛爆款标题：</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-rose-500"
        />
      </div>

      {/* 1 Cover (9:16) */}
      {data.covers?.[0] && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>{data.covers[0].name}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">比例 {data.covers[0].ratio}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual Box */}
            <div className="aspect-[9/16] max-h-56 mx-auto rounded-xl bg-gradient-to-b from-rose-950 via-slate-950 to-black border border-rose-500/40 p-4 flex flex-col justify-between text-center shadow-lg">
              <div className="text-[9px] uppercase font-mono text-rose-400/80">抖音竖版大字封面</div>
              <div>
                <h4 className="text-lg font-black text-amber-300 tracking-tight leading-tight drop-shadow-md">
                  {data.covers[0].headline}
                </h4>
                <p className="text-xs text-white font-bold mt-2 bg-rose-600/60 px-2 py-0.5 rounded-full inline-block">
                  {data.covers[0].subheadline}
                </p>
              </div>
              <div className="text-[9px] text-slate-500">高反差荧光大字</div>
            </div>

            <div className="space-y-2 text-xs flex flex-col justify-center">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">AI 生图 Prompt：</span>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-start justify-between">
                  <span className="line-clamp-3">{data.covers[0].visualPrompt}</span>
                  <button
                    onClick={() => onCopySnippet(data.covers[0].visualPrompt, 'prompt-douyin')}
                    className="ml-2 text-rose-400 hover:text-rose-300 shrink-0"
                    title="复制Prompt"
                  >
                    {copiedKey === 'prompt-douyin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">💡 排版建议：{data.covers[0].layoutNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Video Script or Image Cards */}
      {subTab === 'video' ? (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">短视频口播脚本（分镜/钩子）：</label>
          <textarea
            rows={10}
            value={data.content}
            onChange={(e) => onUpdate('content', e.target.value)}
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-rose-500 leading-relaxed font-sans whitespace-pre-wrap"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">抖音图文 4 张卡片大纲拆解：</label>
            <span className="text-[10px] text-slate-500">适合直接做成幻灯片发布</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.cards?.map((card, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-400">
                    Card {card.pageIndex}: {card.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">[{card.pageType}]</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 pl-3 list-disc">
                  {card.bulletPoints.map((bp, j) => (
                    <li key={j}>{bp}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {data.secondaryContent && (
            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-medium text-slate-400">图文配文描述：</label>
              <textarea
                rows={3}
                value={data.secondaryContent}
                onChange={(e) => onUpdate('secondaryContent', e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Platform Tips */}
      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300/90 flex items-start space-x-2">
        <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span><strong>抖音流量抓手</strong>：{data.platformTips}</span>
      </div>
    </div>
  );
};

// 4. 小红书组件（1个封面，图文轮播4-6页卡片拆解 + Emoji排版）
const PlatformXiaohongshuCard: React.FC<{
  data: PlatformMaterial;
  onUpdate: (field: string, val: any) => void;
  onCopy: () => void;
  copiedKey: string | null;
  onCopySnippet: (text: string, key: string) => void;
}> = ({ data, onUpdate, onCopy, copiedKey, onCopySnippet }) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-white">📕 小红书 · 视觉图文与视频</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
              1个高清封面 (3:4) + 轮播卡片
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">针对小红书搜索算法定制，自带多图卡片拆解与舒适呼吸感排版</p>
        </div>
        <button
          onClick={onCopy}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition self-start sm:self-auto shadow-sm"
        >
          {copiedKey === 'platform-xiaohongshu' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>已复制小红书全文</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>一键复制小红书笔记</span>
            </>
          )}
        </button>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">小红书爆款标题 (带Emoji)：</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-red-500"
        />
      </div>

      {/* 1 Cover (3:4) */}
      {data.covers?.[0] && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>{data.covers[0].name}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">比例 {data.covers[0].ratio}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual Preview */}
            <div className="aspect-[3/4] max-h-56 mx-auto rounded-xl bg-gradient-to-br from-red-950/80 via-slate-950 to-neutral-900 border border-red-500/30 p-4 flex flex-col justify-between text-center shadow-lg">
              <div className="text-[9px] uppercase font-mono text-red-300 flex items-center justify-center space-x-1">
                <span>✨ 小红书高点击封面 (3:4)</span>
              </div>
              <div className="py-2">
                <h4 className="text-sm sm:text-base font-black text-white leading-tight drop-shadow-md">
                  {data.covers[0].headline}
                </h4>
                <p className="text-xs text-amber-200 mt-1 font-semibold">{data.covers[0].subheadline}</p>
              </div>
              <div className="text-[9px] text-slate-400 bg-black/40 px-2 py-0.5 rounded-full inline-block mx-auto">
                贴纸风 · 高清大字
              </div>
            </div>

            <div className="space-y-2 text-xs flex flex-col justify-center">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">AI 生图 Prompt：</span>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-start justify-between">
                  <span className="line-clamp-3">{data.covers[0].visualPrompt}</span>
                  <button
                    onClick={() => onCopySnippet(data.covers[0].visualPrompt, 'prompt-xhs')}
                    className="ml-2 text-red-400 hover:text-red-300 shrink-0"
                    title="复制Prompt"
                  >
                    {copiedKey === 'prompt-xhs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">💡 设计建议：{data.covers[0].layoutNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* 4-6 Carousel Cards Breakdown */}
      {data.cards && data.cards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-red-400" />
              <span>多图轮播图文卡片清单 ({data.cards.length} 张)：</span>
            </span>
            <span className="text-[10px] text-slate-400">对应制作发布时的 1~{data.cards.length} 页图片</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.cards.map((card, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-red-300 text-[11px]">
                    Card {card.pageIndex}: {card.title}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">[{card.pageType}]</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 pl-3 list-disc">
                  {card.bulletPoints.map((bp, j) => (
                    <li key={j}>{bp}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Copy Content */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300">笔记全文 (Emoji 舒适呼吸感排版)：</label>
        <textarea
          rows={11}
          value={data.content}
          onChange={(e) => onUpdate('content', e.target.value)}
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-red-500 leading-relaxed font-sans whitespace-pre-wrap"
        />
      </div>

      {/* Platform Tips */}
      <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-red-300/90 flex items-start space-x-2">
        <Sparkles className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <span><strong>小红书运营核心</strong>：{data.platformTips}</span>
      </div>
    </div>
  );
};

// 5. 推特 / X 组件（纯文字，单推 + 长Thread）
const PlatformTwitterCard: React.FC<{
  data: PlatformMaterial;
  onUpdate: (field: string, val: any) => void;
  onCopy: () => void;
  copiedKey: string | null;
  onCopySnippet: (text: string, key: string) => void;
}> = ({ data, onUpdate, onCopy, copiedKey, onCopySnippet }) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-white">🐦 推特 / X · 纯文字深度矩阵</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              纯文字模式 · 零图片冗余
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">针对推特高信息密度生态，包含单条高点击推文与 🧵 长 Thread 串联</p>
        </div>
        <button
          onClick={onCopy}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition self-start sm:self-auto shadow-sm"
        >
          {copiedKey === 'platform-twitter' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>已复制推特内容</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>一键复制推特文案</span>
            </>
          )}
        </button>
      </div>

      {/* Main Single Tweet (< 280 chars) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300">① 极简爆款单推（&lt;280 字符，金句穿透力）：</label>
          <span className="text-[10px] text-slate-500 font-mono">{data.content.length} 字符</span>
        </div>
        <textarea
          rows={5}
          value={data.content}
          onChange={(e) => onUpdate('content', e.target.value)}
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-sans whitespace-pre-wrap"
        />
      </div>

      {/* Long Thread (1/n to n/n) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300">② 深度长 Thread 线程（🧵 多推串联拆解）：</label>
          <button
            onClick={() => onCopySnippet(data.secondaryContent || '', 'thread-copy')}
            className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center space-x-1"
          >
            {copiedKey === 'thread-copy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>单独复制整个 Thread</span>
          </button>
        </div>
        <textarea
          rows={11}
          value={data.secondaryContent || ''}
          onChange={(e) => onUpdate('secondaryContent', e.target.value)}
          placeholder="🧵 1/n 线程推文内容..."
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-sans whitespace-pre-wrap font-mono"
        />
      </div>

      {/* Tags */}
      {data.tags?.length > 0 && (
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Hashtag 标签：</span>
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 font-mono text-[11px]">
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Platform Tips */}
      <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-300/90 flex items-start space-x-2">
        <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <span><strong>推特发布策略</strong>：{data.platformTips}</span>
      </div>
    </div>
  );
};

// 6. 全平台封面视觉工坊汇总展示
const AllCoversGallery: React.FC<{
  pack: MatrixPack;
  onCopySnippet: (text: string, key: string) => void;
  copiedKey: string | null;
}> = ({ pack, onCopySnippet, copiedKey }) => {
  // Collect all covers from platforms
  const allCovers: Array<{ platformName: string; cover: CoverDesign }> = [];

  if (pack.platforms.wechatArticle?.covers) {
    pack.platforms.wechatArticle.covers.forEach((c) =>
      allCovers.push({ platformName: '🟢 微信公众号', cover: c })
    );
  }
  if (pack.platforms.wechatChannels?.covers) {
    pack.platforms.wechatChannels.covers.forEach((c) =>
      allCovers.push({ platformName: '🎥 微信视频号', cover: c })
    );
  }
  if (pack.platforms.douyin?.covers) {
    pack.platforms.douyin.covers.forEach((c) =>
      allCovers.push({ platformName: '🔴 抖音', cover: c })
    );
  }
  if (pack.platforms.xiaohongshu?.covers) {
    pack.platforms.xiaohongshu.covers.forEach((c) =>
      allCovers.push({ platformName: '📕 小红书', cover: c })
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 animate-fade-in">
      <div className="pb-3 border-b border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <span>全平台封面视觉工坊汇总 (共 {allCovers.length} 款定制封面)</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          包含抖音 1 款 (9:16)、视频号 2 款 (原本封面 + 朋友圈转发卡片)、小红书 1 款 (3:4)、公众号 1 款 (2.35:1)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCovers.map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200">{item.platformName} · {item.cover.name}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
                  {item.cover.ratio}
                </span>
              </div>

              {/* Cover Card Simulation */}
              <div className="rounded-lg bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/60 border border-slate-800 p-4 min-h-[110px] flex flex-col justify-between shadow-inner">
                <div className="text-[10px] text-slate-500 font-mono uppercase">{item.cover.name}</div>
                <div>
                  <h4 className="text-sm font-black text-white leading-tight drop-shadow-md">
                    {item.cover.headline}
                  </h4>
                  {item.cover.subheadline && (
                    <p className="text-[11px] text-amber-300 mt-1">{item.cover.subheadline}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>AI 生图 Prompt：</span>
                  <button
                    onClick={() => onCopySnippet(item.cover.visualPrompt, `cover-all-${index}`)}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    {copiedKey === `cover-all-${index}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>复制Prompt</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono line-clamp-2">
                  {item.cover.visualPrompt}
                </div>
              </div>
              <p className="text-[10px] text-slate-400">📐 排版注意：{item.cover.layoutNotes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
