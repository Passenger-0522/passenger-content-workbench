import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { db, Topic, Post, parseFansCount, getDataDir } from './db.js';
import {
  fetchTikHubTrends,
  getSchedulerState,
  saveSchedulerState,
  runDailyScheduledSearch,
  checkSchedulerTick,
  getSearchTraces
} from './services/tikhub.js';
import {
  checkFfmpegAvailability,
  composeImagesToVideo,
  getFfmpegPath,
  validateVideoIntegrity
} from './services/video.js';
import {
  generateTopicsFromTrends,
  generateOutlinesForTopic,
  extractPersonaFromSamples,
  generatePostWithPersona,
  polishPostContent
} from './services/gemini.js';
import { cleanWithLessAiTone, getSkillDocument } from './services/lessAiTone.js';
import { generateMatrixPack } from './services/matrix.js';
import { handoffService, inspectImageDimensions } from './services/handoff.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

function isLoopbackHostHeader(host?: string): boolean {
  if (!host) return false;
  return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host);
}

function isLoopbackAddress(ip?: string): boolean {
  if (!ip) return false;
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

// Strict loopback-only CORS, Host and Origin check (PRD Boundary & Codex Round 3)
app.use((req, res, next) => {
  const host = req.headers.host;
  const remoteIp = req.socket?.remoteAddress;

  if (!isLoopbackHostHeader(host) || !isLoopbackAddress(remoteIp)) {
    return res.status(403).json({ error: 'Forbidden: loopback connection and valid loopback host required' });
  }

  const origin = req.headers.origin;
  if (origin) {
    const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
    if (!isLoopback) {
      return res.status(403).json({ error: 'CORS forbidden: untrusted web origin cannot access API' });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-workbench-token');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));

// Local write API authentication & loopback session handshake (PRD 11.3 & Extended Review Point 5)
const LOCAL_SESSION_TOKEN = process.env.WORKBENCH_SESSION_TOKEN || crypto.randomBytes(32).toString('hex');

function isAuthorizedToken(headerValue?: string): boolean {
  if (!headerValue || typeof headerValue !== 'string') return false;
  const token = headerValue.startsWith('Bearer ') ? headerValue.slice(7).trim() : headerValue.trim();
  if (!token) return false;
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(LOCAL_SESSION_TOKEN);
  if (tokenBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, secretBuf);
}

app.get('/api/auth/token', (req, res) => {
  const remoteIp = req.socket?.remoteAddress;
  const host = req.headers.host;
  if (!isLoopbackHostHeader(host) || !isLoopbackAddress(remoteIp)) {
    return res.status(403).json({ error: 'Forbidden: token handshake is loopback-only' });
  }
  res.json({ token: LOCAL_SESSION_TOKEN, loopbackOnly: true });
});

app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const authHeader = (req.headers['x-workbench-token'] as string) || (req.headers['authorization'] as string);
    if (!isAuthorizedToken(authHeader)) {
      return res.status(401).json({ error: 'Unauthorized: local write API requires valid authentication token' });
    }
  }
  next();
});

// Safe asset serving from data/incoming with path traversal and symlink escape defense
app.use('/api/assets/incoming', (req, res) => {
  const incomingDir = path.resolve(db.getDataDir ? db.getDataDir() : path.resolve(process.cwd(), 'data'), 'incoming');
  const safePath = path.resolve(incomingDir, '.' + req.path);
  if (!safePath.startsWith(incomingDir + path.sep) && safePath !== incomingDir) {
    return res.status(403).send('Forbidden: path traversal');
  }
  if (!fs.existsSync(safePath)) {
    return res.status(404).send('Asset not found');
  }
  try {
    const realIncoming = fs.realpathSync(incomingDir);
    const realTarget = fs.realpathSync(safePath);
    if (!realTarget.startsWith(realIncoming + path.sep) && realTarget !== realIncoming) {
      return res.status(403).send('Forbidden: symlink escape');
    }
  } catch (_) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(safePath);
});

// Safe asset serving for synthesized media with symlink escape defense
app.use('/api/assets/synthesized', (req, res) => {
  const synthDir = path.resolve(db.getDataDir(), 'media', 'synthesized');
  const safePath = path.resolve(synthDir, '.' + req.path);
  if (!safePath.startsWith(synthDir + path.sep) && safePath !== synthDir) {
    return res.status(403).send('Forbidden: path traversal');
  }
  if (!fs.existsSync(safePath)) {
    return res.status(404).send('Asset not found');
  }
  try {
    const realSynth = fs.realpathSync(synthDir);
    const realTarget = fs.realpathSync(safePath);
    if (!realTarget.startsWith(realSynth + path.sep) && realTarget !== realSynth) {
      return res.status(403).send('Forbidden: symlink escape');
    }
  } catch (_) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(safePath);
});

// Safe asset serving for uploaded media with symlink escape defense
app.use('/api/assets/uploads', (req, res) => {
  const uploadsDir = path.resolve(db.getDataDir(), 'media', 'uploads');
  const safePath = path.resolve(uploadsDir, '.' + req.path);
  if (!safePath.startsWith(uploadsDir + path.sep) && safePath !== uploadsDir) {
    return res.status(403).send('Forbidden: path traversal');
  }
  if (!fs.existsSync(safePath)) {
    return res.status(404).send('Asset not found');
  }
  try {
    const realUploads = fs.realpathSync(uploadsDir);
    const realTarget = fs.realpathSync(safePath);
    if (!realTarget.startsWith(realUploads + path.sep) && realTarget !== realUploads) {
      return res.status(403).send('Forbidden: symlink escape');
    }
  } catch (_) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(safePath);
});

// Media upload endpoint with integrity validation
app.post('/api/media/upload', (req, res) => {
  try {
    const filename = req.body.filename;
    const data = req.body.data || req.body.base64Data;
    const type = req.body.type;
    if (!filename || !data) {
      return res.status(400).json({ error: 'filename 和 data (Base64) 不能为空' });
    }

    const uploadsDir = path.resolve(db.getDataDir(), 'media', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const safeBaseName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeBaseName).toLowerCase();
    const assetId = 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const targetFileName = `${assetId}_${safeBaseName}`;
    const targetFilePath = path.join(uploadsDir, targetFileName);

    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    const buf = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(targetFilePath, buf);

    const isVid = type === 'video' || ['.mp4', '.mov', '.webm', '.mkv'].includes(ext);
    if (isVid) {
      const integrity = validateVideoIntegrity(targetFilePath);
      if (!integrity.valid) {
        try { fs.unlinkSync(targetFilePath); } catch (_) {}
        return res.status(400).json({ error: integrity.error || '视频文件损坏或格式无效' });
      }
      return res.json({
        success: true,
        assetId,
        filename: targetFileName,
        url: `/api/assets/uploads/${targetFileName}`,
        path: targetFilePath,
        type: 'video',
        size: buf.length
      });
    } else {
      const dim = inspectImageDimensions(targetFilePath);
      if (!dim.valid) {
        try { fs.unlinkSync(targetFilePath); } catch (_) {}
        return res.status(400).json({ error: '图片文件损坏或不是有效图片格式' });
      }
      return res.json({
        success: true,
        assetId,
        filename: targetFileName,
        url: `/api/assets/uploads/${targetFileName}`,
        path: targetFilePath,
        type: 'image',
        width: dim.width,
        height: dim.height,
        ratio: `${dim.width}:${dim.height}`,
        size: buf.length
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || '上传处理失败' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.2.0',
    time: new Date().toISOString(),
    loopbackOnly: true
  });
});

// ==========================================
// 1. Settings (Credentials strictly masked per PRD)
// ==========================================
app.get('/api/settings', (req, res) => {
  // Settings API must NEVER return plain credentials!
  res.json(db.getPublicSettings());
});

app.post('/api/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// ==========================================
// 2. Chat Capture (workbench-capture protocol)
// ==========================================
app.post('/api/capture', (req, res) => {
  try {
    const { rawInput, title, sourceUrl, platform } = req.body;
    if (!rawInput || !rawInput.trim()) {
      return res.status(400).json({ error: '原始输入内容不能为空' });
    }
    const result = handoffService.captureChatInput(rawInput, { title, sourceUrl, platform });
    res.json({
      success: true,
      receipt: result.receipt,
      topic: result.topic,
      project: result.project
    });
  } catch (err: any) {
    console.error('Chat capture error:', err);
    res.status(500).json({ error: err.message || '对话捕获入库失败' });
  }
});

// ==========================================
// 3. Double-Client Handoff Tasks & Incoming
// ==========================================
app.post('/api/handoff/export', (req, res) => {
  try {
    const { projectId, taskType, executionParty, targetPlatform, visualRequirements, references } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId 不能为空' });
    }
    const exported = handoffService.exportTask({
      projectId,
      taskType: taskType || 'image_generation',
      executionParty: executionParty || 'codex',
      targetPlatform,
      visualRequirements,
      references
    });
    res.json({ success: true, ...exported });
  } catch (err: any) {
    console.error('Handoff export error:', err);
    res.status(500).json({ error: err.message || '导出交接任务失败' });
  }
});

app.get('/api/handoff/pending', (req, res) => {
  const pending = handoffService.scanPendingIncoming();
  res.json({ count: pending.length, pendingImportIds: pending });
});

app.post('/api/handoff/import/:importId', (req, res) => {
  try {
    const receipt = handoffService.importIncoming(req.params.importId);
    res.json({ success: true, receipt });
  } catch (err: any) {
    console.error('Handoff import error:', err);
    res.status(500).json({ error: err.message || '导入外部产物包失败' });
  }
});

app.get('/api/receipts', (req, res) => {
  res.json(handoffService.getAllReceipts());
});

app.get('/api/receipts/:importId', (req, res) => {
  const receiptFile = path.resolve(getDataDir(), 'receipts', `${req.params.importId}.json`);
  if (!fs.existsSync(receiptFile)) {
    return res.status(404).json({ error: '回执不存在' });
  }
  const content = JSON.parse(fs.readFileSync(receiptFile, 'utf-8'));
  res.json(content);
});

// ==========================================
// 4. Content Projects & Platform Variants (PRD v1.2)
// ==========================================
app.get('/api/projects', (req, res) => {
  res.json(db.getProjects());
});

app.get('/api/projects/:id', (req, res) => {
  const proj = db.getProject(req.params.id);
  if (!proj) return res.status(404).json({ error: '项目不存在' });
  res.json(proj);
});

app.post('/api/projects', (req, res) => {
  const { title, masterContent, topicId, sources } = req.body;
  if (!title || !masterContent) {
    return res.status(400).json({ error: '标题与母稿正文不能为空' });
  }
  const created = db.addProject({ title, masterContent, topicId, sources });
  res.json(created);
});

app.patch('/api/projects/:id', (req, res) => {
  const updated = db.updateProject(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '项目不存在' });
  res.json(updated);
});

app.delete('/api/projects/:id', (req, res) => {
  const ok = db.deleteProject(req.params.id);
  if (!ok) return res.status(404).json({ error: '项目不存在' });
  res.json({ success: true, message: '项目已删除' });
});

app.post('/api/projects/:id/revisions', (req, res) => {
  const { content, author = 'user', changeNote } = req.body;
  if (!content) return res.status(400).json({ error: '正文内容不能为空' });
  const updated = db.updateProjectMasterDraft(req.params.id, content, author, changeNote);
  if (!updated) return res.status(404).json({ error: '项目不存在' });
  res.json(updated);
});

app.post('/api/projects/:id/lock', (req, res) => {
  const proj = db.getProject(req.params.id);
  if (!proj) return res.status(404).json({ error: '项目不存在' });
  const locked = req.body.locked !== false;
  const revisions = proj.masterDraft.revisions.map((r, idx) => idx === 0 ? { ...r, locked } : r);
  const updated = db.updateProject(req.params.id, {
    masterDraft: {
      ...proj.masterDraft,
      revisions
    }
  });
  res.json({ success: true, locked, project: updated });
});

app.post('/api/projects/:id/variants', (req, res) => {
  const proj = db.getProject(req.params.id);
  if (!proj) return res.status(404).json({ error: '目标项目不存在' });

  const targetFormat = req.body.format || 'image_text';
  const targetCovers = req.body.covers || [];
  let targetStatus = req.body.status || 'draft';

  if (targetStatus === 'ready') {
    const missing: string[] = [];
    if (targetFormat === 'image_text') {
      const validCovers = targetCovers.filter((c: any) => c.verifiedOnDisk || c.url);
      if (validCovers.length === 0) {
        missing.push('covers');
      }
    } else if (targetFormat === 'video') {
      const validCovers = targetCovers.filter((c: any) => c.verifiedOnDisk || c.url);
      if (validCovers.length === 0) {
        missing.push('covers');
      }
      if (!req.body.videoUrl && !req.body.videoPath) {
        missing.push('video');
      }
    }
    if (missing.length > 0) {
      // 未齐套版本自动保持草稿/制作中，不冒充已完成完整发布包
      targetStatus = 'draft';
    }
  }

  try {
    const variant = db.addVariant(req.params.id, { ...req.body, status: targetStatus });
    res.json(variant);
  } catch (err: any) {
    res.status(404).json({ error: err.message || '目标项目不存在' });
  }
});

app.get('/api/projects/:id/variants/:variantId', (req, res) => {
  const proj = db.getProject(req.params.id);
  if (!proj) return res.status(404).json({ error: '项目不存在' });
  const variant = proj.variants?.find(v => v.id === req.params.variantId);
  if (!variant) return res.status(404).json({ error: '版本不存在' });
  res.json(variant);
});

app.patch('/api/projects/:id/variants/:variantId', (req, res) => {
  const proj = db.getProject(req.params.id);
  if (!proj) return res.status(404).json({ error: '项目不存在' });
  const variant = proj.variants?.find(v => v.id === req.params.variantId);
  if (!variant) return res.status(404).json({ error: '版本不存在' });

  const targetFormat = req.body.format || variant.format;
  const targetCovers = req.body.covers !== undefined ? req.body.covers : (variant.covers || []);
  const targetStatus = req.body.status;

  if (targetStatus === 'ready') {
    const missing: string[] = [];
    if (targetFormat === 'image_text') {
      const validCovers = targetCovers.filter((c: any) => c.verifiedOnDisk || c.url);
      if (validCovers.length === 0) {
        missing.push('covers');
      }
    } else if (targetFormat === 'video') {
      const validCovers = targetCovers.filter((c: any) => c.verifiedOnDisk || c.url);
      if (validCovers.length === 0) {
        missing.push('covers');
      }
      const hasVideo = req.body.videoUrl || req.body.videoPath || variant.videoUrl || variant.videoPath;
      if (!hasVideo) {
        missing.push('video');
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({
        error: `变体尚未齐套，无法标记为已就绪 (ready)：缺少必要素材 [${missing.join(', ')}]`,
        missing,
        status: variant.status
      });
    }
  }

  const updated = db.updateVariant(req.params.id, req.params.variantId, req.body);
  if (!updated) return res.status(404).json({ error: '版本不存在' });
  res.json(updated);
});

// ==========================================
// 5. Publishing Confirmation & Dashboard Stats
// ==========================================
app.post('/api/publish/confirm', (req, res) => {
  const { projectId, variantId, externalUrl } = req.body;
  if (!projectId || !variantId) {
    return res.status(400).json({ error: 'projectId 和 variantId 不能为空' });
  }
  const result = db.confirmPublish(projectId, variantId, externalUrl);
  if (!result) {
    return res.status(404).json({ error: '项目或版本不存在，无法确认发布' });
  }
  res.json({ success: true, ...result });
});

app.get('/api/publish/dashboard', (req, res) => {
  const dateKey = req.query.dateKey as string;
  const stats = db.getDashboardPublishStats(dateKey);
  res.json(stats);
});

app.get('/api/publish/records', (req, res) => {
  res.json(db.getPublishRecords());
});

// ==========================================
// 5.5. Dedicated Twitter (X) Studio (Daily 15-20 Posts Engine)
// ==========================================
app.get('/api/twitter/tweets', (req, res) => {
  const projects = db.getProjects();
  const tweets: any[] = [];

  for (const p of projects) {
    const xVariants = (p.variants || []).filter(v => v.platform === 'x');
    for (const v of xVariants) {
      tweets.push({
        id: v.id,
        projectId: p.id,
        projectTitle: p.title,
        variantId: v.id,
        format: v.format || 'short_post',
        title: v.title || p.title,
        content: v.content || '',
        threadPosts: v.threadPosts || [],
        tags: v.tags || [],
        covers: v.covers || [],
        status: v.status || 'draft',
        plannedPublishDate: v.plannedPublishDate || '',
        publishedAt: v.publishedAt || '',
        createdAt: v.createdAt || p.createdAt,
        updatedAt: v.updatedAt || p.updatedAt,
        notes: v.notes || '',
        isSyncedFromProject: Boolean(p.isLegacyDraft || (p.variants && p.variants.length > 1)),
        masterDraftSnippet: p.masterDraft?.revisions?.[0]?.content?.slice(0, 200) || ''
      });
    }
  }

  tweets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(tweets);
});

app.post('/api/twitter/tweets', (req, res) => {
  try {
    const {
      content,
      format = 'short_post',
      threadPosts,
      tags = ['思考'],
      status = 'draft',
      plannedPublishDate,
      quoteUrl
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '推文内容不能为空' });
    }

    const cleanContent = content.trim();
    const cleanTitle = cleanContent.split('\n')[0].replace(/^[#\s]+/, '').slice(0, 30) || '推特内容';
    const todayStr = db.getShanghaiDateKey();

    const project = db.addProject({
      title: `[X] ${cleanTitle}`,
      masterContent: cleanContent
    });

    const variant = db.addVariant(project.id, {
      platform: 'x',
      format,
      title: cleanTitle,
      candidateTitles: [cleanTitle],
      content: cleanContent,
      threadPosts: threadPosts || (format === 'thread' ? cleanContent.split('\n\n').filter(Boolean) : undefined),
      tags,
      covers: [],
      status: status === 'ready' ? 'ready' : (status === 'published' ? 'published' : 'draft'),
      plannedPublishDate: plannedPublishDate || todayStr,
      notes: quoteUrl ? `引用链接: ${quoteUrl}` : '推特工作台原生独立创作'
    });

    if (status === 'published') {
      db.confirmPublish(project.id, variant.id);
    }

    res.json({ success: true, project, variant });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '创建推文失败' });
  }
});

app.patch('/api/twitter/tweets/:projectId/:variantId', (req, res) => {
  const { projectId, variantId } = req.params;
  const updated = db.updateVariant(projectId, variantId, req.body);
  if (!updated) return res.status(404).json({ error: '推文版本不存在' });
  
  if (req.body.content) {
    db.updateProjectMasterDraft(projectId, req.body.content, 'user', '推特工作台编辑');
  }

  res.json(updated);
});

app.delete('/api/twitter/tweets/:projectId/:variantId', (req, res) => {
  try {
    const { projectId, variantId } = req.params;
    const ok = db.deleteTwitterTweet(projectId, variantId);
    if (!ok) {
      return res.status(404).json({ error: '推文或项目不存在' });
    }
    res.json({ success: true, message: '推文已成功删除' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '删除推文失败' });
  }
});

app.post('/api/twitter/sync', (req, res) => {
  try {
    const { projectId, mode = 'raw', plannedPublishDate } = req.body;
    if (!projectId) return res.status(400).json({ error: '缺少目标项目 ID' });

    const project = db.getProject(projectId);
    if (!project) return res.status(404).json({ error: '目标项目不存在' });

    const rawMaster = project.masterDraft?.revisions?.[0]?.content || '';
    if (!rawMaster.trim()) {
      return res.status(400).json({ error: '目标项目母稿内容为空' });
    }

    let tweetContent = rawMaster;
    let format: any = 'short_post';
    let threadPosts: string[] | undefined = undefined;

    if (mode === 'thread') {
      format = 'thread';
      const paragraphs = rawMaster
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 0 && !p.startsWith('# '));
      
      if (paragraphs.length >= 2) {
        threadPosts = paragraphs.slice(0, 7).map((p, idx, arr) => {
          const numPrefix = `${idx + 1}/${arr.length} `;
          const body = p.slice(0, 240);
          return numPrefix + body;
        });
        tweetContent = threadPosts[0];
      } else {
        threadPosts = [
          `1/3 ${project.title}：核心思考与关键逻辑复盘。`,
          `2/3 ${rawMaster.slice(0, 240)}`,
          `3/3 总结：大道至简，多做低成本创造，抓住AI时代红利。`
        ];
        tweetContent = threadPosts[0];
      }
    } else if (mode === 'gemini_condense') {
      format = 'short_post';
      const cleaned = rawMaster
        .replace(/^#+\s+.*/gm, '')
        .replace(/^[>*-]\s+/gm, '')
        .replace(/\n+/g, ' ')
        .trim();
      
      tweetContent = cleaned.slice(0, 220);
      if (tweetContent.length > 200) {
        tweetContent = tweetContent.slice(0, 200) + '...';
      }
    } else {
      format = rawMaster.length > 280 ? 'long_article' : 'short_post';
    }

    const todayStr = db.getShanghaiDateKey();
    const title = `[同步] ${project.title.slice(0, 25)}`;

    const newVariant = db.addVariant(projectId, {
      platform: 'x',
      format,
      title,
      candidateTitles: [title],
      content: tweetContent,
      threadPosts,
      tags: ['思考', '母稿同步'],
      covers: [],
      status: 'draft',
      plannedPublishDate: plannedPublishDate || todayStr,
      notes: `从项目「${project.title}」通过「${mode === 'thread' ? 'Thread串拆解' : (mode === 'gemini_condense' ? 'Gemini网感提炼' : '原文同步')}」一键生成`
    });

    res.json({ success: true, project, variant: newVariant });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '同步失败' });
  }
});

