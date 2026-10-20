import React from 'react';
import { Sparkles, Flame, Lightbulb, PenTool, UserCheck, Target, Settings as SettingsIcon, Layers } from 'lucide-react';
import { KpiStats, Settings } from '../types';

interface NavbarProps {
  activeTab: 'radar' | 'ideas' | 'studio' | 'matrix' | 'persona' | 'kpi';
  setActiveTab: (tab: 'radar' | 'ideas' | 'studio' | 'matrix' | 'persona' | 'kpi') => void;
  kpiStats: KpiStats | null;
  settings: Settings | null;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  kpiStats,
  settings,
  onOpenSettings,
}) => {
  const target = kpiStats?.target || 20;
  const completed = kpiStats?.completedCount || 0;
  const rate = Math.min(100, Math.round((completed / target) * 100));

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">个人内容工作台</h1>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {settings?.geminiModel || 'Gemini 3.8 Flash'}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">TikHub 热点聚合 · 个人口吻克隆 · 日更 20 篇流水线</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'radar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>热点与选题</span>
          </button>

          <button
            onClick={() => setActiveTab('ideas')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'ideas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>思路共创</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>创作流水线</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-sm font-semibold'
                : 'text-purple-300/80 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>全矩阵分发</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-200 font-mono">矩阵</span>
          </button>

          <button
            onClick={() => setActiveTab('persona')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'persona'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>口吻与人设</span>
          </button>

          <button
            onClick={() => setActiveTab('kpi')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'kpi'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>KPI复盘</span>
          </button>
        </nav>

        {/* Right Actions: KPI Pill & Settings */}
        <div className="flex items-center space-x-3">
          {/* Daily KPI Badge */}
          <button
            onClick={() => setActiveTab('kpi')}
            title="查看今日KPI完成进度"
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
          >
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">今日 KPI</div>
              <div className="text-xs font-bold text-white flex items-center space-x-1">
                <span className={completed >= target ? 'text-emerald-400' : 'text-indigo-400'}>{completed}</span>
                <span className="text-slate-500">/</span>
                <span>{target}篇</span>
              </div>
            </div>
            {/* Progress Mini Radial / Bar */}
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center relative">
              <svg className="w-7 h-7 transform -rotate-90">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" className="text-slate-700" fill="transparent" />
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={completed >= target ? 'text-emerald-400 transition-all duration-500' : 'text-indigo-500 transition-all duration-500'}
                  fill="transparent"
                  strokeDasharray={69.1}
                  strokeDashoffset={69.1 - (69.1 * rate) / 100}
                />
              </svg>
              <span className="absolute text-[9px] font-bold text-slate-200">{rate}%</span>
            </div>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition"
            title="系统配置 (Gemini Key, TikHub Key, 赛道定位)"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Tab bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900/90 py-2">
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex flex-col items-center text-[10px] ${activeTab === 'radar' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          <Flame className="w-4 h-4 mb-0.5" />
          <span>选题</span>
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex flex-col items-center text-[10px] ${activeTab === 'ideas' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          <Lightbulb className="w-4 h-4 mb-0.5" />
          <span>思路</span>
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          className={`flex flex-col items-center text-[10px] ${activeTab === 'studio' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          <PenTool className="w-4 h-4 mb-0.5" />
          <span>写稿</span>
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex flex-col items-center text-[10px] ${activeTab === 'matrix' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>矩阵</span>
        </button>
        <button
          onClick={() => setActiveTab('persona')}
          className={`flex flex-col items-center text-[10px] ${activeTab === 'persona' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span>人设</span>
        </button>
        <button
          onClick={() => setActiveTab('kpi')}
          className={`flex flex-col items-center text-[10px] ${activeTab === 'kpi' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
        >
          <Target className="w-4 h-4 mb-0.5" />
          <span>KPI</span>
        </button>
      </div>
    </header>
  );
};
