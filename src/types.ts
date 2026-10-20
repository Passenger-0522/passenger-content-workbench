export interface PlatformTargets {
  x: number;
  xiaohongshu: number;
  gzh: number;
  douyin: number;
  channels: number;
}

export interface Settings {
  geminiApiKey?: string;
  geminiBaseUrl: string;
  geminiModel: string;
  tikhubApiKey?: string;
  tikhubBaseUrl: string;
  dailyKpiTarget: number;
  niche: string;
  targets?: PlatformTargets;
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

export type TopicStatus =
  | 'pending'
  | 'to_do'
  | 'in_progress'
  | 'done'
  | 'deferred'
  | 'abandoned'
  | 'accepted'
  | 'rejected'
  | 'outline_ready'
  | 'generated';

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
  projectId?: string;
  sourceId?: string;
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

export interface HistoricalSample {
  id: string;
  title: string;
  content: string;
  likesOrStats?: string;
  date?: string;
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
  historicalSamples: HistoricalSample[];
}

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

export interface TrendingItem {
  id: string;
  keyword: string;
  hotScore: number | string;
  platform: 'douyin' | 'xiaohongshu' | 'weibo' | 'tiktok';
  category: string;
  desc?: string;
}

export interface KpiStats {
  dateKey: string;
  target: number;
  completedCount: number;
  remainingCount: number;
  completionRate: number;
  posts: Post[];
}

export interface LessAiToneReport {
  rulesChecked: number;
  originalWordCount: number;
  newWordCount: number;
  appliedTone: string;
}

export interface CoverDesign {
  id: string;
  name: string;
  ratio: string;
  headline: string;
  subheadline: string;
  visualPrompt: string;
  layoutNotes: string;
}

export interface CarouselCard {
  pageIndex: number;
  pageType: 'cover' | 'pain_point' | 'core_steps' | 'takeaway' | 'summary_cta';
  title: string;
  bulletPoints: string[];
  visualPrompt?: string;
}

export interface PlatformMaterial {
  platform: 'wechatArticle' | 'wechatChannels' | 'douyin' | 'xiaohongshu' | 'twitter';
  platformName: string;
  primaryFormat: 'video' | 'image_text' | 'pure_text' | 'article';
  title: string;
  candidateTitles: string[];
  content: string;
  secondaryContent?: string;
  tags: string[];
  covers: CoverDesign[];
  cards?: CarouselCard[];
  platformTips: string;
}

export interface MatrixPack {
  id: string;
  sourceTitle: string;
  sourceContent: string;
  postId?: string;
  createdAt: string;
  updatedAt: string;
  platforms: {
    wechatArticle: PlatformMaterial;
    wechatChannels: PlatformMaterial;
    douyin: PlatformMaterial;
    xiaohongshu: PlatformMaterial;
    twitter: PlatformMaterial;
  };
}

// ==========================================
// PRD v1.2 New Models
// ==========================================

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

export interface PlatformVariant {
  id: string;
  projectId: string;
  platform: PlatformType;
  format: VariantFormat;
  title: string;
  candidateTitles: string[];
  content: string;
  cardTexts?: string[];
  tags: string[];
  covers: VariantCover[];
  threadPosts?: string[];
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

export interface DashboardPublishStats {
  dateKey: string;
  target: number;
  inProgressCount: number;
  readyCount: number;
  publishedCount: number;
  remainingToTarget: number;
  byPlatform: Record<PlatformType, { target: number; ready: number; published: number }>;
}

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

export interface FollowerSnapshot {
  id: string;
  fansCountRaw: string;
  fansCount: number | null;
  precision: 'exact' | 'approximate' | 'unknown' | 'error';
  observedAt: string;
  source: 'manual' | 'tikhub' | 'tikhub_api' | 'import';
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
  platform: PlatformType | 'all' | 'douyin' | 'xiaohongshu' | 'channels' | 'twitter';
  handleOrId?: string;
  profileUrl?: string;
  contentDirection?: string;
  whyBenchmark?: string;
  watchLevel?: 'high' | 'normal' | 'low';
  fansCount: string;
  snapshots?: FollowerSnapshot[];
  latestSnapshot?: FollowerSnapshot;
  earliestSampleTime?: string;
  earliestSampleDate?: string;
  verifiedAccountCreationDate?: string;
  isLegacyUnverified?: boolean;
  geminiReportNotes?: string;
  medianEngagement: number;
  worksCount: number;
  viralCount: number;
  lastSyncedAt: string;
  trendData: number[];
  works?: BenchmarkWork[];
}

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

export interface ImportReceipt {
  importId: string;
  receiptId?: string;
  taskId?: string;
  projectId?: string;
  status: 'imported' | 'rejected' | 'conflict_preserved' | 'success' | 'partial' | string;
  importedAt?: string;
  receivedAt?: string;
  sourceDir?: string;
  createdVariantIds?: string[];
  createdAssetIds?: string[];
  assetsAdded?: number;
  executionParty?: string;
  skillId?: string;
  costPath?: string;
  quotaStatus?: string;
  copyUnchanged?: boolean;
  conflictDetails?: string;
  conflict?: any;
  warnings?: string[];
}

export interface TwitterTweetItem {
  id: string; // variantId
  projectId: string;
  projectTitle: string;
  variantId: string;
  format: 'short_post' | 'thread' | 'quote' | 'long_article';
  title: string;
  content: string;
  threadPosts?: string[];
  tags: string[];
  covers: VariantCover[];
  status: 'draft' | 'ready' | 'published';
  plannedPublishDate?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  isSyncedFromProject: boolean;
  masterDraftSnippet?: string;
}
