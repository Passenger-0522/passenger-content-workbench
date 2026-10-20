import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  Check,
  Edit3,
  PenTool,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Topic, PersonaProfile } from '../types';
import { api } from '../api';

interface IdeaStudioProps {
  topics: Topic[];
  activeTopicId: string | null;
  setActiveTopicId: (id: string) => void;
  onRefreshTopics: () => void;
  onGoToStudioWithTopic: (topicId: string) => void;
  persona: PersonaProfile | null;
}

export const IdeaStudio: React.FC<IdeaStudioProps> = ({
  topics,
  activeTopicId,
  setActiveTopicId,
  onRefreshTopics,
  onGoToStudioWithTopic,
  persona,
}) => {
  // Only topics that are accepted or generated or need outline
  const candidateTopics = topics.filter((t) => t.status !== 'rejected');
  const activeTopic = candidateTopics.find((t) => t.id === activeTopicId) || candidateTopics[0] || null;

  const [isGeneratingOutlines, setIsGeneratingOutlines] = useState(false);
  const [selectedAngleId, setSelectedAngleId] = useState<string>('angle-1');

  // Editable outline state
  const [hookText, setHookText] = useState('');
  const [points, setPoints] = useState<string[]>([]);
  const [ctaText, setCtaText] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Sync state when activeTopic or selected angle changes
  useEffect(() => {
    if (activeTopic) {
      if (!activeTopicId) {
        setActiveTopicId(activeTopic.id);
      }

      if (activeTopic.selectedOutline) {
        setSelectedAngleId(activeTopic.selectedOutline.id);
        setHookText(activeTopic.selectedOutline.hook);
        setPoints(activeTopic.selectedOutline.points || []);
        setCtaText(activeTopic.selectedOutline.cta || '');
        setCustomNotes(activeTopic.selectedOutline.customNotes || '');
      } else if (activeTopic.outlines && activeTopic.outlines.length > 0) {
        const first = activeTopic.outlines[0];
        setSelectedAngleId(first.id);
        setHookText(first.hook);
        setPoints(first.points || []);
        setCtaText(first.cta || '');
        setCustomNotes('');
      } else {
        // Reset if no outlines yet
        setHookText('');
        setPoints([]);
        setCtaText('');
        setCustomNotes('');
      }
    }
  }, [activeTopic?.id]);

  // Handle switching angle cards
  const handleSelectAngleTemplate = (angle: any) => {
    setSelectedAngleId(angle.id);
    setHookText(angle.hook);
    setPoints([...angle.points]);
    setCtaText(angle.cta);
  };

  // Generate outlines via Gemini
  const handleGenerateOutlines = async () => {
    if (!activeTopic) return;
    setIsGeneratingOutlines(true);
    try {
      const res = await api.generateOutlines(activeTopic.id);
      if (res.outlines && res.outlines.length > 0) {
        const first = res.outlines[0];
        setSelectedAngleId(first.id);
        setHookText(first.hook);
        setPoints(first.points);
        setCtaText(first.cta);
      }
      onRefreshTopics();
    } catch (err: any) {
      alert(err.message || '生成思路失败，请检查 Gemini API 配置');
    } finally {
      setIsGeneratingOutlines(false);
    }
  };

  // Point editing helpers
  const handlePointChange = (idx: number, val: string) => {
    const updated = [...points];
    updated[idx] = val;
    setPoints(updated);
  };

  const handleAddPoint = () => {
    setPoints([...points, '新要点：阐述你的支撑论据或案例']);
  };

  const handleDeletePoint = (idx: number) => {
    setPoints(points.filter((_, i) => i !== idx));
  };

  // Save outline
  const handleSaveOutline = async () => {
    if (!activeTopic) return;
    const currentName =
      activeTopic.outlines?.find((o) => o.id === selectedAngleId)?.name || '自定义思路方案';

    const outlineData = {
      id: selectedAngleId,
      name: currentName,
      hook: hookText,
      points,
      cta: ctaText,
      customNotes,
    };

    try {
      await api.updateTopic(activeTopic.id, {
        selectedOutline: outlineData,
        status: activeTopic.status === 'pending' ? 'accepted' : activeTopic.status,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      onRefreshTopics();
    } catch (err) {
      console.error(err);
    }
  };

  const handleProceedToWrite = async () => {
    await handleSaveOutline();
    if (activeTopic) {
      onGoToStudioWithTopic(activeTopic.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Lightbulb className="w-4 h-4" />
            <span>模块二：行文思路共创工坊</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            AI 提供破题思路 ➔ 我来把控方向与独家观点
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            好的内容灵魂在思路。AI 提供 3 种维度的破题大纲，您可自由调整论点、补充您的实战案例，确认后将严格按您的行文思路与历史口吻生成。
          </p>
        </div>
      </div>

      {/* Main Studio Layout: Left Topic Selector / Right Outline Co-Creation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Topic Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>待定思路选题池</span>
              </span>
              <span className="text-[11px] text-slate-500">{candidateTopics.length} 个选题</span>
            </div>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {candidateTopics.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  暂无入选选题，请先在“热点与选题”中勾选入选
                </div>
              ) : (
                candidateTopics.map((topic) => {
                  const isCurrent = topic.id === activeTopic?.id;
                  const hasOutline = !!topic.selectedOutline || (topic.outlines && topic.outlines.length > 0);

                  return (
                    <div
                      key={topic.id}
                      onClick={() => setActiveTopicId(topic.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        isCurrent
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-indigo-400 font-medium">{topic.category}</span>
                        {hasOutline && (
                          <span className="text-emerald-400 flex items-center space-x-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>已有思路</span>
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-200 line-clamp-2 leading-relaxed">
                        {topic.title}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Outline Co-Creation Editor (8 cols) */}
        <div className="lg:col-span-8">
          {!activeTopic ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-400 text-xs">请在左侧选择一个选题开始思路共创</p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
              {/* Selected Topic Title Banner */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-indigo-400 font-semibold">当前研讨选题</div>
                  <h3 className="text-base font-bold text-white leading-snug">{activeTopic.title}</h3>
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-500">切入角度：</span>
                    {activeTopic.angleHook}
                  </div>
                </div>
                <button
                  onClick={handleGenerateOutlines}
                  disabled={isGeneratingOutlines}
                  className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition self-start md:self-center whitespace-nowrap disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingOutlines ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingOutlines ? 'Gemini 构思中...' : '重新生成3套思路'}</span>
                </button>
              </div>

              {/* 3 AI Outline Angle Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>选择基础破题策略模板（或在下方自由深度定制）：</span>
                </label>

                {activeTopic.outlines && activeTopic.outlines.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {activeTopic.outlines.map((outline) => {
                      const isSelected = selectedAngleId === outline.id;
                      return (
                        <div
                          key={outline.id}
                          onClick={() => handleSelectAngleTemplate(outline)}
                          className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-200">{outline.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed mb-2">
                              {outline.hook}
                            </p>
                          </div>
                          <div className="text-[10px] text-indigo-400 font-mono">
                            {outline.points?.length || 3} 个核心要点拆解
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center py-6">
                    <p className="text-xs text-slate-400 mb-3">该选题尚未生成 AI 思路大纲</p>
                    <button
                      onClick={handleGenerateOutlines}
                      disabled={isGeneratingOutlines}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>立即让 Gemini 3.8 Flash 生成 3 种思路大纲</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Fine-Tuning Outline Section */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>我的定制化行文思路细节</span>
                </h4>

                {/* Hook Editor */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    🎯 黄金开篇 Hook (抓人眼球前3秒，直击痛点或反常识)
                  </label>
                  <textarea
                    rows={2}
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                    placeholder="例如：很多人问我普通人做自媒体怎么起步，说句大实话，你根本没看透底层逻辑..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Points Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      📋 核心论述要点与支撑论据 ({points.length} 点)
                    </label>
                    <button
                      onClick={handleAddPoint}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>增加一个论点</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {points.map((pt, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="w-5 text-center text-xs font-mono font-bold text-indigo-400">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={pt}
                          onChange={(e) => handlePointChange(idx, e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleDeletePoint(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Editor */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ⚡ 结尾转化与互动号召 CTA (金句收尾、评论区互动或引流)
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="例如：把时间花在能产生复利的事情上。你怎么看？评论区聊聊。"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Custom Notes / User's secret sauce */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    💎 我的独家见解 / 必须加入的个人案例与金句 (选填)
                  </label>
                  <textarea
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="例如：一定要提到我上周跟客户聊的那个案例、加入'别在情绪上内耗'这句口头禅..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={handleSaveOutline}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5"
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">已保存思路</span>
                      </>
                    ) : (
                      <span>暂存此思路</span>
                    )}
                  </button>

                  <button
                    onClick={handleProceedToWrite}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center space-x-1.5 transition"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>确认思路，立即按我的口吻写稿 ➔</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
