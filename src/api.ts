import {
  Settings,
  PublicSettings,
  Topic,
  PersonaProfile,
  Post,
  TrendingItem,
  KpiStats,
  MatrixPack,
  BenchmarkAccount,
  ContentProject,
  PlatformVariant,
  PublishRecord,
  DashboardPublishStats,
  LeadRecord,
  ArticleSource,
  ArticleDeconstruction,
  RegisteredSkill,
  ImportReceipt,
  FollowerSnapshot,
  TwitterTweetItem,
} from './types';

const API_BASE = '/api';

let cachedAuthToken: string | null = null;

async function getSessionToken(): Promise<string> {
  if (cachedAuthToken) return cachedAuthToken;
  try {
    const res = await window.fetch(`${API_BASE}/auth/token`);
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        cachedAuthToken = data.token;
        return cachedAuthToken;
      }
    }
  } catch (err) {
    console.warn('Could not fetch session token:', err);
  }
  return '';
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const token = await getSessionToken();
    const headers = new Headers(init?.headers || {});
    if (token) {
      headers.set('x-workbench-token', token);
    }
    const res = await window.fetch(url, { ...init, headers });
    if (res.status === 401 && cachedAuthToken) {
      cachedAuthToken = null;
      const newToken = await getSessionToken();
      if (newToken) {
        headers.set('x-workbench-token', newToken);
        return window.fetch(url, { ...init, headers });
      }
    }
    return res;
  }
  return window.fetch(url, init);
}