app.post('/api/twitter/publish', (req, res) => {
  const { projectId, variantId, externalUrl } = req.body;
  if (!projectId || !variantId) {
    return res.status(400).json({ error: '缺少 projectId 或 variantId' });
  }
  const result = db.confirmPublish(projectId, variantId, externalUrl);
  if (!result) {
    return res.status(404).json({ error: '项目或变体不存在' });
  }
  res.json({ success: true, record: result.record });
});

// ==========================================
// 6. Leads & Commercial Records (PRD 5.5)
// ==========================================
app.get('/api/leads', (req, res) => {
  res.json(db.getLeads());
});

app.post('/api/leads', (req, res) => {
  const { type, title, amount, amountUnknown, status, platform, relatedProjectId, notes } = req.body;
  const clientOrPlatform = req.body.clientOrPlatform || req.body.clientName || '';
  if (!title || !clientOrPlatform) {
    return res.status(400).json({ error: '标的名称与客户/平台不能为空' });
  }
  const lead = db.addLead({
    type: type || 'commercial_order',
    title,
    clientOrPlatform,
    amount: amount !== undefined ? amount : null,
    amountUnknown: Boolean(amountUnknown),
    status: status || 'inquiry',
    platform,
    relatedProjectId,
    notes
  });
  res.json(lead);
});

