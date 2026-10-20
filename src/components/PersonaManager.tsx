import React, { useState } from 'react';
import {
  UserCheck,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Save,
  MessageSquareQuote,
  Flame,
  FileText,
  BadgeCheck,
  Code2,
  RefreshCw,
  Leaf
} from 'lucide-react';
import { PersonaProfile, HistoricalSample } from '../types';
import { api } from '../api';

interface PersonaManagerProps {
  persona: PersonaProfile | null;
  onRefreshPersona: () => void;
}

export const PersonaManager: React.FC<PersonaManagerProps> = ({
  persona,
  onRefreshPersona,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [toneStyle, setToneStyle] = useState(persona?.toneStyle || '');
  const [vocabularyTraits, setVocabularyTraits] = useState(persona?.vocabularyTraits?.join('、') || '');
  const [structureHabits, setStructureHabits] = useState(persona?.structureHabits?.join('\n') || '');
  const [punctuationEmojiHabits, setPunctuationEmojiHabits] = useState(persona?.punctuationEmojiHabits || '');
  const [openingStyle, setOpeningStyle] = useState(persona?.openingStyle || '');
  const [closingStyle, setClosingStyle] = useState(persona?.closingStyle || '');
  const [systemPromptTemplate, setSystemPromptTemplate] = useState(persona?.systemPromptTemplate || '');

  // Add sample modal state
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [sampleTitle, setSampleTitle] = useState('');
  const [sampleContent, setSampleContent] = useState('');
  const [sampleStats, setSampleStats] = useState('');

  // Keep synced if persona updates
  React.useEffect(() => {
    if (persona) {
      setToneStyle(persona.toneStyle);
      setVocabularyTraits(persona.vocabularyTraits?.join('、') || '');
      setStructureHabits(persona.structureHabits?.join('\n') || '');
      setPunctuationEmojiHabits(persona.punctuationEmojiHabits || '');
      setOpeningStyle(persona.openingStyle || '');
      setClosingStyle(persona.closingStyle || '');
      setSystemPromptTemplate(persona.systemPromptTemplate || '');
    }
  }, [persona]);

  // Extract persona via Gemini
  const handleExtractPersona = async () => {
    setIsExtracting(true);
    try {
      const res = await api.extractPersona();
      if (res.persona) {
        onRefreshPersona();
        alert('✨ Gemini 已成功完成口吻特征提炼！');
      }
    } catch (err: any) {
      alert(err.message || '提炼口吻画像失败，请检查 Gemini API 配置');
    } finally {
      setIsExtracting(false);
    }
  };

  // Add historical sample
  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleTitle.trim() || !sampleContent.trim()) return;
    try {
      await api.addHistoricalSample({
        title: sampleTitle,
        content: sampleContent,
        likesOrStats: sampleStats || '高赞爆款',
      });
      setSampleTitle('');
      setSampleContent('');
      setSampleStats('');
      setIsAddingSample(false);
      onRefreshPersona();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete sample
  const handleDeleteSample = async (id: string) => {
    try {
      await api.deleteHistoricalSample(id);
      onRefreshPersona();
    } catch (err) {
      console.error(err);
    }
  };

  // Save manual adjustments
  const handleSavePersona = async () => {
    setIsSaving(true);
    try {
      await api.updatePersona({
        toneStyle,
        vocabularyTraits: vocabularyTraits.split(/[、,，\s]+/).filter(Boolean),
        structureHabits: structureHabits.split('\n').filter(Boolean),
        punctuationEmojiHabits,
        openingStyle,
        closingStyle,
        systemPromptTemplate,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onRefreshPersona();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>模块三：历史口吻克隆与人设引擎</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            喂入你的历史爆款作品 ➔ 深度克隆你的行文DNA
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            杜绝千篇一律的 AI 假大空公文腔。系统基于 Few-shot 样本与语言学特征提取，让 Gemini 3.8 Flash 输出的每篇文案都具备您的真实语气、断句习惯与情绪浓度。
          </p>
        </div>

        <button
          onClick={handleExtractPersona}
          disabled={isExtracting}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition self-start md:self-center disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isExtracting ? 'animate-spin' : ''}`} />
          <span>{isExtracting ? 'Gemini 正在分析你的文字指纹...' : '一键从样本提炼口吻画像'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Historical Samples List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col min-h-[520px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">历史优秀爆款样本库</h3>
              </div>
              <button
                onClick={() => setIsAddingSample(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium flex items-center space-x-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>录入新样本</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              已录入 {persona?.historicalSamples?.length || 0} 篇样本作为 Few-Shot 提示词输入底料：
            </p>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
              {persona?.historicalSamples?.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  暂无样本，点击右上角录入您的历史爆款文案
                </div>
              ) : (
                persona?.historicalSamples?.map((sample) => (
                  <div
                    key={sample.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{sample.title}</h4>
                      <div className="flex items-center space-x-2">
                        {sample.likesOrStats && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono px-1.5 py-0.5 rounded">
                            {sample.likesOrStats}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteSample(sample.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans line-clamp-4 leading-relaxed whitespace-pre-wrap bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                      {sample.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Persona Profile Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">我的专属口吻特征画像</h3>
              </div>
              <button
                onClick={handleSavePersona}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>画像已更新</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>保存画像设置</span>
                  </>
                )}
              </button>
            </div>

            {/* Field: Tone Style */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                🗣️ 口吻基调与情感色彩
              </label>
              <input
                type="text"
                value={toneStyle}
                onChange={(e) => setToneStyle(e.target.value)}
                placeholder="例如：极度凝练、大白话直击本质、不讲废话、像老炮说实话"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Field: Vocabulary Traits */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                💬 标志性用词与口头禅（顿号或空格隔开）
              </label>
              <input
                type="text"
                value={vocabularyTraits}
                onChange={(e) => setVocabularyTraits(e.target.value)}
                placeholder="例如：本质上、闭环、信息差、手把手、少走弯路、别盲目盲从"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Field: Structure Habits */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                📐 段落呼吸感与排版节奏习惯（每行一条）
              </label>
              <textarea
                rows={3}
                value={structureHabits}
                onChange={(e) => setStructureHabits(e.target.value)}
                placeholder="例如：黄金前3秒短句抓眼球&#10;每段不超过2-3行，视觉留白极度舒适&#10;干货部分全部用序号①②③拆解"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  💡 标点与表情习惯
                </label>
                <input
                  type="text"
                  value={punctuationEmojiHabits}
                  onChange={(e) => setPunctuationEmojiHabits(e.target.value)}
                  placeholder="例如：常用 💡、🔥、⚡，少用感叹号"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  🏁 结尾 CTA 与互动风格
                </label>
                <input
                  type="text"
                  value={closingStyle}
                  onChange={(e) => setClosingStyle(e.target.value)}
                  placeholder="例如：一句精辟金句做底色，引导读者评论区交流"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Embedded Skill: lieflat-less-ai-tone */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-white">已深度嵌入技能：lieflat-less-ai-tone (躺平·去AI味)</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                        已激活
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      基于 283 万字实测语料统计，通过 11 项白名单规则精准清洗 AI 八股味
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {[
                  '1. 翻案腔消解',
                  '2. 顿号密排疏解',
                  '3. 句式同构打散',
                  '4. 破折号滥用抑制',
                  '5. 提示冒号/空转句清理',
                  '6. 序数词小标题去模版',
                  '7. 拟人喻体还原机制',
                  '8. 数据概括恢复动词',
                  '9. 禁用八股起手式',
                  '10. 5类定向翻译腔清洗',
                  '11. 段首零主语补回指'
                ].map((rule, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 font-mono"
                  >
                    {rule}
                  </span>
                ))}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>与个人口吻协同规则：</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  若当前工作台 <code className="text-indigo-300">persona/voice_profile.md</code> 存在个人独特写作偏好，<strong>以作者真实习惯为最高准则</strong>，绝不抹杀个人风格。同时严格恪守「信息守恒（零幻觉）」与「最小改动」底线。
                </p>
              </div>
            </div>

            {/* System Prompt Template */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>自动编译的专属 System Prompt 写作指令</span>
                </span>
                <span className="text-[10px] text-slate-500">每次调用 Gemini 时将强制注入</span>
              </label>
              <textarea
                rows={4}
                value={systemPromptTemplate}
                onChange={(e) => setSystemPromptTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Sample Modal */}
      {isAddingSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>录入历史高赞爆款文案样本</span>
            </h3>
            <form onSubmit={handleAddSample} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">样本标题</label>
                <input
                  type="text"
                  required
                  value={sampleTitle}
                  onChange={(e) => setSampleTitle(e.target.value)}
                  placeholder="例如：普通人如何用 AI 搭建自己的自动化赚钱流水线？"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  历史互动数据 / 标签 (选填)
                </label>
                <input
                  type="text"
                  value={sampleStats}
                  onChange={(e) => setSampleStats(e.target.value)}
                  placeholder="例如：2.3w点赞 / 5400收藏"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  文案全文 (请保留真实的段落与标点)
                </label>
                <textarea
                  rows={8}
                  required
                  value={sampleContent}
                  onChange={(e) => setSampleContent(e.target.value)}
                  placeholder="粘贴您之前发布的真实爆款文案..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSample(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  保存至样本库
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
