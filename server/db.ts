import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function getDataDir(): string {
  const dir = path.resolve(process.env.WORKBENCH_DATA_DIR || process.env.DATA_DIR || path.resolve(process.cwd(), 'data'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getFilePath(filename: string) {
  return path.join(getDataDir(), filename);
}

export function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
    } catch (_) {}
    return defaultValue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(content) as T;
  } catch (error: any) {
    console.error(`Database corruption detected in ${filename}:`, error);
    throw new Error(`Database corruption detected in ${filename}: ${error.message}. Halting to preserve data.`);
  }
}

export function writeJsonFile<T>(filename: string, data: T): void {
  const dir = getDataDir();
  const filePath = path.join(dir, filename);
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
    console.error(`Error writing ${filename}:`, error);
    throw error;
  }
}

export function getShanghaiDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(date);
}

export function parseFansCount(raw?: string): { count: number | null; precision: 'exact' | 'approximate' | 'unknown' } {
  if (!raw || raw === '未知' || raw.trim() === '') {
    return { count: null, precision: 'unknown' };
  }
  const cleaned = raw.trim();
  if (cleaned.includes('万')) {
    const match = cleaned.match(/([\d.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      return { count: Math.round(num * 10000), precision: 'approximate' };
    }
  }
  const digits = cleaned.replace(/[^\d]/g, '');
  if (digits) {
    return { count: parseInt(digits, 10), precision: 'exact' };
  }
  return { count: null, precision: 'unknown' };
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'backups') continue;
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ==========================================
// 1. Settings & Credential Masking
// ==========================================
export interface PlatformTargets {
  x: number;
  xiaohongshu: number;
  gzh: number;
  douyin: number;
  channels: number;
}

export interface Settings {
  geminiApiKey: string;
  geminiBaseUrl: string;
  geminiModel: string;
  tikhubApiKey: string;
  tikhubBaseUrl: string;
  dailyKpiTarget: number;
  niche: string;
  targets: PlatformTargets;
}

export interface PublicSettings {
  geminiConfigured: boolean;
  tikhubConfigured: boolean;
  geminiBaseUrl: string;
  geminiModel: string;
  tikhubBaseUrl: string;
  dailyKpiTarget: number;
  niche: string;
  targets: PlatformTargets;
}

const defaultSettings: Settings = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiBaseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  tikhubApiKey: process.env.TIKHUB_API_KEY || '',
  tikhubBaseUrl: process.env.TIKHUB_BASE_URL || 'https://api.tikhub.io',
  dailyKpiTarget: 26,
  niche: 'AI与效率工具 / 个人超级个体 / 跨境出海',
  targets: {
    x: 18,
    xiaohongshu: 2,
    gzh: 2,
    douyin: 2,
    channels: 2
  }
};

// ==========================================
// 2. Core Content & Multi-Platform Models (PRD v1.2)
// ==========================================

export type TopicStatus = 'pending' | 'to_do' | 'in_progress' | 'done' | 'deferred' | 'abandoned';

export interface Topic {
  id: string;
  title: string;
  sourceHot: string;
  platform: 'douyin' | 'xiaohongshu' | 'weibo' | 'tiktok' | 'custom' | 'x';
  category: string;
  angleHook: string;
  targetAudience: string;
  estimatedViralScore: number;
  status: TopicStatus;
  sourceId?: string;
  projectId?: string;
  deconstructionId?: string;
  outlines?: Array<{
    id: string;
    name: string;
    hook: string;
    points: string[];
    cta: string;
  }>;
  selectedOutline?: {
    id: string;
    name: string;
    hook: string;
    points: string[];
    cta: string;
    customNotes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MasterDraftRevision {
  rev: number;
  content: string;
  createdAt: string;
  locked: boolean;
  author: 'user' | 'gemini' | 'codex' | 'system';
  changeNote?: string;
}

export interface ContentSource {
  id: string;
  url?: string;
  author?: string;
  text: string;
  capturedAt: string;
  canonicalId?: string;
}

export interface ChannelsCoverProfile {
  name: string;
  usage: 'channels_vertical' | 'channels_horizontal' | string;
  targetRatio: string;
  targetWidth: number;
  targetHeight: number;
  assignedCoverId?: string;
}

export interface VariantCover {
  id: string;
  name: string;
  usage: 'primary' | 'channels_vertical' | 'channels_horizontal' | 'card' | 'poster' | 'body_image';
  ratio: string; // '9:16' | '16:9' | '3:4' | '2.35:1' | '1:1'
  url: string;
  prompt: string;
  skillId?: string;
  verifiedOnDisk?: boolean;
  width?: number;
  height?: number;
  layoutNotes?: string;
  headline?: string;
  subheadline?: string;
  needsReview?: boolean;
}

export type PlatformType = 'x' | 'xiaohongshu' | 'gzh' | 'douyin' | 'channels';

export type VariantFormat =
  | 'short_post'
  | 'quote'
  | 'repost'
  | 'thread'
  | 'long_article'
  | 'image_text'
  | 'video'
  | 'article'
  | 'image_card'
  | 'image_combo'
  | 'mini_image';

export interface PlatformVariant {
  id: string;
  projectId: string;
  platform: PlatformType;
  format: VariantFormat;
  title: string;
  candidateTitles: string[];
  content: string; // 正文
  cardTexts?: string[]; // 图文页独立文字
  tags: string[];
  covers: VariantCover[];
  threadPosts?: string[]; // X 线程拆分条目
  videoUrl?: string;
  videoPath?: string;
  videoId?: string;
  videoName?: string;
  duration?: number;
  bodyImages?: Array<{
    id: string;
    url: string;
    name?: string;
    positionMarker?: string;
    width?: number;
    height?: number;
  }>;
  channelsProfiles?: ChannelsCoverProfile[];
  cardPageTexts?: Record<string, string>;
  plannedPublishDate?: string;
  status: 'draft' | 'ready' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  notes?: string;
}

export interface ContentProject {
  id: string;
  topicId?: string;
  title: string;
  masterDraft: {
    currentRev: number;
    revisions: MasterDraftRevision[];
  };
  sources: ContentSource[];
  status: 'draft' | 'in_progress' | 'ready' | 'published';
  variants: PlatformVariant[];
  isLegacyDraft?: boolean;
  sourceFile?: string;
  baseVideo?: {
    id: string;
    url: string;
    path: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 真实发布记录 (Only user confirmation creates this!)
export interface PublishRecord {
  id: string;
  projectId: string;
  variantId: string;
  platform: PlatformType;
  format: VariantFormat;
  title: string;
  publishedAt: string;
  confirmedBy: 'user';
  externalUrl?: string;
}

// 商业线索与收益记录 (PRD 5.5 & 10.1)
export type LeadType = 'commercial_order' | 'consulting' | 'coaching' | 'platform_incentive';

export interface LeadRecord {
  id: string;
  type: LeadType;
  title: string;
  clientOrPlatform: string;
  amount: number | null;
  amountUnknown: boolean;
  status: 'inquiry' | 'negotiating' | 'confirmed' | 'delivered' | 'paid';
  platform?: PlatformType;
  relatedProjectId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 粉丝快照与对标博主 (PRD 7.6 & 10.1)
export interface FollowerSnapshot {
  id: string;
  fansCountRaw: string; // e.g. "1.2万" or "12,450"
  fansCount: number | null; // e.g. 12000
  precision: 'exact' | 'approximate' | 'unknown';
  observedAt: string;
  source: 'manual' | 'tikhub_api' | 'import';
  error?: string;
}

export interface BenchmarkWork {
  id: string;
  title: string;
  publishTime: string;
  likes: number;
  favorites: number;
  shares: number;
  comments: number;
  multiplier: number;
  isViral: boolean;
  platform?: string;
  url?: string;
}

export interface BenchmarkAccount {
  id: string;
  name: string;
  type: 'benchmark' | 'mentor';
  platform: PlatformType | 'all';
  handleOrId?: string;
  profileUrl?: string;
  contentDirection?: string;
  whyBenchmark?: string;
  watchLevel?: 'high' | 'normal' | 'low';
  snapshots: FollowerSnapshot[];
  latestSnapshot?: FollowerSnapshot;
  earliestSampleTime?: string;
  verifiedAccountCreationDate?: string;
  worksCount: number;
  viralCount: number;
  medianEngagement: number;
  lastSyncedAt: string;
  trendData: number[];
  works?: BenchmarkWork[];
}

// 文章资料与拆解记录 (PRD 7.5 & 7.7)
export interface SourceCaptureVersion {
  versionId: string;
  rawText: string;
  contentHash: string;
  capturedAt: string;
  method: string;
  readabilityStatus: 'full' | 'partial' | 'link_only';
  source?: string;
}

export interface ArticleDeconstruction {
  id: string;
  sourceVersionId?: string;
  sourceContentHash?: string;
  audience: string;
  topicHook: string;
  structure: string;
  evidence: string;
  rhythm: string;
  visuals: string;
  ending: string;
  actionablePoints: string[];
  candidateTopicId?: string;
  createdAt: string;
}

export interface ArticleSource {
  id: string;
  url: string;
  canonicalId: string;
  title?: string;
  author: string;
  publishTime?: string;
  rawMarkdown: string;
  readabilityStatus: 'full' | 'partial' | 'link_only';
  capturedAt: string;
  firstCapturedAt?: string;
  latestCapturedAt?: string;
  currentVersionId?: string;
  currentContentHash?: string;
  versions?: SourceCaptureVersion[];
  bookmarkReason?: string;
  isBenchmarkArticle: boolean;
  deconstructions: ArticleDeconstruction[];
}

// Skill 注册对象 (PRD 9.0)
export interface RegisteredSkill {
  skillId: string;
  name: string;
  path: string;
  purpose: string;
  executionParty: 'gemini' | 'codex' | 'local_script' | 'hybrid';
  verificationStatus: 'verified' | 'doc_checked' | 'script_ready' | 'unconfigured';
  supportedRatios: string[];
  allowsCopyModification: boolean;
  costPath: 'subscription_quota' | 'local_free' | 'model_api';
  lastVerifiedAt?: string;
}

// 创作者口吻
export interface MatrixPack {
  id: string;
  sourceTitle: string;
  sourceContent: string;
  postId?: string;
  createdAt: string;
  updatedAt: string;
  platforms: {
    wechatArticle: any;
    wechatChannels: any;
    douyin: any;
    xiaohongshu: any;
    twitter: any;
  };
}

export interface PersonaProfile {
  name: string;
  bio: string;
  toneStyle: string;
  vocabularyTraits: string[];
  structureHabits: string[];
  punctuationEmojiHabits: string;
  openingStyle: string;
  closingStyle: string;
  systemPromptTemplate: string;
  historicalSamples: Array<{
    id: string;
    title: string;
    content: string;
    likesOrStats?: string;
    date?: string;
  }>;
}

// Legacy Post interface for backward-compatibility
export interface Post {
  id: string;
  topicId?: string;
  title: string;
  candidateTitles: string[];
  content: string;
  tags: string[];
  wordCount: number;
  status: 'draft' | 'completed' | 'published';
  createdAt: string;
  updatedAt: string;
  dateKey: string;
}

export interface KpiDayRecord {
  dateKey: string;
  target: number;
  completedCount: number;
  postIds: string[];
}

// Helper to idempotently sync 22 legacy Markdown posts in posts/ as draft projects
function syncLegacyPosts(): ContentProject[] {
  const postsDir = path.resolve(process.cwd(), 'posts');
  let projects = readJsonFile<ContentProject[]>('projects.json', []);
  if (!fs.existsSync(postsDir)) return projects;

  // Filter out any previous colliding legacy entries with the old buggy prefix
  projects = projects.filter(p => p.id !== 'proj_legacy_706f737473');

  const existingSourceFiles = new Set(projects.map(p => p.sourceFile).filter(Boolean));
  const existingIds = new Set(projects.map(p => p.id));

  function scanDir(dir: string): string[] {
    const results: string[] = [];
    try {
      const list = fs.readdirSync(dir);
      for (const file of list) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...scanDir(fullPath));
        } else if (file.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch (_) {}
    return results;
  }

  const mdFiles = scanDir(postsDir);
  let hasNew = false;

  for (const filePath of mdFiles) {
    const relPath = path.relative(process.cwd(), filePath);
    if (existingSourceFiles.has(relPath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const filename = path.basename(filePath, '.md');
      const firstLine = content.split('\n').find(l => l.trim().length > 0) || '';
      const firstLineTitle = firstLine.replace(/^[#\s]+/, '').trim();
      const title = firstLineTitle || filename;

      const dateMatch = relPath.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      const stat = fs.statSync(filePath);
      const dateStr = dateMatch ? `${dateMatch[1]}T00:00:00.000Z` : new Date(stat.mtimeMs).toISOString();

      const projId = 'proj_legacy_' + crypto.createHash('sha256').update(relPath).digest('hex').slice(0, 12);
      if (existingIds.has(projId)) continue;

      const legacyProject: ContentProject = {
        id: projId,
        title,
        masterDraft: {
          currentRev: 1,
          revisions: [
            {
              rev: 1,
              content,
              createdAt: dateStr,
              locked: true,
              author: 'user',
              changeNote: `历史文稿存档自动索引 (来源: ${relPath})`
            }
          ]
        },
        sources: [
          {
            id: 'src_' + Math.random().toString(36).substring(2, 10),
            url: '',
            author: '本地历史草稿',
            text: content.slice(0, 300),
            capturedAt: dateStr
          }
        ],
        status: 'draft',
        isLegacyDraft: true,
        sourceFile: relPath,
        variants: [],
        createdAt: dateStr,
        updatedAt: dateStr
      };

      projects.push(legacyProject);
      existingSourceFiles.add(relPath);
      existingIds.add(projId);
      hasNew = true;
    } catch (_) {}
  }

  if (hasNew) {
    writeJsonFile('projects.json', projects);
  }
  return projects;
}

// ==========================================
// 3. Database Singleton & Methods
// ==========================================
export const db = {
  // Settings (with credentials masked)
  getSettings(): Settings {
    return readJsonFile<Settings>('settings.json', defaultSettings);
  },
  getPublicSettings(): PublicSettings {
    const s = this.getSettings();
    return {
      geminiConfigured: Boolean(s.geminiApiKey),
      tikhubConfigured: Boolean(s.tikhubApiKey),
      geminiBaseUrl: s.geminiBaseUrl,
      geminiModel: s.geminiModel,
      tikhubBaseUrl: s.tikhubBaseUrl,
      dailyKpiTarget: s.dailyKpiTarget || 20,
      niche: s.niche || 'AI与效率工具 / 个人超级个体',
      targets: s.targets || defaultSettings.targets
    };
  },
  updateSettings(newSettings: Partial<Settings>): PublicSettings {
    const current = this.getSettings();
    const updated: Settings = {
      ...current,
      ...newSettings,
      // Never overwrite real keys with empty string if user passed masked or placeholder
      geminiApiKey:
        newSettings.geminiApiKey && newSettings.geminiApiKey.includes('***')
          ? current.geminiApiKey
          : newSettings.geminiApiKey !== undefined
          ? newSettings.geminiApiKey
          : current.geminiApiKey,
      tikhubApiKey:
        newSettings.tikhubApiKey && newSettings.tikhubApiKey.includes('***')
          ? current.tikhubApiKey
          : newSettings.tikhubApiKey !== undefined
          ? newSettings.tikhubApiKey
          : current.tikhubApiKey,
      targets: {
        ...(current.targets || defaultSettings.targets),
        ...(newSettings.targets || {})
      }
    };
    writeJsonFile('settings.json', updated);
    return this.getPublicSettings();
  },

  // Topics
  getTopics(): Topic[] {
    return readJsonFile<Topic[]>('topics.json', []);
  },
  saveTopics(topics: Topic[]): void {
    writeJsonFile('topics.json', topics);
  },
  addTopic(topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Topic {
    const topics = this.getTopics();
    const now = new Date().toISOString();
    const newTopic: Topic = {
      ...topic,
      id: 'top_' + Math.random().toString(36).substring(2, 10),
      createdAt: now,
      updatedAt: now
    };
    topics.unshift(newTopic);
    this.saveTopics(topics);
    return newTopic;
  },
  updateTopic(id: string, updates: Partial<Topic>): Topic | null {
    const topics = this.getTopics();
    const index = topics.findIndex(t => t.id === id);
    if (index === -1) return null;
    const updated = { ...topics[index], ...updates, updatedAt: new Date().toISOString() };
    topics[index] = updated;
    this.saveTopics(topics);
    return updated;
  },
  deleteTopic(id: string): boolean {
    const topics = this.getTopics();
    const filtered = topics.filter(t => t.id !== id);
    if (filtered.length !== topics.length) {
      this.saveTopics(filtered);
      return true;
    }
    return false;
  },

  // Content Projects (母稿与版本关系)
  getProjects(): ContentProject[] {
    return syncLegacyPosts();
  },
  getProject(id: string): ContentProject | null {
    return this.getProjects().find(p => p.id === id) || null;
  },
  saveProjects(projects: ContentProject[]): void {
    writeJsonFile('projects.json', projects);
  },
  addProject(data: {
    topicId?: string;
    title: string;
    masterContent: string;
    sources?: ContentSource[];
  }): ContentProject {
    const projects = this.getProjects();
    const now = new Date().toISOString();
    const projectId = 'proj_' + Math.random().toString(36).substring(2, 10);
    const newProj: ContentProject = {
      id: projectId,
      topicId: data.topicId,
      title: data.title,
      masterDraft: {
        currentRev: 1,
        revisions: [
          {
            rev: 1,
            content: data.masterContent,
            createdAt: now,
            locked: false,
            author: 'user'
          }
        ]
      },
      sources: data.sources || [],
      status: 'in_progress',
      variants: [],
      createdAt: now,
      updatedAt: now
    };
    projects.unshift(newProj);
    this.saveProjects(projects);
    return newProj;
  },
  updateProject(id: string, updates: Partial<ContentProject>): ContentProject | null {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const updated = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
    projects[idx] = updated;
    this.saveProjects(projects);
    return updated;
  },
  updateProjectMasterDraft(
    projectId: string,
    newContent: string,
    author: 'user' | 'gemini' | 'codex' | 'system',
    changeNote?: string
  ): ContentProject | null {
    const proj = this.getProject(projectId);
    if (!proj) return null;
    const currentRev = proj.masterDraft.currentRev;
    const nextRev = currentRev + 1;
    const now = new Date().toISOString();
    const newRevision: MasterDraftRevision = {
      rev: nextRev,
      content: newContent,
      createdAt: now,
      locked: false,
      author,
      changeNote
    };
    // If user edited master copy, mark all existing variant covers as needing review
    const variants = (proj.variants || []).map(v => ({
      ...v,
      covers: (v.covers || []).map(c => ({
        ...c,
        needsReview: author === 'user' ? true : c.needsReview
      }))
    }));

    const updated = this.updateProject(projectId, {
      masterDraft: {
        currentRev: nextRev,
        revisions: [newRevision, ...proj.masterDraft.revisions]
      },
      variants
    });
    return updated;
  },

  // Platform Variants
  addVariant(projectId: string, variant: Omit<PlatformVariant, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>): PlatformVariant {
    const proj = this.getProject(projectId);
    if (!proj) {
      throw new Error(`Target project not found: ${projectId}`);
    }
    const now = new Date().toISOString();
    const newVariant: PlatformVariant = {
      ...variant,
      id: 'var_' + Math.random().toString(36).substring(2, 10),
      projectId,
      createdAt: now,
      updatedAt: now
    };
    const existingVariants = proj.variants || [];
    this.updateProject(projectId, { variants: [...existingVariants, newVariant] });
    return newVariant;
  },
  updateVariant(projectId: string, variantId: string, updates: Partial<PlatformVariant>): PlatformVariant | null {
    const proj = this.getProject(projectId);
    if (!proj) return null;
    const variants = proj.variants || [];
    const idx = variants.findIndex(v => v.id === variantId);
    if (idx === -1) return null;
    const updatedVariant = { ...variants[idx], ...updates, updatedAt: new Date().toISOString() };
    variants[idx] = updatedVariant;
    this.updateProject(projectId, { variants });
    return updatedVariant;
  },
  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    projects.splice(idx, 1);
    this.saveProjects(projects);
    return true;
  },
  deleteVariant(projectId: string, variantId: string): boolean {
    const proj = this.getProject(projectId);
    if (!proj) return false;
    const variants = (proj.variants || []).filter(v => v.id !== variantId);
    this.updateProject(projectId, { variants });
    return true;
  },
  deleteTwitterTweet(projectId: string, variantId: string): boolean {
    const proj = this.getProject(projectId);
    if (!proj) return false;
    const variants = (proj.variants || []).filter(v => v.id !== variantId);
    if (variants.length === 0 && !proj.isLegacyDraft) {
      this.deleteProject(projectId);
    } else {
      this.updateProject(projectId, { variants });
    }
    const records = this.getPublishRecords();
    const filteredRecords = records.filter(r => r.variantId !== variantId);
    if (filteredRecords.length !== records.length) {
      writeJsonFile('publish_records.json', filteredRecords);
    }
    return true;
  },

  // Publish Records (Only user confirmation counts!)
  getPublishRecords(): PublishRecord[] {
    return readJsonFile<PublishRecord[]>('publish_records.json', []);
  },
  confirmPublish(
    projectId: string,
    variantId: string,
    externalUrl?: string
  ): { record: PublishRecord; isNew: boolean } | null {
    const proj = this.getProject(projectId);
    if (!proj) return null;
    const variant = proj.variants?.find(v => v.id === variantId);
    if (!variant) return null;

    const records = this.getPublishRecords();
    
    // Check if already published (idempotent: same variant confirmed twice only counts once!)
    const existing = records.find(r => r.variantId === variantId);
    if (existing) {
      if (externalUrl && !existing.externalUrl) {
        existing.externalUrl = externalUrl;
        writeJsonFile('publish_records.json', records);
      }
      return { record: existing, isNew: false };
    }

    const now = new Date().toISOString();
    const newRecord: PublishRecord = {
      id: 'pub_' + Math.random().toString(36).substring(2, 10),
      projectId,
      variantId,
      platform: variant.platform,
      format: variant.format,
      title: variant.title || proj.title || '未命名内容',
      publishedAt: now,
      confirmedBy: 'user',
      externalUrl
    };

    records.unshift(newRecord);
    writeJsonFile('publish_records.json', records);

    // Update variant status
    this.updateVariant(projectId, variantId, {
      status: 'published',
      publishedAt: now
    });

    return { record: newRecord, isNew: true };
  },

  // Publish Dashboard Stats (PRD 5.1 & 6.2)
  getDashboardPublishStats(dateKey?: string) {
    const today = dateKey || getShanghaiDateKey();
    const settings = this.getSettings();
    const targets = settings.targets || defaultSettings.targets;
    const records = this.getPublishRecords();
    const projects = this.getProjects();
    const topics = this.getTopics();

    // Published today (strictly from user confirmations, Shanghai date check)
    const todayPublished = records.filter(r => {
      const recDate = getShanghaiDateKey(new Date(r.publishedAt));
      return recDate === today;
    });

    // Stats by platform
    const xRecords = todayPublished.filter(r => r.platform === 'x');
    let xPostCount = 0;
    let xThreadPostsCount = 0;
    for (const r of xRecords) {
      const proj = projects.find(p => p.id === r.projectId);
      const v = proj?.variants?.find(v => v.id === r.variantId);
      if (v?.threadPosts && Array.isArray(v.threadPosts) && v.threadPosts.length > 0) {
        xPostCount += v.threadPosts.length;
        xThreadPostsCount += v.threadPosts.length;
      } else {
        xPostCount += 1;
      }
    }

    const platformBreakdown = {
      x: {
        published: xRecords.length,
        target: targets.x,
        original: xRecords.filter(r => r.format === 'short_post' || r.format === 'thread').length,
        quote: xRecords.filter(r => r.format === 'quote').length,
        repost: xRecords.filter(r => r.format === 'repost').length,
        long: xRecords.filter(r => r.format === 'long_article').length,
        postCount: xPostCount,
        threadPosts: xThreadPostsCount,
        totalPosts: xPostCount,
        threadPostCount: xThreadPostsCount
      },
      xiaohongshu: {
        published: todayPublished.filter(r => r.platform === 'xiaohongshu').length,
        target: targets.xiaohongshu
      },
      gzh: {
        published: todayPublished.filter(r => r.platform === 'gzh').length,
        target: targets.gzh
      },
      douyin: {
        published: todayPublished.filter(r => r.platform === 'douyin').length,
        target: targets.douyin
      },
      channels: {
        published: todayPublished.filter(r => r.platform === 'channels').length,
        target: targets.channels
      }
    };

    // Ready to publish, In progress, Overdue
    const allVariants = projects.flatMap(p => p.variants || []);
    const readyVariants = allVariants.filter(v => v.status === 'ready');
    const inProgressProjects = projects.filter(p => p.status === 'in_progress');

    // Topics Breakdown (PRD 5.1 & 12.0)
    // 待做、已做、暂缓、不做 (done != published!)
    const topicsBreakdown = {
      pending: topics.filter(t => t.status === 'pending').length,
      to_do: topics.filter(t => t.status === 'to_do').length,
      in_progress: topics.filter(t => t.status === 'in_progress').length,
      done: topics.filter(t => t.status === 'done').length,
      deferred: topics.filter(t => t.status === 'deferred').length,
      abandoned: topics.filter(t => t.status === 'abandoned').length
    };

    const pipeline = {
      toDoTopics: topicsBreakdown.to_do + topicsBreakdown.pending,
      inProgressTopics: topicsBreakdown.in_progress,
      doneTopics: topicsBreakdown.done,
      readyToPublish: readyVariants.length,
      published: todayPublished.length
    };

    const totalTarget = targets.x + targets.xiaohongshu + targets.gzh + targets.douyin + targets.channels;
    const publishedCount = todayPublished.length;
    const remainingToTarget = Math.max(0, totalTarget - publishedCount);

    const byPlatform = {
      x: { target: targets.x, ready: readyVariants.filter(v => v.platform === 'x').length, published: platformBreakdown.x.published },
      xiaohongshu: { target: targets.xiaohongshu, ready: readyVariants.filter(v => v.platform === 'xiaohongshu').length, published: platformBreakdown.xiaohongshu.published },
      gzh: { target: targets.gzh, ready: readyVariants.filter(v => v.platform === 'gzh').length, published: platformBreakdown.gzh.published },
      douyin: { target: targets.douyin, ready: readyVariants.filter(v => v.platform === 'douyin').length, published: platformBreakdown.douyin.published },
      channels: { target: targets.channels, ready: readyVariants.filter(v => v.platform === 'channels').length, published: platformBreakdown.channels.published }
    };

    return {
      dateKey: today,
      target: totalTarget,
      totalTarget,
      publishedCount,
      publishedToday: publishedCount,
      totalPublishedToday: publishedCount,
      remainingToTarget,
      inProgressCount: inProgressProjects.length,
      readyCount: readyVariants.length,
      readyVariantsCount: readyVariants.length,
      byPlatform,
      platformBreakdown,
      topicsBreakdown,
      pipeline,
      todayPublishedRecords: todayPublished
    };
  },

  // Leads & Commercial Records (PRD 5.5)
  getLeads(): LeadRecord[] {
    return readJsonFile<LeadRecord[]>('leads.json', []);
  },
  addLead(lead: Omit<LeadRecord, 'id' | 'createdAt' | 'updatedAt'>): LeadRecord {
    const list = this.getLeads();
    const now = new Date().toISOString();
    const newLead: LeadRecord = {
      ...lead,
      id: 'lead_' + Math.random().toString(36).substring(2, 10),
      createdAt: now,
      updatedAt: now
    };
    list.unshift(newLead);
    writeJsonFile('leads.json', list);
    return newLead;
  },
  updateLead(id: string, updates: Partial<LeadRecord>): LeadRecord | null {
    const list = this.getLeads();
    const idx = list.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    writeJsonFile('leads.json', list);
    return updated;
  },

  // Benchmark Accounts & Follower Snapshots (PRD 7.6)
  getBenchmarkAccounts(): BenchmarkAccount[] {
    return readJsonFile<BenchmarkAccount[]>('benchmarks.json', []);
  },
  saveBenchmarkAccount(account: BenchmarkAccount): BenchmarkAccount {
    const list = this.getBenchmarkAccounts();
    const idx = list.findIndex(a => a.id === account.id);
    if (idx >= 0) {
      list[idx] = account;
    } else {
      list.push(account);
    }
    writeJsonFile('benchmarks.json', list);
    return account;
  },
  addFollowerSnapshot(
    accountId: string,
    snapshot: Omit<FollowerSnapshot, 'id' | 'observedAt'>
  ): BenchmarkAccount | null {
    const list = this.getBenchmarkAccounts();
    const idx = list.findIndex(a => a.id === accountId);
    if (idx === -1) return null;
    const now = new Date().toISOString();

    const parsed = parseFansCount(snapshot.fansCountRaw || (snapshot.fansCount !== undefined && snapshot.fansCount !== null ? String(snapshot.fansCount) : undefined));
    const finalCount = snapshot.fansCount !== undefined && snapshot.fansCount !== null ? snapshot.fansCount : parsed.count;
    const finalPrecision = snapshot.precision || parsed.precision;

    const newSnapshot: FollowerSnapshot = {
      ...snapshot,
      fansCount: finalCount,
      precision: finalPrecision,
      id: 'snap_' + Math.random().toString(36).substring(2, 10),
      observedAt: now
    };
    const snapshots = list[idx].snapshots || [];
    snapshots.unshift(newSnapshot);
    list[idx].snapshots = snapshots;

    // Preserve latest valid snapshot and follower value on failed/null snapshots
    const latestValid = snapshots.find(s => s.fansCount !== null && s.fansCount !== undefined && !s.error);
    if (latestValid) {
      list[idx].latestSnapshot = latestValid;
      list[idx].fansCount = latestValid.fansCountRaw || String(latestValid.fansCount);
    } else {
      list[idx].latestSnapshot = newSnapshot;
    }

    writeJsonFile('benchmarks.json', list);
    return list[idx];
  },

  // Article Sources & Deconstructions (PRD 7.5 & 7.7)
  getSources(): ArticleSource[] {
    return readJsonFile<ArticleSource[]>('sources.json', []);
  },
  addSource(source: Omit<ArticleSource, 'id' | 'capturedAt' | 'deconstructions'>): ArticleSource {
    const list = this.getSources();
    let readability = source.readabilityStatus || 'link_only';
    if (!source.rawMarkdown || !source.rawMarkdown.trim()) {
      readability = 'link_only';
    }
    const rawText = source.rawMarkdown || '';
    const hash = crypto.createHash('sha256').update(rawText).digest('hex').substring(0, 16);
    const now = new Date().toISOString();

    // Safe matching: Require non-empty URL or non-empty canonicalId (never match undefined === undefined)
    const hasUrl = !!(source.url && source.url.trim());
    const hasCanonical = !!(source.canonicalId && source.canonicalId.trim());

    let existing: ArticleSource | undefined = undefined;
    if (hasUrl || hasCanonical) {
      existing = list.find(s =>
        (hasUrl && s.url && s.url.trim() === source.url.trim()) ||
        (hasCanonical && s.canonicalId && s.canonicalId.trim() === source.canonicalId.trim())
      );
    }

    if (existing) {
      if (!existing.versions || existing.versions.length === 0) {
        const origHash = crypto.createHash('sha256').update(existing.rawMarkdown || '').digest('hex').substring(0, 16);
        const origVerId = 'ver_' + Math.random().toString(36).substring(2, 10);
        existing.versions = [{
          versionId: origVerId,
          rawText: existing.rawMarkdown || '',
          contentHash: origHash,
          capturedAt: existing.capturedAt || now,
          method: 'manual',
          readabilityStatus: existing.readabilityStatus || 'full',
          source: existing.url
        }];
        existing.currentVersionId = origVerId;
        existing.currentContentHash = origHash;
        existing.firstCapturedAt = existing.capturedAt || now;
      }

      if (rawText && rawText.trim() && rawText !== existing.rawMarkdown) {
        const newVerId = 'ver_' + Math.random().toString(36).substring(2, 10);
        const newVersion: SourceCaptureVersion = {
          versionId: newVerId,
          rawText,
          contentHash: hash,
          capturedAt: now,
          method: source.bookmarkReason?.includes('TikHub') ? 'tikhub' : 'manual',
          readabilityStatus: source.readabilityStatus || (rawText.trim() ? 'full' : 'link_only'),
          source: source.url || existing.url
        };
        existing.versions.unshift(newVersion);
        existing.rawMarkdown = rawText;
        existing.currentVersionId = newVerId;
        existing.currentContentHash = hash;
        existing.readabilityStatus = newVersion.readabilityStatus;
        existing.latestCapturedAt = now;
        existing.capturedAt = now;
        if (source.author && source.author !== '未知作者') {
          existing.author = source.author;
        }
        if (source.title && !existing.title) {
          existing.title = source.title;
        }
      } else if (!existing.rawMarkdown || !existing.rawMarkdown.trim()) {
        existing.readabilityStatus = 'link_only';
      }
      writeJsonFile('sources.json', list);
      return existing;
    }

    const verId = 'ver_' + Math.random().toString(36).substring(2, 10);
    const firstVersion: SourceCaptureVersion = {
      versionId: verId,
      rawText,
      contentHash: hash,
      capturedAt: now,
      method: source.bookmarkReason?.includes('TikHub') ? 'tikhub' : 'manual',
      readabilityStatus: readability,
      source: source.url
    };

    const newSource: ArticleSource = {
      ...source,
      readabilityStatus: readability,
      id: 'src_' + Math.random().toString(36).substring(2, 10),
      capturedAt: now,
      firstCapturedAt: now,
      latestCapturedAt: now,
      currentVersionId: verId,
      currentContentHash: hash,
      versions: [firstVersion],
      deconstructions: []
    };
    list.unshift(newSource);
    writeJsonFile('sources.json', list);
    return newSource;
  },
  addDeconstruction(sourceId: string, deconstruction: Omit<ArticleDeconstruction, 'id' | 'createdAt'>): ArticleDeconstruction | null {
    const list = this.getSources();
    const idx = list.findIndex(s => s.id === sourceId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const s = list[idx];
    const newDecon: ArticleDeconstruction = {
      ...deconstruction,
      id: 'decon_' + Math.random().toString(36).substring(2, 10),
      sourceVersionId: s.currentVersionId || s.versions?.[0]?.versionId,
      sourceContentHash: s.currentContentHash || s.versions?.[0]?.contentHash,
      createdAt: now
    };
    list[idx].deconstructions.unshift(newDecon);
    writeJsonFile('sources.json', list);
    return newDecon;
  },

  // Skills Registry (PRD 9.0)
  getSkills(): RegisteredSkill[] {
    return readJsonFile<RegisteredSkill[]>('skills.json', defaultSkills);
  },
  registerSkill(skill: RegisteredSkill): RegisteredSkill {
    const list = this.getSkills();
    const idx = list.findIndex(s => s.skillId === skill.skillId);
    if (idx >= 0) {
      list[idx] = skill;
    } else {
      list.push(skill);
    }
    writeJsonFile('skills.json', list);
    return skill;
  },

  // Persona
  getPersona(): PersonaProfile {
    return readJsonFile<PersonaProfile>('persona.json', defaultPersona);
  },
  updatePersona(updates: Partial<PersonaProfile>): PersonaProfile {
    const current = this.getPersona();
    const updated = { ...current, ...updates };
    writeJsonFile('persona.json', updated);
    return updated;
  },

  // Legacy Posts & KPI methods for existing views
  getPosts(): Post[] {
    return readJsonFile<Post[]>('posts.json', []);
  },
  savePosts(posts: Post[]): void {
    writeJsonFile('posts.json', posts);
  },
  addPost(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Post {
    const posts = this.getPosts();
    const now = new Date().toISOString();
    const newPost: Post = {
      ...post,
      id: 'post_' + Math.random().toString(36).substring(2, 10),
      createdAt: now,
      updatedAt: now
    };
    posts.unshift(newPost);
    this.savePosts(posts);
    return newPost;
  },
  updatePost(id: string, updates: Partial<Post>): Post | null {
    const posts = this.getPosts();
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) return null;
    const updated = { ...posts[index], ...updates, updatedAt: new Date().toISOString() };
    posts[index] = updated;
    this.savePosts(posts);
    return updated;
  },
  deletePost(id: string): boolean {
    const posts = this.getPosts();
    const filtered = posts.filter(p => p.id !== id);
    if (filtered.length !== posts.length) {
      this.savePosts(filtered);
      return true;
    }
    return false;
  },

  getDataDir(): string {
    return getDataDir();
  },

  getShanghaiDateKey(date?: Date): string {
    return getShanghaiDateKey(date);
  },

  getMatrixPacks(): MatrixPack[] {
    return readJsonFile<MatrixPack[]>('matrix_packs.json', []);
  },
  getMatrixPack(id: string): MatrixPack | null {
    const packs = this.getMatrixPacks();
    return packs.find(p => p.id === id) || null;
  },
  saveMatrixPack(pack: MatrixPack): void {
    const packs = this.getMatrixPacks();
    const idx = packs.findIndex(p => p.id === pack.id);
    if (idx >= 0) {
      packs[idx] = pack;
    } else {
      packs.unshift(pack);
    }
    writeJsonFile('matrix_packs.json', packs);
  },

  // Backup & Restore (PRD 10.2 & 13 UC-24, full recursive asset backup)
  createBackup(): { success: boolean; backupPath: string; backupDir: string; timestamp: string; files: string[] } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataDir = getDataDir();
    const backupDir = path.resolve(dataDir, '..', 'backups', `snapshot-${timestamp}`);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    copyDirRecursive(dataDir, backupDir);
    const files = fs.readdirSync(backupDir);
    return { success: true, backupPath: backupDir, backupDir, timestamp, files };
  },
  restoreBackup(backupTimestamp: string): { success: boolean; restoredDir: string; files: string[] } {
    const dataDir = getDataDir();
    let backupDir = path.resolve(dataDir, '..', 'backups', `snapshot-${backupTimestamp}`);
    if (!fs.existsSync(backupDir)) {
      backupDir = path.resolve(dataDir, '..', 'backups', backupTimestamp);
    }
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup snapshot not found: ${backupDir}`);
    }
    copyDirRecursive(backupDir, dataDir);
    const files = fs.readdirSync(dataDir);
    return { success: true, restoredDir: dataDir, files };
  }
};

const defaultPersona: PersonaProfile = {
  name: '小P出海日记',
  bio: '00后杭州跨境创业者，真实真诚、实操派、杜绝一切虚假鸡血',
  toneStyle: '自然连贯段落（2~3句一段）、零句号、零破折号、大白话实操、客观清醒',
  vocabularyTraits: ['实操', '闭环', '跑通', '算清成本', '踩坑记录', '放平心态'],
  structureHabits: [
    '黄金前3秒：用真实场景或具体数据痛点切入',
    '段落严格控制在2~3句一段，移动端视线极其舒适',
    '核心干货用序号或动作拆解',
    '结尾真诚交流，不灌鸡汤'
  ],
  punctuationEmojiHabits: '绝对零句号，绝对零破折号，善用逗号、感叹号、省略号与空行',
  openingStyle: '真实客观事实切入，先亮踩坑经历或数据',
  closingStyle: '真诚留问引发讨论，固定签名小P出海日记',
  systemPromptTemplate: `你是一个具备百万网感的实操创作者。严格遵守以下铁律：
1. 绝对没有句号（无 。），绝对没有破折号（无 —— / —）；
2. 段落连贯自然（2~3句一段），不碎成一行一句；
3. 严禁翻案腔（不是...而是...、看似...实则...），严禁空转冒号，第一人称“我”；
4. 真实、克制、具体到细节与动作。`,
  historicalSamples: []
};

const defaultSkills: RegisteredSkill[] = [
  {
    skillId: 'content-publishing-os',
    name: 'Content Publishing OS',
    path: '/Users/liangxiaoling/Documents/Playground/.codex/skills/content-publishing-os/SKILL.md',
    purpose: '来源、母稿、平台版本、发布包与真实发布状态契约',
    executionParty: 'gemini',
    verificationStatus: 'verified',
    supportedRatios: ['1:1', '3:4', '16:9', '2.35:1', '9:16'],
    allowsCopyModification: true,
    costPath: 'subscription_quota'
  },
  {
    skillId: 'imagegen',
    name: 'ImageGen (Codex Native)',
    path: '/Users/liangxiaoling/.codex/skills/.system/imagegen/SKILL.md',
    purpose: 'Codex 官方原生图片生成与编辑',
    executionParty: 'codex',
    verificationStatus: 'verified',
    supportedRatios: ['1:1', '3:4', '16:9', '9:16', '2.35:1'],
    allowsCopyModification: false,
    costPath: 'subscription_quota'
  },
  {
    skillId: 'gzh-design',
    name: 'GZH Design (公众号排版)',
    path: '/Users/liangxiaoling/.codex/skills/gzh-design/SKILL.md',
    purpose: '公众号文章正文 HTML 格式化与样式校验',
    executionParty: 'local_script',
    verificationStatus: 'verified',
    supportedRatios: ['2.35:1', '1:1'],
    allowsCopyModification: false,
    costPath: 'local_free'
  },
  {
    skillId: 'punk-cover',
    name: 'Punk Cover',
    path: '/Users/liangxiaoling/Downloads/个人内容工作台/.agents/skills/punk-cover/SKILL.md',
    purpose: '商业杂志头版大字报、多比例社交媒体封面设计与可复用提示词',
    executionParty: 'codex',
    verificationStatus: 'verified',
    supportedRatios: ['3:4', '16:9', '2.35:1', '1:1', '9:16'],
    allowsCopyModification: false,
    costPath: 'subscription_quota'
  },
  {
    skillId: 'punk-ip-video-cover',
    name: 'Punk IP Video Cover',
    path: '/Users/liangxiaoling/Downloads/个人内容工作台/.agents/skills/punk-ip-video-cover/SKILL.md',
    purpose: '从照片提取4色配色、真人抠图、视频号横竖双封面、小红书/抖音视频封面',
    executionParty: 'codex',
    verificationStatus: 'verified',
    supportedRatios: ['9:16', '16:9', '3:4', '4:3'],
    allowsCopyModification: false,
    costPath: 'subscription_quota'
  },
  {
    skillId: 'baoyu-xhs-images',
    name: 'Baoyu XHS Images',
    path: '/Users/liangxiaoling/.codex/skills/baoyu-xhs-images/SKILL.md',
    purpose: '小红书多页图文：分页、构图、视觉风格与真实图片规划',
    executionParty: 'codex',
    verificationStatus: 'verified',
    supportedRatios: ['3:4'],
    allowsCopyModification: false,
    costPath: 'subscription_quota'
  },
  {
    skillId: 'xhs-note-creator',
    name: 'XHS Note Creator (Local Template)',
    path: '/Users/liangxiaoling/.codex/skills/xhs-note-creator/SKILL.md',
    purpose: '小红书本地模板图文渲染与标题公式',
    executionParty: 'local_script',
    verificationStatus: 'verified',
    supportedRatios: ['3:4'],
    allowsCopyModification: false,
    costPath: 'local_free'
  },
  {
    skillId: 'lieflat-less-ai-tone',
    name: 'Lieflat Less AI Tone (去AI味)',
    path: '/Users/liangxiaoling/.agents/skills/lieflat-less-ai-tone/SKILL.md',
    purpose: '11 条显式白名单规则识别并改写写作中的 AI 痕迹，保留事实与框架',
    executionParty: 'gemini',
    verificationStatus: 'verified',
    supportedRatios: [],
    allowsCopyModification: true,
    costPath: 'subscription_quota'
  }
];
