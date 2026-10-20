import React from 'react';
import { 
  Search, 
  Calendar, 
  Layers, 
  Compass, 
  PenTool, 
  CheckSquare, 
  BarChart3, 
  Share2, 
  ExternalLink, 
  User, 
  Settings, 
  Moon, 
  Sun,
  Video,
  FileText,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string, platform?: string) => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  counts?: {
    todayDeficit?: number;
    projectsCount?: number;
    sourcesCount?: number;
    leadsCount?: number;
    receiptsCount?: number;
    benchmarksCount?: number;
    readyCount?: number;
    platformCounts?: Record<string, { ready: number; published: number }>;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenSearch,
  isDarkMode,
  onToggleTheme,
  counts
}) => {
  return (
    <aside className="w-56 shrink-0 bg-[#111215] text-slate-300 flex flex-col justify-between border-r border-slate-800/80 min-h-screen select-none font-sans z-30">
      {/* Top Section */}
      <div className="p-3.5 space-y-4">
        {/* Brand Logo & Title */}
        <div className="flex items-start space-x-2.5 px-1 pt-1">
          {/* Feather/Spiral Crimson Icon */}
          <div className="w-7 h-7 shrink-0 text-[#e1523d] flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
              <path
                d="M8 26C12 26 16 23 20 18C24 13 25 8 24 5C21 6 16 10 12 15C8 20 6 24 8 26Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 17L9 22"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-bold text-white tracking-wide">
              passenger的工作台
            </div>
            <button
              onClick={() => onTabChange('persona')}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center space-x-0.5 transition-colors"
            >
              <span className="truncate">我是谁 · 找到谁 · 卖什么</span>
              <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div
          onClick={onOpenSearch}
          className="flex items-center justify-between px-2.5 py-1.5 bg-[#1a1c21] hover:bg-[#20232a] border border-slate-800/80 rounded-lg text-xs text-slate-400 cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-400">搜索页面和选题</span>
          </div>
          <kbd className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono border border-slate-700">
            ⌘K
          </kbd>
        </div>

        {/* Main Workflow Nav Items */}
        <nav className="space-y-0.5 text-xs">
          {/* 今天 */}
          <button
            onClick={() => onTabChange('today')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'today' || activeTab === 'kpi'
                ? 'bg-[#22252c] text-white font-medium'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>今天</span>
            <span className="text-[10px] text-amber-500/90 font-mono">
              {counts?.todayDeficit != null ? (counts.todayDeficit > 0 ? `缺 ${counts.todayDeficit}` : '达标') : '减 2'}
            </span>
          </button>

          {/* 𝕏 推特主页面 (Dedicated Primary Studio - 15-20篇/天) */}
          <button
            onClick={() => onTabChange('twitter')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'twitter'
                ? 'bg-sky-500/20 text-sky-400 font-medium border border-sky-500/30 shadow-xs'
                : 'text-slate-200 hover:bg-[#181a1f] hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded bg-white text-black font-black text-[10px] flex items-center justify-center leading-none">
                𝕏
              </span>
              <span className="font-semibold text-slate-100">推特工作台</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 font-mono border border-sky-500/20">
              15-20篇
            </span>
          </button>

          {/* 项目工坊 (ContentProject & Variant Editor) */}
          <button
            onClick={() => onTabChange('projects')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'projects'
                ? 'bg-[#22252c] text-white font-medium'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>项目工坊</span>
            <span className="text-[10px] text-slate-400 font-mono">{counts?.projectsCount ?? 0}</span>
          </button>

          {/* 原文素材 (Article Sources) */}
          <button
            onClick={() => onTabChange('sources')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'sources'
                ? 'bg-[#22252c] text-white font-medium'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>原文素材</span>
            <span className="text-[10px] text-slate-400 font-mono">{counts?.sourcesCount ?? 0}</span>
          </button>

          {/* 进项 */}
          <button
            onClick={() => onTabChange('benchmarks')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'benchmarks' || activeTab === 'radar' || activeTab === 'ideas'
                ? 'bg-[#22252c] text-white font-medium shadow-xs'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>进项</span>
            <span className="text-[10px] text-slate-400 font-mono">{counts?.benchmarksCount ?? 0}</span>
          </button>

          {/* 排期 */}
          <button
            onClick={() => onTabChange('schedule')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'schedule'
                ? 'bg-[#22252c] text-white font-medium'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>排期</span>
          </button>

          {/* 加工中 */}
          <button
            onClick={() => onTabChange('studio')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'studio'
                ? 'bg-[#22252c] text-white font-medium'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>文案加工</span>
            {counts?.readyCount ? (
              <span className="text-[10px] text-orange-400 font-mono">{counts.readyCount} 待发</span>
            ) : null}
          </button>

          {/* 收益线索 */}
          <button
            onClick={() => onTabChange('leads')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'leads'
                ? 'bg-[#22252c] text-white font-medium'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>收益线索</span>
            <span className="text-[10px] text-amber-500/80 font-mono">{counts?.leadsCount ?? 0}</span>
          </button>

          {/* 任务回执 */}
          <button
            onClick={() => onTabChange('receipts')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'receipts'
                ? 'bg-[#22252c] text-white font-medium'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <span>任务回执</span>
            <span className="text-[10px] text-slate-400 font-mono">{counts?.receiptsCount ?? 0}</span>
          </button>
        </nav>

        {/* Platform Section: 5 Standard PRD Platforms */}
        <div className="space-y-0.5 pt-2">
          <div className="text-[11px] text-slate-500 font-medium px-2.5 py-1">
            五大发布平台
          </div>

          {/* 1. X (推特) */}
          <button
            onClick={() => onTabChange('twitter')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              activeTab === 'twitter'
                ? 'bg-sky-500/20 text-sky-400 font-medium border border-sky-500/30'
                : 'text-slate-400 hover:bg-[#181a1f] hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-white flex items-center justify-center">
                𝕏
              </span>
              <span>X (推特独立主页)</span>
            </div>
            {counts?.platformCounts?.x?.ready ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40">
                {counts.platformCounts.x.ready} 待发
              </span>
            ) : counts?.platformCounts?.x?.published ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400">
                {counts.platformCounts.x.published} 已发
              </span>
            ) : null}
          </button>

          {/* 2. 小红书 */}
          <button
            onClick={() => onTabChange('matrix', 'xiaohongshu')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-[#181a1f] hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded bg-rose-950 text-[10px] font-bold text-rose-400 flex items-center justify-center">
                红
              </span>
              <span>小红书</span>
            </div>
            {counts?.platformCounts?.xiaohongshu?.ready ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40">
                {counts.platformCounts.xiaohongshu.ready} 待发
              </span>
            ) : counts?.platformCounts?.xiaohongshu?.published ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400">
                {counts.platformCounts.xiaohongshu.published} 已发
              </span>
            ) : null}
          </button>

          {/* 3. 微信公众号 */}
          <button
            onClick={() => onTabChange('matrix', 'wechatArticle')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-[#181a1f] hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded bg-emerald-950 text-[10px] font-bold text-emerald-400 flex items-center justify-center">
                公
              </span>
              <span>微信公众号</span>
            </div>
            {counts?.platformCounts?.gzh?.ready ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40">
                {counts.platformCounts.gzh.ready} 待发
              </span>
            ) : counts?.platformCounts?.gzh?.published ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400">
                {counts.platformCounts.gzh.published} 已发
              </span>
            ) : null}
          </button>

          {/* 4. 抖音 */}
          <button
            onClick={() => onTabChange('matrix', 'douyin')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-[#181a1f] hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold text-white flex items-center justify-center">
                抖
              </span>
              <span>抖音</span>
            </div>
            {counts?.platformCounts?.douyin?.ready ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40">
                {counts.platformCounts.douyin.ready} 待发
              </span>
            ) : counts?.platformCounts?.douyin?.published ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400">
                {counts.platformCounts.douyin.published} 已发
              </span>
            ) : null}
          </button>

          {/* 5. 微信视频号 */}
          <button
            onClick={() => onTabChange('matrix', 'wechatChannels')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-[#181a1f] hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded bg-emerald-950 text-[10px] font-bold text-emerald-400 flex items-center justify-center">
                视
              </span>
              <span>视频号</span>
            </div>
            {counts?.platformCounts?.channels?.ready ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-orange-800/40">
                {counts.platformCounts.channels.ready} 待发
              </span>
            ) : counts?.platformCounts?.channels?.published ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400">
                {counts.platformCounts.channels.published} 已发
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3.5 border-t border-slate-800/80 space-y-3">
        {/* User Profile */}
        <div 
          onClick={() => onTabChange('persona')}
          className="flex items-center space-x-2 px-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200">Anna</span>
          <span className="text-[10px] text-slate-500">内容主编</span>
        </div>

        {/* Settings & Platform Buttons */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>设置</span>
            <button
              onClick={onOpenSettings}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Platform Icons Row: 抖 视 红 公 X B Y */}
          <div className="flex items-center space-x-1.5 px-0.5">
            <span title="抖音" onClick={() => onTabChange('matrix', 'douyin')} className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold flex items-center justify-center cursor-pointer">
              抖
            </span>
            <span title="视频号" onClick={() => onTabChange('matrix', 'wechatChannels')} className="w-5 h-5 rounded bg-emerald-900/60 hover:bg-emerald-900 text-[10px] text-emerald-300 font-bold flex items-center justify-center cursor-pointer">
              视
            </span>
            <span title="小红书" onClick={() => onTabChange('matrix', 'xiaohongshu')} className="w-5 h-5 rounded bg-rose-950 hover:bg-rose-900 text-[10px] text-rose-300 font-bold flex items-center justify-center cursor-pointer">
              红
            </span>
            <span title="微信公众号" onClick={() => onTabChange('matrix', 'wechatArticle')} className="w-5 h-5 rounded bg-emerald-950 hover:bg-emerald-900 text-[10px] text-emerald-400 font-bold flex items-center justify-center cursor-pointer">
              公
            </span>
            <span title="推特 / X" onClick={() => onTabChange('matrix', 'twitter')} className="w-5 h-5 rounded bg-black border border-slate-700 text-[10px] text-white font-bold flex items-center justify-center cursor-pointer">
              X
            </span>
            <span title="B站" onClick={() => onTabChange('matrix')} className="w-5 h-5 rounded bg-sky-950 text-[10px] text-sky-400 font-bold flex items-center justify-center cursor-pointer">
              B
            </span>
            <span title="YouTube" onClick={() => onTabChange('matrix')} className="w-5 h-5 rounded bg-rose-900 text-[10px] text-rose-200 font-bold flex items-center justify-center cursor-pointer">
              Y
            </span>
          </div>

          {/* Disassembly Status */}
          <div className="text-[10px] text-slate-500 px-1 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
            <span>0 个拆解进行中</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="w-full py-1 px-2 bg-[#191b20] hover:bg-[#20232a] border border-slate-800 rounded text-[11px] text-slate-400 hover:text-slate-200 text-center transition-colors flex items-center justify-center space-x-1.5"
          >
            {isDarkMode ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-slate-400" />}
            <span>切换深浅色</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