app.patch('/api/leads/:id', (req, res) => {
  const updated = db.updateLead(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '线索不存在' });
  res.json(updated);
});

// ==========================================
// 7. Benchmark Accounts & Follower Snapshots (PRD 7.6)
// ==========================================
app.get('/api/benchmarks', (req, res) => {
  res.json(db.getBenchmarkAccounts());
});

app.post('/api/benchmarks', (req, res) => {
  const { name, type = 'benchmark', platform = 'douyin', fansCount, medianEngagement, profileUrl, contentDirection, whyBenchmark } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '账号名称不能为空' });
  }

  const rawFans = fansCount !== undefined && fansCount !== null ? String(fansCount).trim() : '未知';
  const parsedFans = parseFansCount(rawFans);
  const now = new Date().toISOString();

  const snapshot: any = {
    id: 'snap_' + Date.now(),
    fansCountRaw: rawFans,
    fansCount: parsedFans.count,
    precision: parsedFans.precision,
    observedAt: now,
    source: 'manual'
  };

  const newAccount: any = {
    id: `bm-${Date.now()}`,
    name: name.trim(),
    type,
    platform,
    fansCount: rawFans,
    medianEngagement: medianEngagement !== undefined ? Number(medianEngagement) : 0,
    worksCount: 0,
    viralCount: 0,
    lastSyncedAt: '刚刚添加',
    profileUrl,
    contentDirection,
    whyBenchmark,
    earliestSampleDate: req.body.earliestSampleDate || req.body.earliestSampleTime,
    sampleRange: req.body.sampleRange,
    snapshots: [snapshot],
    latestSnapshot: snapshot,
    trendData: [],
    works: []
  };
  const saved = db.saveBenchmarkAccount(newAccount);
  res.json({ success: true, account: saved });
});

