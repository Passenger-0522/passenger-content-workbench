import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  FileText,
  Link,
  Plus,
  Sparkles,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import { ArticleSource, ArticleDeconstruction, Topic } from '../types';
import { api } from '../api';

interface SourceStudioProps {
  onGoToTopic?: (topicId: string) => void;
}

export const SourceStudio: React.FC<SourceStudioProps> = ({ onGoToTopic }) => {
  const [sources, setSources] = useState<ArticleSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add source modal state
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newMarkdown, setNewMarkdown] = useState('');

  // Deconstruction modal / state
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [deconAudience, setDeconAudience] = useState('');
  const [deconHook, setDeconHook] = useState('');
  const [deconStructure, setDeconStructure] = useState('');
  const [deconEvidence, setDeconEvidence] = useState('');
  const [deconActionable, setDeconActionable] = useState('');

  const loadSources = async () => {
    try {
      setIsLoading(true);
      const list = await api.getSources();
      setSources(list);
      if (list.length > 0 && !selectedSourceId) {
        setSelectedSourceId(list[0].id);
      }
    } catch (e: any) {
      console.error('Failed to load sources:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const currentSource = sources.find(s => s.id === selectedSourceId) || null;

  const handleCreateSource = async () => {
    if (!newUrl.trim() && !newMarkdown.trim()) {
      alert('请至少输入来源 URL 或文章 Markdown 内容');
      return;
    }
    try {
      const created = await api.createSource({
        url: newUrl.trim() || undefined,
        canonicalId: newUrl.trim() || undefined,
        author: newAuthor.trim() || '未知作者',
        rawMarkdown: newMarkdown,
        readabilityStatus: newMarkdown.trim() ? 'full' : 'link_only'
      });
      setSources([created, ...sources.filter(s => s.id !== created.id)]);
      setSelectedSourceId(created.id);
      setIsAddingSource(false);
      setNewUrl('');
      setNewAuthor('');
      setNewMarkdown('');
    } catch (e: any) {
      alert('保存来源失败: ' + e.message);
    }
  };

  const handleDeconstruct = async () => {
    if (!currentSource) return;
    if (!currentSource.rawMarkdown || currentSource.readabilityStatus === 'link_only') {
      alert('⚠️ 该文章当前仅为外链，未抓取到全文，无法生成拆解报告！请先填入或抓取正文 Markdown。');
      return;
    }
    if (!deconHook.trim() && !deconStructure.trim() && !deconEvidence.trim() && !deconActionable.trim()) {
      alert('请填写至少一项拆解分析（钩子、结构、论据或动作清单）');
      return;
    }

    try {
      const actionPoints = deconActionable
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await api.deconstructSource(currentSource.id, {
        audience: deconAudience.trim() || '',
        topicHook: deconHook.trim() || '',
        structure: deconStructure.trim() || '',
        evidence: deconEvidence.trim() || '',
        rhythm: '',
        visuals: '',
        ending: '',
        actionablePoints: actionPoints
      });

      alert('✅ 文章深度拆解报告已保存（严格引用原文，未填项留白）！');
      setIsDeconstructing(false);
      loadSources();
    } catch (e: any) {
      alert('拆解保存失败: ' + e.message);
    }
  };

  const handleExportHandoff = async () => {
    if (!currentSource) return;
    try {
      const res = await api.exportSourceHandoff(currentSource.id);
      alert(`📦 外部交接任务包已成功导出至：\n${res.taskDir}\n（任务ID: ${res.taskId}，包含原文 Markdown 与结构化拆解指令）`);
    } catch (e: any) {
      alert('导出外部拆解任务失败: ' + e.message);
    }
  };

  const handleConvertToTopic = async () => {
    if (!currentSource) return;
    try {
      const decon = currentSource.deconstructions?.[0];
      const topic = await api.convertSourceToTopic(currentSource.id, {
        title: `对标拆解转化：${currentSource.title || currentSource.author || currentSource.canonicalId}`,
        angleHook: decon?.topicHook || '',
        deconstructionId: decon?.id
      });
      alert(`🎉 成功从拆解报告生成新选题：${topic.title}！已移至「选题雷达」待做清单。`);
      if (onGoToTopic) onGoToTopic(topic.id);
    } catch (e: any) {
      alert('转化为选题失败: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-indigo-400" />
            <span>来源资料与爆款拆解工坊</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            原文不可变留档 · 证据与推论分离 · 动作清单提炼 · 拆解成果一键转选题
          </p>
        </div>
        <button
          onClick={() => setIsAddingSource(true)}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>收藏新文章 / 链接</span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Sources List */}
        <div className="col-span-4 bg-[#14161c] border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
            <span>收藏资料库 ({sources.length})</span>
            <button onClick={loadSources} className="hover:text-slate-200">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {sources.map(s => {
              const isSelected = s.id === selectedSourceId;
              const isLinkOnly = s.readabilityStatus === 'link_only';
              const deconCount = s.deconstructions?.length || 0;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSourceId(s.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/80 border-indigo-500/80 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-100 line-clamp-1">
                      {s.url || '未命名来源'}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ml-1.5 ${
                        isLinkOnly
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      }`}
                    >
                      {isLinkOnly ? '仅外链' : '全文已抓'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-400">
                    <span>作者: {s.author || '未知'}</span>
                    <span>·</span>
                    <span>拆解报告: {deconCount} 份</span>
                  </div>
                </div>
              );
            })}

            {sources.length === 0 && !isLoading && (
              <div className="p-8 text-center text-xs text-slate-500">
                暂无资料，点击右上角添加
              </div>
            )}
          </div>
        </div>

        {/* Right: Source Detail & Deconstruction */}
        <div className="col-span-8 space-y-4">
          {currentSource ? (
            <div className="space-y-4">
              {/* Source Header Card */}
              <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                      来源事实源档案 (Source Item)
                    </span>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span className="truncate max-w-md">{currentSource.url || '无URL'}</span>
                      {currentSource.url && (
                        <a href={currentSource.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-400">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExportHandoff}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
                      title="导出交接文件到本地目录供外部 Gemini 或本地大模型拆解，不消耗付费 API"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>导出交接任务</span>
                    </button>

                    <button
                      onClick={() => setIsDeconstructing(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-indigo-600/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>开展深度拆解</span>
                    </button>

                    {currentSource.deconstructions?.length > 0 && (
                      <button
                        onClick={handleConvertToTopic}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-emerald-600/20"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>转为新选题</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Markdown Content & Version History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <div className="flex items-center space-x-2">
                      <span>原文 Markdown 存盘</span>
                      {currentSource.versions && currentSource.versions.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 text-[10px] font-mono">
                          包含 {currentSource.versions.length} 个历史快照版本
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {currentSource.rawMarkdown ? `${currentSource.rawMarkdown.length} 字符` : '空'}
                      {currentSource.currentContentHash && ` · Hash: ${currentSource.currentContentHash}`}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans">
                    {currentSource.rawMarkdown || '（当前仅存外链，未抓取到全文）'}
                  </div>

                  {currentSource.versions && currentSource.versions.length > 1 && (
                    <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold block">不可变快照版本历史 (Immutable Version History):</span>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {currentSource.versions.map((ver, idx) => (
                          <div key={ver.versionId} className="flex items-center justify-between text-[10px] text-slate-400 font-mono bg-slate-950/60 px-2 py-1 rounded">
                            <span>v{currentSource.versions!.length - idx} · {ver.versionId} ({ver.contentHash})</span>
                            <span>{new Date(ver.capturedAt).toLocaleString()} · {ver.method}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Deconstruction Reports List */}
              <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    拆解分析报告 ({currentSource.deconstructions?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    提取前3秒钩子 · 结构框架 · 落地动作清单
                  </span>
                </div>

                <div className="space-y-3">
                  {currentSource.deconstructions?.map(decon => (
                    <div
                      key={decon.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-b border-slate-900 pb-1 mb-1">
                        <span>报告 ID: {decon.id}</span>
                        {decon.sourceVersionId && (
                          <span className="text-cyan-400/80">关联来源版本: {decon.sourceVersionId} ({decon.sourceContentHash?.slice(0, 8)})</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-indigo-400 font-mono">开头钩子 Hook:</span>
                          <p className="text-slate-200 font-medium">{decon.topicHook}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-400 font-mono">行文结构 Structure:</span>
                          <p className="text-slate-200">{decon.structure}</p>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1.5 border-t border-slate-900">
                        <span className="text-[10px] text-amber-400 font-mono">核心论据 Evidence:</span>
                        <p className="text-slate-300 leading-relaxed">{decon.evidence}</p>
                      </div>

                      {decon.actionablePoints?.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-slate-900">
                          <span className="text-[10px] text-cyan-400 font-mono">可借鉴落地动作:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                            {decon.actionablePoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}

                  {(!currentSource.deconstructions || currentSource.deconstructions.length === 0) && (
                    <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
                      尚未进行拆解，点击上方「开展深度拆解」按钮生成分析
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
              请从左侧选择一个来源，或点击右上角添加新文章
            </div>
          )}
        </div>
      </div>

      {/* Add Source Modal */}
      {isAddingSource && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Link className="w-4 h-4 text-indigo-400" />
              <span>收藏新文章 / 来源链接</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">文章公开 URL</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">博主 / 作者</label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={e => setNewAuthor(e.target.value)}
                  placeholder="例如：孙哥 / 出海大卖"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">文章全文 Markdown (可选)</label>
                <textarea
                  rows={6}
                  value={newMarkdown}
                  onChange={e => setNewMarkdown(e.target.value)}
                  placeholder="粘贴或填入可读正文 Markdown..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsAddingSource(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleCreateSource}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                保存到资料库
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deconstruct Modal */}
      {isDeconstructing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>录入深度拆解分析</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">开头钩子 Hook</label>
                <input
                  type="text"
                  value={deconHook}
                  onChange={e => setDeconHook(e.target.value)}
                  placeholder="例如：颠覆常识的认知痛点切入"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">行文结构 Structure</label>
                <input
                  type="text"
                  value={deconStructure}
                  onChange={e => setDeconStructure(e.target.value)}
                  placeholder="例如：场景痛点 → 底层逻辑 → 3步实操SOP"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">原文核心论据与证据</label>
                <textarea
                  rows={3}
                  value={deconEvidence}
                  onChange={e => setDeconEvidence(e.target.value)}
                  placeholder="引用原文具体段落或数据支撑..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">可借鉴落地动作 (一行一条)</label>
                <textarea
                  rows={3}
                  value={deconActionable}
                  onChange={e => setDeconActionable(e.target.value)}
                  placeholder="第一步：撰写独立站选品实操帖&#10;第二步：底部留问引导私信咨询"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsDeconstructing(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleDeconstruct}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                保存拆解报告
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