export const api = {
  // Settings (Credentials strictly masked)
  async getSettings(): Promise<PublicSettings> {
    const res = await request(`${API_BASE}/settings`);
    return res.json();
  },
  async updateSettings(settings: Partial<Settings>): Promise<PublicSettings> {
    const res = await request(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // Health
  async getHealth(): Promise<{ status: string; version: string; time: string; loopbackOnly: boolean }> {
    const res = await request(`${API_BASE}/health`);
    return res.json();
  },

  // Chat Capture
  async captureChat(
    rawInput: string,
    options?: { title?: string; sourceUrl?: string; platform?: string }
  ): Promise<{ success: boolean; receipt: any; topic: Topic; project: ContentProject }> {
    const res = await request(`${API_BASE}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawInput, ...options }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '对话捕获失败');
    }
    return res.json();
  },

  // Handoff & Double-client tasks
  async exportHandoffTask(task: {
    projectId: string;
    taskType?: string;
    executionParty?: string;
    targetPlatform?: string;
    visualRequirements?: string;
    references?: string[];
  }): Promise<{ success: boolean; taskId: string; taskDir: string; manifestFile: string }> {
    const res = await request(`${API_BASE}/handoff/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '导出任务失败');
    }
    return res.json();
  },
  async getPendingHandoff(): Promise<{ count: number; pendingImportIds: string[] }> {
    const res = await request(`${API_BASE}/handoff/pending`);
    return res.json();
  },
  async importHandoff(importId: string): Promise<{ success: boolean; receipt: ImportReceipt }> {
    const res = await request(`${API_BASE}/handoff/import/${importId}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '导入产物包失败');
    }
    return res.json();
  },
  async getReceipt(importId: string): Promise<ImportReceipt> {
    const res = await request(`${API_BASE}/receipts/${importId}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '获取回执失败');
    }
    return res.json();
  },
  async getReceipts(): Promise<ImportReceipt[]> {
    const res = await request(`${API_BASE}/receipts`);
    if (!res.ok) return [];
    return res.json();
  },
  async uploadMedia(filename: string, data: string, type?: 'image' | 'video'): Promise<any> {
    const res = await request(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, data, type }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '上传素材失败');
    }
    return res.json();
  },
  async composeImagesToVideo(options: {
    imagePaths: string[];
    durationPerImage?: number;
    musicPath?: string;
    outputFileName?: string;
  }): Promise<any> {
    const res = await request(`${API_BASE}/media/image-combo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return res.json();
  },

  // Content Projects & Variants
  async getProjects(): Promise<ContentProject[]> {
    const res = await request(`${API_BASE}/projects`);
    return res.json();
  },
  async getProject(id: string): Promise<ContentProject> {
    const res = await request(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error('项目不存在');
    return res.json();
  },
  async createProject(data: {
    title: string;
    masterContent: string;
    topicId?: string;
    sources?: any[];
  }): Promise<ContentProject> {
    const res = await request(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '创建项目失败');
    }
    return res.json();
  },
  async updateProject(id: string, updates: Partial<ContentProject>): Promise<ContentProject> {
    const res = await request(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('更新项目失败');
    return res.json();
  },
  async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    const res = await request(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('删除项目失败');
    return res.json();
  },
  async addProjectRevision(
    id: string,
    content: string,
    author: 'user' | 'gemini' | 'codex' | 'system' = 'user',
    changeNote?: string
  ): Promise<ContentProject> {
    const res = await request(`${API_BASE}/projects/${id}/revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, author, changeNote }),
    });
    if (!res.ok) throw new Error('新增修订失败');
    return res.json();
  },
  async addVariant(projectId: string, variant: Partial<PlatformVariant>): Promise<PlatformVariant> {
    const res = await request(`${API_BASE}/projects/${projectId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variant),
    });
    if (!res.ok) throw new Error('添加平台版本失败');
    return res.json();
  },
  async updateVariant(
    projectId: string,
    variantId: string,
    updates: Partial<PlatformVariant>
  ): Promise<PlatformVariant> {
    const res = await request(`${API_BASE}/projects/${projectId}/variants/${variantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('更新平台版本失败');
    return res.json();
  },

  // Publishing Confirmation & Dashboard Stats
  async confirmPublish(
    projectId: string,
    variantId: string,
    externalUrl?: string
  ): Promise<{ success: boolean; record: PublishRecord; isNewRecord: boolean }> {
    const res = await request(`${API_BASE}/publish/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, variantId, externalUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '确认发布失败');
    }
    return res.json();
  },
  async getPublishDashboard(dateKey?: string): Promise<DashboardPublishStats> {
    const url = dateKey ? `${API_BASE}/publish/dashboard?dateKey=${dateKey}` : `${API_BASE}/publish/dashboard`;
    const res = await request(url);
    return res.json();
  },
  async getPublishRecords(): Promise<PublishRecord[]> {
    const res = await request(`${API_BASE}/publish/records`);
    return res.json();
  },

  // Commercial Leads & Opportunities
  async getLeads(): Promise<LeadRecord[]> {
    const res = await request(`${API_BASE}/leads`);
    return res.json();
  },
  async createLead(lead: Partial<LeadRecord>): Promise<LeadRecord> {
    const res = await request(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '创建线索失败');
    }
    return res.json();
  },
  async updateLead(id: string, updates: Partial<LeadRecord>): Promise<LeadRecord> {
    const res = await request(`${API_BASE}/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('更新线索失败');
    return res.json();
  },

  // Article Sources & Deconstructions
  async getSources(): Promise<ArticleSource[]> {
    const res = await request(`${API_BASE}/sources`);
    return res.json();
  },
  async createSource(source: Partial<ArticleSource>): Promise<ArticleSource> {
    const res = await request(`${API_BASE}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    if (!res.ok) throw new Error('保存来源文章失败');
    return res.json();
  },
  async deconstructSource(id: string, decon: Partial<ArticleDeconstruction>): Promise<ArticleDeconstruction> {
    const res = await request(`${API_BASE}/sources/${id}/deconstruct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decon),
    });
    if (!res.ok) throw new Error('文章拆解失败');
    return res.json();
  },
  async convertSourceToTopic(id: string, options?: { title?: string; angleHook?: string; deconstructionId?: string }): Promise<Topic> {
    const res = await request(`${API_BASE}/sources/${id}/convert-to-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('转化选题失败');
    return res.json();
  },
  async exportSourceHandoff(id: string): Promise<any> {
    const res = await request(`${API_BASE}/sources/${id}/handoff`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('导出拆解任务失败');
    return res.json();
  },

  // Skills Registry
  async getSkills(): Promise<RegisteredSkill[]> {
    const res = await request(`${API_BASE}/skills`);
    return res.json();
  },

  // Backup & Restore
  async createBackup(): Promise<{ success: boolean; backupDir: string; timestamp: string }> {
    const res = await request(`${API_BASE}/backup`, { method: 'POST' });
    return res.json();
  },
  async restoreBackup(timestamp: string): Promise<{ success: boolean; message: string; restoredDir: string }> {
    const res = await request(`${API_BASE}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp }),
    });
    return res.json();
  },

  // TikHub Trends
  async getTrends(platform: string = 'douyin', query?: string): Promise<{ source: string; data: TrendingItem[]; configured?: boolean; status?: string; message?: string }> {
    const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
    const res = await request(`${API_BASE}/trends?platform=${platform}${qParam}`);
    return res.json();
  },

  // Topics
  async getTopics(status?: string): Promise<Topic[]> {
    const url = status ? `${API_BASE}/topics?status=${status}` : `${API_BASE}/topics`;
    const res = await request(url);
    return res.json();
  },
  async mineTopics(trends: string[], count: number = 8): Promise<{ success: boolean; topics: Topic[] }> {
    const res = await request(`${API_BASE}/topics/mine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trends, count }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '选题挖掘失败');
    }
    return res.json();
  },
  async createTopic(topicData: Partial<Topic>): Promise<Topic> {
    const res = await request(`${API_BASE}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(topicData),
    });
    return res.json();
  },
  async updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
    const res = await request(`${API_BASE}/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  async deleteTopic(id: string): Promise<{ success: boolean }> {
    const res = await request(`${API_BASE}/topics/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async generateOutlines(topicId: string): Promise<{ success: boolean; outlines: any[]; topic: Topic }> {
    const res = await request(`${API_BASE}/topics/${topicId}/generate-outlines`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '思路生成失败');
    }
    return res.json();
  },

  // Persona
  async getPersona(): Promise<PersonaProfile> {
    const res = await request(`${API_BASE}/persona`);
    return res.json();
  },
  async updatePersona(updates: Partial<PersonaProfile>): Promise<PersonaProfile> {
    const res = await request(`${API_BASE}/persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  async addHistoricalSample(sample: { title: string; content: string; likesOrStats?: string }): Promise<PersonaProfile> {
    const res = await request(`${API_BASE}/persona/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sample),
    });
    return res.json();
  },
  async deleteHistoricalSample(sampleId: string): Promise<PersonaProfile> {
    const res = await request(`${API_BASE}/persona/samples/${sampleId}`, { method: 'DELETE' });
    return res.json();
  },
  async extractPersona(): Promise<{ success: boolean; persona: PersonaProfile }> {
    const res = await request(`${API_BASE}/persona/extract`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '提取口吻失败');
    }
    return res.json();
  },

  // Posts (Legacy & Quick Drafting)
  async getPosts(dateKey?: string): Promise<Post[]> {
    const url = dateKey ? `${API_BASE}/posts?dateKey=${dateKey}` : `${API_BASE}/posts`;
    const res = await request(url);
    return res.json();
  },
  async generatePost(topicId: string, outline?: any): Promise<{ success: boolean; post: Post }> {
    const res = await request(`${API_BASE}/posts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, outline }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '文案生成失败');
    }
    return res.json();
  },
  async batchGeneratePosts(topicIds: string[], applyLessAiTone: boolean = true): Promise<{ success: boolean; count: number; posts: Post[]; kpiStats: KpiStats }> {
    const res = await request(`${API_BASE}/posts/batch-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicIds, applyLessAiTone }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '批量生成失败');
    }
    return res.json();
  },
  async polishPost(content: string, instruction: string): Promise<{ success: boolean; polished: string }> {
    const res = await request(`${API_BASE}/posts/polish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, instruction }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '润色失败');
    }
    return res.json();
  },
  async cleanWithLessAiTone(content: string): Promise<{ success: boolean; polished: string; report?: any }> {
    const res = await request(`${API_BASE}/posts/less-ai-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '去 AI 味净化失败');
    }
    return res.json();
  },
  async getSkillInfo(): Promise<{ installed: boolean; name: string; displayName: string; corpusSize: string; rulesCount: number; hasDocumentation: boolean }> {
    const res = await request(`${API_BASE}/skill/less-ai-tone`);
    return res.json();
  },
  async updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    const res = await request(`${API_BASE}/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  async deletePost(id: string): Promise<{ success: boolean }> {
    const res = await request(`${API_BASE}/posts/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // KPI Stats
  async getKpiStats(): Promise<{ today: DashboardPublishStats; history: any[] }> {
    const res = await request(`${API_BASE}/kpi`);
    return res.json();
  },
  getExportUrl(): string {
    return `${API_BASE}/export/today`;
  },

  // Matrix
  async generateMatrixPack(sourceTitle: string, sourceContent: string, postId?: string): Promise<{ success: boolean; pack: MatrixPack }> {
    const res = await request(`${API_BASE}/matrix/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceTitle, sourceContent, postId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '生成全矩阵物料失败');
    }
    return res.json();
  },
  async getMatrixPacks(): Promise<MatrixPack[]> {
    const res = await request(`${API_BASE}/matrix`);
    return res.json();
  },
  async getMatrixPack(id: string): Promise<MatrixPack> {
    const res = await request(`${API_BASE}/matrix/${id}`);
    return res.json();
  },
  async saveMatrixPack(id: string, updates: Partial<MatrixPack>): Promise<{ success: boolean; pack: MatrixPack }> {
    const res = await request(`${API_BASE}/matrix/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  async deleteMatrixPack(id: string): Promise<{ success: boolean }> {
    const res = await request(`${API_BASE}/matrix/${id}`, { method: 'DELETE' });
    return res.json();
  },
  getMatrixExportUrl(id: string): string {
    return `${API_BASE}/export/matrix/${id}`;
  },

  // Benchmarks & Mentors
  async getBenchmarks(): Promise<BenchmarkAccount[]> {
    const res = await request(`${API_BASE}/benchmarks`);
    return res.json();
  },
  async createBenchmark(data: Partial<BenchmarkAccount>): Promise<{ success: boolean; account: BenchmarkAccount }> {
    const res = await request(`${API_BASE}/benchmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '添加账号失败');
    }
    return res.json();
  },
  async addFollowerSnapshot(accountId: string, snapshot: Partial<FollowerSnapshot>): Promise<BenchmarkAccount> {
    const res = await request(`${API_BASE}/benchmarks/${accountId}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) throw new Error('添加粉丝快照失败');
    return res.json();
  },
  async updateBenchmark(id: string, updates: Partial<BenchmarkAccount>): Promise<{ success: boolean; account: BenchmarkAccount }> {
    const res = await request(`${API_BASE}/benchmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  async deleteBenchmark(id: string): Promise<{ success: boolean }> {
    const res = await request(`${API_BASE}/benchmarks/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async syncBenchmarks(): Promise<{ success: boolean; accounts: BenchmarkAccount[] }> {
    const res = await request(`${API_BASE}/benchmarks/sync`, { method: 'POST' });
    return res.json();
  },
  async getSchedulerStatus(): Promise<any> {
    const res = await request(`${API_BASE}/scheduler/status`);
    return res.json();
  },
  async saveSchedulerConfig(config: any): Promise<any> {
    const res = await request(`${API_BASE}/scheduler/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },
  async runSchedulerNow(force = true): Promise<any> {
    const res = await request(`${API_BASE}/scheduler/run-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    });
    return res.json();
  },

  // Twitter (X) Dedicated Studio APIs (Daily 15-20 Workflow)
  async getTwitterTweets(): Promise<TwitterTweetItem[]> {
    const res = await request(`${API_BASE}/twitter/tweets`);
    return res.json();
  },
  async createTwitterTweet(data: {
    content: string;
    format?: 'short_post' | 'thread' | 'quote' | 'long_article';
    threadPosts?: string[];
    tags?: string[];
    status?: 'draft' | 'ready' | 'published';
    plannedPublishDate?: string;
    sourceProjectId?: string;
    quoteUrl?: string;
  }): Promise<{ success: boolean; project: ContentProject; variant: PlatformVariant }> {
    const res = await request(`${API_BASE}/twitter/tweets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '创建推文失败');
    }
    return res.json();
  },
  async updateTwitterTweet(
    projectId: string,
    variantId: string,
    updates: Partial<PlatformVariant>
  ): Promise<PlatformVariant> {
    const res = await request(`${API_BASE}/twitter/tweets/${projectId}/${variantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '更新推文失败');
    }
    return res.json();
  },
  async deleteTwitterTweet(projectId: string, variantId: string): Promise<{ success: boolean; message: string }> {
    const res = await request(`${API_BASE}/twitter/tweets/${projectId}/${variantId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '删除推文失败');
    }
    return res.json();
  },
  async syncProjectToTwitter(data: {
    projectId: string;
    mode: 'raw' | 'thread' | 'gemini_condense';
    plannedPublishDate?: string;
  }): Promise<{ success: boolean; project: ContentProject; variant: PlatformVariant }> {
    const res = await request(`${API_BASE}/twitter/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '同步推特失败');
    }
    return res.json();
  },
  async recordTwitterPublish(projectId: string, variantId: string): Promise<any> {
    const res = await request(`${API_BASE}/twitter/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, variantId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '记录发布失败');
    }
    return res.json();
  }
};