app.post('/api/benchmarks/:id/snapshot', (req, res) => {
  const { fansCountRaw, fansCount, precision = 'approximate', source = 'manual', error } = req.body;
  if (!fansCountRaw && fansCount === undefined) {
    return res.status(400).json({ error: '快照数据不能为空' });
  }
  const updated = db.addFollowerSnapshot(req.params.id, {
    fansCountRaw: fansCountRaw || `${fansCount}`,
    fansCount: fansCount !== undefined ? fansCount : null,
    precision,
    source,
    error
  });
  if (!updated) return res.status(404).json({ error: '账号不存在' });
  res.json(updated);
});

// ==========================================
// 8. Article Sources & Deconstruction (PRD 7.5 & 7.7)
// ==========================================
app.get('/api/sources', (req, res) => {
  res.json(db.getSources());
});

app.post('/api/sources', (req, res) => {
  const { url, canonicalId, author, publishTime, rawMarkdown, readabilityStatus, bookmarkReason, isBenchmarkArticle } = req.body;
  if (!url && !canonicalId) {
    return res.status(400).json({ error: 'url 或 canonicalId 不能为空' });
  }
  let status = readabilityStatus;
  if (!rawMarkdown || !rawMarkdown.trim()) {
    status = 'link_only';
  } else if (!status) {
    status = 'full';
  }
  const source = db.addSource({
    url: url || '',
    canonicalId: canonicalId || url,
    author: author || '未知作者',
    publishTime,
    rawMarkdown: rawMarkdown || '',
    readabilityStatus: status,
    bookmarkReason,
    isBenchmarkArticle: Boolean(isBenchmarkArticle)
  });
  res.json(source);
});

