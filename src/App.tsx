import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { BenchmarkStudio } from './components/BenchmarkStudio';
import { TopicRadar } from './components/TopicRadar';
import { IdeaStudio } from './components/IdeaStudio';
import { PersonaManager } from './components/PersonaManager';
import { PostStudio } from './components/PostStudio';
import { MatrixStudio } from './components/MatrixStudio';
import { KpiDashboard } from './components/KpiDashboard';
import { ProjectStudio } from './components/ProjectStudio';
import { SourceStudio } from './components/SourceStudio';
import { LeadStudio } from './components/LeadStudio';
import { ReceiptStudio } from './components/ReceiptStudio';
import { TwitterStudio } from './components/TwitterStudio';
import {
  Topic,
  PersonaProfile,
  Settings,
  KpiStats,
  Post,
  BenchmarkAccount,
  ContentProject,
  ArticleSource,
  LeadRecord
} from './types';
import { api } from './api';

export const App: React.FC = () => {
  // Default homepage is 'today' (PRD 15.3 & Extended Review Point 1)
  const [activeTab, setActiveTab] = useState<
    'today' | 'twitter' | 'projects' | 'sources' | 'leads' | 'receipts' | 'benchmarks' | 'radar' | 'ideas' | 'studio' | 'matrix' | 'persona' | 'kpi' | 'schedule'
  >('today');
  const [matrixInitialPlatform, setMatrixInitialPlatform] = useState<
    'wechatArticle' | 'wechatChannels' | 'douyin' | 'xiaohongshu' | 'twitter' | 'covers'
  >('wechatArticle');

  const [benchmarks, setBenchmarks] = useState<BenchmarkAccount[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [sources, setSources] = useState<ArticleSource[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [kpiStats, setKpiStats] = useState<any>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activePostForMatrix, setActivePostForMatrix] = useState<Post | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Theme mode: false = clean light grey canvas as in screenshot; true = full dark
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load all initial workbench data
  const loadInitialData = async () => {
    try {
      const [
        benchmarksData,
        topicsData,
        personaData,
        settingsData,
        kpiData,
        postsData,
        projectsData,
        sourcesData,
        leadsData,
        receiptsData
      ] = await Promise.all([
        api.getBenchmarks().catch(() => []),
        api.getTopics().catch(() => []),
        api.getPersona().catch(() => null),
        api.getSettings().catch(() => null),
        api.getKpiStats().catch(() => ({ today: null, history: [] })),
        api.getPosts().catch(() => []),
        api.getProjects().catch(() => []),
        api.getSources().catch(() => []),
        api.getLeads().catch(() => []),
        api.getReceipts().catch(() => []),
      ]);
      setBenchmarks(benchmarksData);
      setTopics(topicsData);
      setPersona(personaData);
      setSettings(settingsData);
      setKpiStats(kpiData.today);
      setPosts(postsData);
      setProjects(projectsData);
      setSources(sourcesData);
      setLeads(leadsData);
      setReceiptsCount(Array.isArray(receiptsData) ? receiptsData.length : 0);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshBenchmarks = async () => {
    const list = await api.getBenchmarks();
    setBenchmarks(list);
  };

  const refreshTopics = async () => {
    const list = await api.getTopics();
    setTopics(list);
  };

  const refreshPosts = async () => {
    const list = await api.getPosts();
    setPosts(list);
  };

  const refreshProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch (_) {}
  };

  const refreshSources = async () => {
    try {
      const list = await api.getSources();
      setSources(list);
    } catch (_) {}
  };

  const refreshLeads = async () => {
    try {
      const list = await api.getLeads();
      setLeads(list);
    } catch (_) {}
  };

  const refreshPersona = async () => {
    const p = await api.getPersona();
    setPersona(p);
  };

  const refreshKpi = async () => {
    const k = await api.getKpiStats();
    setKpiStats(k.today);
    refreshPosts();
    refreshProjects();
  };

  const handleSaveSettings = async (newSettings: Partial<Settings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
    refreshKpi();
  };

  // Navigations between modules
  const handleTabChange = (tab: string, platform?: string) => {
    if (tab === 'matrix' && platform) {
      setMatrixInitialPlatform(platform as any);
    }
    setActiveTab(tab as any);
  };

  const handleGoToIdeas = (topicId: string) => {
    setActiveTopicId(topicId);
    setActiveTab('ideas');
  };

  const handleGoToStudioWithTopic = (topicId: string) => {
    setActiveTopicId(topicId);
    setActiveTab('studio');
  };

  const handleEditPostFromKpi = (topicId?: string) => {
    if (topicId) {
      setActiveTopicId(topicId);
    }
    setActiveTab('studio');
  };

  const handleGoToMatrixWithPost = (data: { title: string; content: string }) => {
    setActivePostForMatrix({
      id: `custom-${Date.now()}`,
      title: data.title,
      candidateTitles: [data.title],
      content: data.content,
      tags: [],
      wordCount: data.content.length,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dateKey: new Date().toISOString().split('T')[0],
    });
    setActiveTab('matrix');
  };

  const platformCounts: Record<string, { ready: number; published: number }> = {
    x: { ready: 0, published: 0 },
    xiaohongshu: { ready: 0, published: 0 },
    gzh: { ready: 0, published: 0 },
    douyin: { ready: 0, published: 0 },
    channels: { ready: 0, published: 0 }
  };
  let readyTotal = 0;
  projects.forEach(p => {
    (p.variants || []).forEach(v => {
      if (platformCounts[v.platform]) {
        if (v.status === 'ready') {
          platformCounts[v.platform].ready++;
          readyTotal++;
        } else if (v.status === 'published') {
          platformCounts[v.platform].published++;
        }
      }
    });
  });

  return (
    <div className={`min-h-screen flex font-sans ${isDarkMode ? 'bg-[#0b0f17] text-slate-100' : 'bg-[#eef1f4] text-slate-900'}`}>
      {/* 1. Left Dark Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        counts={{
          todayDeficit: kpiStats?.remainingToTarget !== undefined
            ? kpiStats.remainingToTarget
            : (kpiStats?.target ? Math.max(0, kpiStats.target - (kpiStats.publishedCount || 0)) : (settings?.dailyKpiTarget || 20)),
          projectsCount: projects.length,
          sourcesCount: sources.length,
          leadsCount: leads.length,
          receiptsCount: receiptsCount,
          benchmarksCount: benchmarks.length,
          readyCount: readyTotal,
          platformCounts
        }}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">正在启动 passenger 的工作台...</p>
            </div>
          ) : (
            <>
              {/* 今天 / 排期 / KPI 看板 (Default Homepage) */}
              {(activeTab === 'today' || activeTab === 'kpi' || activeTab === 'schedule') && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <span className="text-emerald-600 font-semibold">今天（KPI 与发布进度）</span>
                  </div>
                  <KpiDashboard
                    kpiStats={kpiStats}
                    onRefreshKpi={refreshKpi}
                    onEditPost={handleEditPostFromKpi}
                  />
                </div>
              )}

              {/* 𝕏 推特独立工作台 (Dedicated Primary Page - 15-20/天) */}
              {activeTab === 'twitter' && (
                <TwitterStudio
                  onRefreshKpi={refreshKpi}
                  onGoToProjects={() => setActiveTab('projects')}
                />
              )}

              {/* 项目工坊 (ContentProject & Variant Studio) */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <span className="text-orange-600 font-semibold">项目工坊（母版与多平台变体）</span>
                  </div>
                  <ProjectStudio
                    onRefreshKpi={refreshKpi}
                  />
                </div>
              )}

              {/* 原文素材 (Article Sources & Deconstruction) */}
              {activeTab === 'sources' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <span className="text-indigo-600 font-semibold">原文素材（深度采集与结构化拆解）</span>
                  </div>
                  <SourceStudio
                    onGoToTopic={(topicId) => {
                      setActiveTopicId(topicId);
                      setActiveTab('ideas');
                    }}
                  />
                </div>
              )}

              {/* 收益线索 (Commercial Leads & Revenue) */}
              {activeTab === 'leads' && (
                <div className="space-y-4">
                  <LeadStudio
                    leads={leads}
                    projects={projects}
                    onRefreshLeads={refreshLeads}
                  />
                </div>
              )}

              {/* 任务回执 (Task Receipts & Offline READY packages) */}
              {activeTab === 'receipts' && (
                <div className="space-y-4">
                  <ReceiptStudio />
                </div>
              )}

              {/* 老师和对标 (The Screenshot View) */}
              {activeTab === 'benchmarks' && (
                <BenchmarkStudio
                  accounts={benchmarks}
                  onRefreshAccounts={refreshBenchmarks}
                  onNavigateTab={(tab) => setActiveTab(tab as any)}
                  onOpenDeconstructModal={(title) => {
                    setActiveTab('ideas');
                  }}
                />
              )}

              {/* 进来的 (爆款雷达) */}
              {activeTab === 'radar' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <button onClick={() => setActiveTab('benchmarks')} className="hover:text-slate-800">进项</button>
                    <span>/</span>
                    <span className="text-[#e1523d] font-semibold">进来的（爆款雷达）</span>
                  </div>
                  <TopicRadar
                    topics={topics}
                    onRefreshTopics={refreshTopics}
                    onGoToIdeas={handleGoToIdeas}
                  />
                </div>
              )}

              {/* 拆解报告 (创意工坊) */}
              {activeTab === 'ideas' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <button onClick={() => setActiveTab('benchmarks')} className="hover:text-slate-800">进项</button>
                    <span>/</span>
                    <span className="text-[#e1523d] font-semibold">拆解报告（创意构思）</span>
                  </div>
                  <IdeaStudio
                    topics={topics}
                    activeTopicId={activeTopicId}
                    setActiveTopicId={setActiveTopicId}
                    onRefreshTopics={refreshTopics}
                    onGoToStudioWithTopic={handleGoToStudioWithTopic}
                    persona={persona}
                  />
                </div>
              )}

              {/* 加工中 (文案工坊) */}
              {activeTab === 'studio' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <span className="text-orange-500 font-semibold">加工中（文案生成工坊）</span>
                  </div>
                  <PostStudio
                    topics={topics}
                    activeTopicId={activeTopicId}
                    onRefreshTopics={refreshTopics}
                    onRefreshKpi={refreshKpi}
                    persona={persona}
                    kpiStats={kpiStats}
                    onGoToMatrix={handleGoToMatrixWithPost}
                  />
                </div>
              )}

              {/* 全矩阵分发 (一鱼多吃) */}
              {activeTab === 'matrix' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <span className="text-orange-500 font-semibold">全平台矩阵分发（一鱼多吃）</span>
                  </div>
                  <MatrixStudio
                    posts={posts}
                    activePost={activePostForMatrix}
                    persona={persona}
                    initialPlatform={matrixInitialPlatform}
                  />
                </div>
              )}

              {/* 人设档案 */}
              {activeTab === 'persona' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
                    <span className="text-indigo-600 font-semibold">我是谁 · 找到谁 · 卖什么（人设声线档案）</span>
                  </div>
                  <PersonaManager
                    persona={persona}
                    onRefreshPersona={refreshPersona}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Global Command / Search Palette (⌘K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleTabChange}
        accounts={benchmarks}
      />

      {/* 4. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;
