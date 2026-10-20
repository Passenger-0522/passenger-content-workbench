import React, { useState, useEffect } from 'react';
import { Search, X, Layers, Sparkles, FileText, Share2, Compass, BarChart3, User, ExternalLink } from 'lucide-react';
import { BenchmarkAccount } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, platform?: string) => void;
  accounts: BenchmarkAccount[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  accounts
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // toggle if already open or open
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickPages = [
    { title: '进项 · 老师和对标', desc: '学习理念与复制对标账号', tab: 'benchmarks', icon: Compass },
    { title: '进项 · 进来的（爆款雷达）', desc: '实时热点与高潜选题', tab: 'radar', icon: Sparkles },
    { title: '进项 · 拆解报告（创意构思）', desc: '拆解框架与行文大纲', tab: 'ideas', icon: Layers },
    { title: '加工中 · 文案工坊', desc: '人设声线生成与去AI味精润', tab: 'studio', icon: FileText },
    { title: '全矩阵分发（一鱼多吃）', desc: '公众号/视频号/抖音/小红书/推特', tab: 'matrix', icon: Share2 },
    { title: '今天 · KPI 看板与发布记录', desc: '每日目标跟踪与发布流水', tab: 'kpi', icon: BarChart3 },
    { title: '人设声线档案', desc: '声音特征、词汇习惯与少走弯路', tab: 'persona', icon: User },
  ];

  const filteredPages = quickPages.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase()) || 
    p.desc.toLowerCase().includes(query.toLowerCase())
  );

  const matchedAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="搜索页面、选题或对标账号 (输入关键词)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          <kbd className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 text-xs">
          {/* Pages */}
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              功能页面
            </div>
            {filteredPages.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onNavigate(item.tab);
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-orange-50 text-slate-600 group-hover:text-orange-600 flex items-center justify-center transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    跳转 →
                  </span>
                </div>
              );
            })}
          </div>

          {/* Accounts */}
          {matchedAccounts.length > 0 && (
            <div className="pt-2 pb-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                对标与老师账号
              </div>
              {matchedAccounts.map(acc => (
                <div
                  key={acc.id}
                  onClick={() => {
                    onNavigate('benchmarks');
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      acc.type === 'mentor' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {acc.type === 'mentor' ? '老师' : '对标'}
                    </span>
                    <span className="font-medium text-slate-800">{acc.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({acc.fansCount})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    中位 {acc.medianEngagement.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