app.post('/api/sources/:id/deconstruct', (req, res) => {
  const sources = db.getSources();
  const source = sources.find(s => s.id === req.params.id);
  if (!source) return res.status(404).json({ error: '文章来源不存在' });

  // Empty unread source cannot become completed placeholder analysis (PRD 7.5 & 7.7)
  if (!source.rawMarkdown || !source.rawMarkdown.trim() || source.readabilityStatus === 'link_only') {
    return res.status(400).json({ error: '来源文章尚未抓取全文（当前仅为链接），无法生成拆解报告，请先录入全文内容' });
  }

  const { audience, topicHook, structure, evidence, rhythm, visuals, ending, actionablePoints, candidateTopicId } = req.body;
  if (!audience && !topicHook && !structure && !evidence && (!actionablePoints || actionablePoints.length === 0)) {
    return res.status(400).json({ error: '拆解报告内容不能为空' });
  }

  const decon = db.addDeconstruction(req.params.id, {
    audience: audience || '',
    topicHook: topicHook || '',
    structure: structure || '',
    evidence: evidence || '',
    rhythm: rhythm || '',
    visuals: visuals || '',
    ending: ending || '',
    actionablePoints: actionablePoints || [],
    candidateTopicId
  });
  if (!decon) return res.status(404).json({ error: '文章来源不存在' });
  res.json(decon);
});

app.post('/api/sources/:id/convert-to-topic', (req, res) => {
  const sources = db.getSources();
  const source = sources.find(s => s.id === req.params.id);
  if (!source) return res.status(404).json({ error: '文章来源不存在' });

  const { title, angleHook, deconstructionId } = req.body;
  const decon = deconstructionId
    ? source.deconstructions.find(d => d.id === deconstructionId)
    : source.deconstructions[0];

  const topic = db.addTopic({
    title: title || `对标拆解转化：${source.canonicalId || source.url}`,
    sourceHot: `文章对标来源: ${source.author}`,
    platform: 'custom',
    category: '对标拆解转化',
    angleHook: angleHook || (decon?.topicHook || ''),
    targetAudience: decon?.audience || '',
    estimatedViralScore: 0,
    status: 'to_do',
    sourceId: source.id,
    deconstructionId: decon?.id
  });
  res.json(topic);
});

app.post('/api/sources/:id/handoff', (req, res) => {
  const sources = db.getSources();
  const source = sources.find(s => s.id === req.params.id);
  if (!source) return res.status(404).json({ error: '文章来源不存在' });

  const taskId = 'task_decon_' + Math.random().toString(36).substring(2, 10);
  const handoffDir = path.resolve(db.getDataDir(), 'handoff', 'sources', source.id, taskId);
  if (!fs.existsSync(handoffDir)) fs.mkdirSync(handoffDir, { recursive: true });

  const taskMeta = {
    schemaVersion: '1.2',
    sourceId: source.id,
    taskId,
    taskType: 'source_deconstruction',
    executionParty: 'gemini',
    sourceUrl: source.url,
    canonicalId: source.canonicalId,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(path.join(handoffDir, 'task.json'), JSON.stringify(taskMeta, null, 2), 'utf-8');
  fs.writeFileSync(path.join(handoffDir, 'source.md'), `# ${source.canonicalId || source.url}\n\n作者: ${source.author}\n链接: ${source.url}\n\n${source.rawMarkdown}\n`, 'utf-8');
  fs.writeFileSync(path.join(handoffDir, 'instructions.md'), `# 拆解指令\n\n请针对本文提取结构化拆解：\n1. 目标受众\n2. 开头钩子\n3. 结构拆解\n4. 论据证据 (必须引用原文句子)\n5. 行文节奏\n6. 视觉建议\n7. 结尾留钩子\n8. 实操要点 (列表)\n`, 'utf-8');

  res.json({ success: true, taskId, taskDir: handoffDir, taskMeta });
});

// ==========================================
// 9. Skills Registry (PRD 9.0)
// ==========================================
app.get('/api/skills', (req, res) => {
  res.json(db.getSkills());
});

// ==========================================
// 10. Backup & Restore (PRD 10.2 & UC-24)
// ==========================================
app.post('/api/backup', (req, res) => {
  try {
    const result = db.createBackup();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restore', (req, res) => {
  try {
    const timestamp = req.body.timestamp || req.body.backupTimestamp;
    if (!timestamp) return res.status(400).json({ error: 'timestamp 不能为空' });
    const result = db.restoreBackup(timestamp);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. TikHub Trends & Search (No fake mock when unconfigured!)
// ==========================================
app.get('/api/trends', async (req, res) => {
  try {
    const platform = (req.query.platform as any) || 'douyin';
    const query = req.query.q as string;
    const result = await fetchTikHubTrends(platform, query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取热搜失败' });
  }
});

// ==========================================
// 12. Topics CRUD & Outline Generation
// ==========================================
app.get('/api/topics', (req, res) => {
  const status = req.query.status as string;
  let list = db.getTopics();
  if (status && status !== 'all') {
    list = list.filter(t => t.status === status);
  }
  res.json(list);
});

app.post('/api/topics', (req, res) => {
  const { title, sourceHot, platform = 'custom', category = '自定义', angleHook = '', targetAudience = '' } = req.body;
  if (!title) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  const created = db.addTopic({
    title,
    sourceHot: sourceHot || '原创灵感',
    platform,
    category,
    angleHook,
    targetAudience,
    estimatedViralScore: 90,
    status: 'to_do'
  });
  res.json(created);
});

app.patch('/api/topics/:id', (req, res) => {
  const updated = db.updateTopic(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '选题不存在' });
  res.json(updated);
});

app.delete('/api/topics/:id', (req, res) => {
  const ok = db.deleteTopic(req.params.id);
  res.json({ success: ok });
});

app.post('/api/topics/:id/generate-outlines', async (req, res) => {
  try {
    const topic = db.getTopics().find(t => t.id === req.params.id);
    if (!topic) return res.status(404).json({ error: '选题不存在' });
    const settings = db.getSettings();
    const persona = db.getPersona();
    const outlines = await generateOutlinesForTopic(topic.title, topic.angleHook, settings.niche, persona);
    const updated = db.updateTopic(topic.id, {
      outlines,
      status: topic.status === 'pending' ? 'to_do' : topic.status
    });
    res.json({ success: true, outlines, topic: updated });
  } catch (err: any) {
    console.error('Failed to generate outlines:', err);
    res.status(500).json({ error: err.message || '生成思路大纲失败' });
  }
});

// ==========================================
// 13. Persona & Historical Tone
// ==========================================
app.get('/api/persona', (req, res) => {
  res.json(db.getPersona());
});

app.post('/api/persona', (req, res) => {
  const updated = db.updatePersona(req.body);
  res.json(updated);
});

// ==========================================
// 14. Posts & Less-AI-Tone
// ==========================================
app.get('/api/posts', (req, res) => {
  const dateKey = req.query.dateKey as string;
  let posts = db.getPosts();
  if (dateKey) posts = posts.filter(p => p.dateKey === dateKey);
  res.json(posts);
});

app.post('/api/posts/less-ai-tone', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: '文案内容不能为空' });
    const persona = db.getPersona();
    const result = await cleanWithLessAiTone(content, persona);
    res.json({ success: true, polished: result.polished, report: result.report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '去 AI 味改写失败' });
  }
});

app.get('/api/skill/less-ai-tone', (req, res) => {
  const doc = getSkillDocument();
  res.json({
    installed: true,
    name: 'lieflat-less-ai-tone',
    displayName: '躺平·去AI味',
    corpusSize: '283万字',
    rulesCount: 11,
    hasDocumentation: Boolean(doc)
  });
});

app.post('/api/posts/polish', async (req, res) => {
  try {
    const { content, instruction } = req.body;
    if (!content || !instruction) return res.status(400).json({ error: '文案与指令不能为空' });
    const persona = db.getPersona();
    const polished = await polishPostContent(content, instruction, persona);
    res.json({ success: true, polished });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '润色失败' });
  }
});

app.patch('/api/posts/:id', (req, res) => {
  const updated = db.updatePost(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '帖子不存在' });
  res.json(updated);
});

app.delete('/api/posts/:id', (req, res) => {
  const ok = db.deletePost(req.params.id);
  res.json({ success: ok });
});

// Matrix Packs
app.post('/api/matrix/generate', async (req, res) => {
  try {
    const { sourceTitle, sourceContent, postId } = req.body;
    if (!sourceContent || !sourceContent.trim()) return res.status(400).json({ error: '母本文案内容不能为空' });
    const title = sourceTitle || '未命名选题';
    const persona = db.getPersona();
    const pack = await generateMatrixPack(title, sourceContent, persona);
    if (postId) {
      pack.postId = postId;
      db.saveMatrixPack(pack);
    }
    res.json({ success: true, pack });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '矩阵物料生成失败' });
  }
});

app.get('/api/matrix', (req, res) => {
  res.json(db.getMatrixPacks());
});

app.get('/api/matrix/:id', (req, res) => {
  const pack = db.getMatrixPack(req.params.id);
  if (!pack) return res.status(404).json({ error: '物料包不存在' });
  res.json(pack);
});

// KPI Stats
app.get('/api/kpi', (req, res) => {
  const stats = db.getDashboardPublishStats();
  res.json({ today: stats });
});

// Markdown Knowledge Export (PRD 10.2 & UC-40)
app.get('/api/export/markdown', (req, res) => {
  const { projectId, variantId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId 不能为空' });
  }
  const proj = db.getProject(projectId);
  if (!proj) {
    return res.status(404).json({ error: '项目不存在' });
  }
  const curRevNum = proj.masterDraft?.currentRev || 1;
  const curRev = proj.masterDraft?.revisions?.find(r => r.rev === curRevNum) || proj.masterDraft?.revisions?.[proj.masterDraft.revisions.length - 1];
  const currentBody = curRev?.content || '';
  const sourceUrls = proj.sources?.map(s => s.url).filter(Boolean) || [];
  const sourceIds = proj.sources?.map(s => s.id).filter(Boolean) || [];

  const frontmatterLines = [
    '---',
    `projectId: "${proj.id}"`,
    `title: "${proj.title.replace(/"/g, '\\"')}"`,
    `rev: ${curRevNum}`,
    `publicationState: "${proj.status}"`,
    `sourceIds: ${JSON.stringify(sourceIds)}`,
    `sourceUrls: ${JSON.stringify(sourceUrls)}`
  ];

  if (variantId && typeof variantId === 'string') {
    const v = proj.variants?.find(item => item.id === variantId);
    if (v) {
      frontmatterLines.push(`variantId: "${v.id}"`);
      frontmatterLines.push(`platform: "${v.platform}"`);
      frontmatterLines.push(`format: "${v.format}"`);
      frontmatterLines.push(`variantStatus: "${v.status}"`);
    }
  }

  frontmatterLines.push(`createdAt: "${proj.createdAt}"`);
  frontmatterLines.push(`updatedAt: "${proj.updatedAt}"`);
  frontmatterLines.push('---');
  frontmatterLines.push('');
  frontmatterLines.push(`# ${proj.title}`);
  frontmatterLines.push('');
  frontmatterLines.push(currentBody);

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="project-${proj.id}.md"`);
  res.send(frontmatterLines.join('\n'));
});

// Today Package & Artifacts Export (PRD 10.2 & Codex Round 3 check 6 & Round 5 Asia/Shanghai timezone)
app.get('/api/export/today', (req, res) => {
  try {
    const todayStr = (req.query.date as string) || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
    const projects = db.getProjects().filter(p => p.createdAt?.startsWith(todayStr) || p.updatedAt?.startsWith(todayStr));
    const records = db.getPublishRecords().filter(r => r.publishedAt?.startsWith(todayStr));
    const kpi = db.getDashboardPublishStats(todayStr);

    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({
        date: todayStr,
        kpi,
        projectsCount: projects.length,
        projects,
        publishRecords: records
      });
    }

    // Default: ordered Markdown bundle with YAML frontmatter
    const mdLines: string[] = [
      '---',
      `exportDate: "${todayStr}"`,
      `projectsCount: ${projects.length}`,
      `publishedToday: ${kpi.publishedToday}`,
      '---',
      '',
      `# 今日发布与内容物料导出 (${todayStr})`,
      '',
      `## 1. 统计概览`,
      `- 今日真实发布数: ${kpi.publishedToday}`,
      `- 待发变体数: ${kpi.pipeline?.readyToPublish || 0}`,
      `- 待做选题数: ${kpi.pipeline?.toDoTopics || 0}`,
      '',
      `## 2. 项目与变体清单`,
      ''
    ];

    if (projects.length === 0) {
      mdLines.push('*今日暂无新建或更新的项目*');
    } else {
      projects.forEach((proj, idx) => {
        const curRevNum = proj.masterDraft?.currentRev || 1;
        const curRev = proj.masterDraft?.revisions?.find(r => r.rev === curRevNum) || proj.masterDraft?.revisions?.[proj.masterDraft.revisions.length - 1];
        const currentBody = curRev?.content || '';
        const sourceUrls = proj.sources?.map(s => s.url).filter(Boolean) || [];
        const sourceIds = proj.sources?.map(s => s.id).filter(Boolean) || [];

        mdLines.push(`### ${idx + 1}. [${proj.id}] ${proj.title}`);
        mdLines.push(`- 项目ID: \`${proj.id}\``);
        mdLines.push(`- 当前审批修订: Rev ${curRevNum} (作者: ${curRev?.author || 'user'})`);
        mdLines.push(`- 事实源URLs: ${sourceUrls.length > 0 ? sourceUrls.join(', ') : '本地原创录入'}`);
        mdLines.push(`- 事实源IDs: ${sourceIds.length > 0 ? sourceIds.join(', ') : '无'}`);
        mdLines.push(`- 项目发布状态: \`${proj.status}\` (单向导出，保持未发布状态不变)`);
        if (currentBody) {
          mdLines.push(`\n**当前审批正文 (Rev ${curRevNum}):**\n\n${currentBody}\n`);
        }
        if (proj.variants && proj.variants.length > 0) {
          mdLines.push(`**平台变体 (${proj.variants.length}个):**\n`);
          proj.variants.forEach(v => {
            mdLines.push(`#### [${v.platform.toUpperCase()} - ${v.format}] ${v.title}`);
            mdLines.push(`- 变体ID: \`${v.id}\` | 所属项目ID: \`${proj.id}\` | 状态: \`${v.status}\``);
            if (v.content) {
              mdLines.push(`\n${v.content}\n`);
            }
          });
        }
        mdLines.push('---');
      });
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="today-export-${todayStr}.md"`);
    res.send(mdLines.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message || '今日导出生成失败' });
  }
});

// ==========================================
// 15. Media, Video & Ordered Image Combo (PRD 4.6 & UC-12, UC-13)
// ==========================================
app.get('/api/media/ffmpeg-status', (req, res) => {
  res.json(checkFfmpegAvailability());
});

app.post('/api/media/image-combo', async (req, res) => {
  try {
    const { imagePaths, durationPerImage, musicPath, outputFileName } = req.body;
    const result = await composeImagesToVideo({ imagePaths, durationPerImage, musicPath, outputFileName });
    if (!result.success) {
      return res.status(result.missingDependency ? 503 : 400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || '图片组合合成异常' });
  }
});

// ==========================================
// 16. TikHub Scheduler & Catch-up (PRD 7.4 & UC-21)
// ==========================================
app.get('/api/scheduler/status', (req, res) => {
  res.json({
    ...getSchedulerState(),
    traces: getSearchTraces()
  });
});

app.post('/api/scheduler/run-now', async (req, res) => {
  try {
    const force = Boolean(req.body?.force);
    const result = await runDailyScheduledSearch(force);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '调度任务手动触发失败' });
  }
});

app.post('/api/scheduler/config', (req, res) => {
  const current = getSchedulerState();
  const updated = {
    ...current,
    enabled: req.body.enabled !== undefined ? Boolean(req.body.enabled) : current.enabled,
    scheduledHour: req.body.scheduledHour !== undefined ? Number(req.body.scheduledHour) : current.scheduledHour,
    scheduledMinute: req.body.scheduledMinute !== undefined ? Number(req.body.scheduledMinute) : current.scheduledMinute,
    keywords: req.body.keywords !== undefined ? (Array.isArray(req.body.keywords) ? req.body.keywords : [String(req.body.keywords)]) : current.keywords,
    platforms: req.body.platforms !== undefined ? req.body.platforms : current.platforms,
    missedRunPolicy: req.body.missedRunPolicy !== undefined ? req.body.missedRunPolicy : current.missedRunPolicy
  };
  saveSchedulerState(updated);
  res.json(updated);
});

// Auto import pending incoming READY packages (PRD 5 & UC-31, UC-32)
function autoImportPendingIncoming() {
  try {
    const pending = handoffService.scanPendingIncoming();
    for (const importId of pending) {
      try {
        handoffService.importIncoming(importId);
      } catch (e) {
        // Log silently
      }
    }
  } catch (_) {}
}

// Background timers (PRD 7.4 & UC-21, UC-31, UC-32)
setInterval(autoImportPendingIncoming, 3000);
setInterval(checkSchedulerTick, 30000);
setTimeout(autoImportPendingIncoming, 1000);
setTimeout(checkSchedulerTick, 2000);

// EXPLICIT LOOPBACK BINDING ONLY (PRD Boundary Requirement: 127.0.0.1)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 内容工作台后端服务已启动 (Loopback Only): http://127.0.0.1:${PORT}`);
});
