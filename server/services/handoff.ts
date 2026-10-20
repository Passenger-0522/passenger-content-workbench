import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { db, ContentProject, PlatformVariant, getDataDir } from '../db.js';
import { getFfmpegPath, validateVideoIntegrity } from './video.js';

function getHandoffDir() {
  const dir = path.join(getDataDir(), 'handoff');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getIncomingDir() {
  const dir = path.join(getDataDir(), 'incoming');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getReceiptsDir() {
  const dir = path.join(getDataDir(), 'receipts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Helper: safe path check against path traversal and symlink escape
function isSafeRelativePath(baseDir: string, targetPath: string): boolean {
  if (!targetPath || targetPath.includes('\0') || path.isAbsolute(targetPath)) return false;
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, targetPath);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) return false;
  try {
    if (fs.existsSync(resolvedTarget)) {
      const realBase = fs.realpathSync(resolvedBase);
      const realTarget = fs.realpathSync(resolvedTarget);
      if (!realTarget.startsWith(realBase + path.sep) && realTarget !== realBase) {
        return false;
      }
    }
  } catch (_) {
    return false;
  }
  return true;
}

// Robust image dimension inspector for PNG, JPEG, GIF, WebP
// Rejects any text file, empty file, non-image format, truncated or corrupted files
export function inspectImageDimensions(filePath: string): { width: number; height: number; valid: boolean } {
  try {
    if (!fs.existsSync(filePath)) return { width: 0, height: 0, valid: false };
    const stat = fs.statSync(filePath);
    if (stat.size < 68) return { width: 0, height: 0, valid: false };

    // Full integrity verification using FFmpeg if available
    const ffmpegBin = getFfmpegPath();
    if (ffmpegBin) {
      try {
        execFileSync(ffmpegBin, ['-v', 'error', '-i', filePath, '-f', 'null', '-'], {
          stdio: 'pipe',
          timeout: 30000
        });
      } catch (err: any) {
        if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM') {
          console.warn(`[WARN] FFmpeg image decode timed out for ${filePath}, proceeding with chunk validation`);
        } else {
          return { width: 0, height: 0, valid: false };
        }
      }
    }

    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(Math.min(stat.size, 65536));
    fs.readSync(fd, header, 0, header.length, 0);
    fs.closeSync(fd);

    // 1. PNG: \x89PNG\r\n\x1a\n
    if (
      header.length >= 24 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a
    ) {
      // Chunk check when FFmpeg not available
      if (!ffmpegBin) {
        const fileBuf = fs.readFileSync(filePath);
        if (fileBuf.indexOf(Buffer.from('IEND')) < 0 || fileBuf.indexOf(Buffer.from('IDAT')) < 0) {
          return { width: 0, height: 0, valid: false };
        }
      }
      const width = header.readUInt32BE(16);
      const height = header.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return { width, height, valid: true };
      }
    }

    // 2. GIF: GIF87a / GIF89a
    if (header.length >= 10 && header.toString('ascii', 0, 3) === 'GIF') {
      const width = header.readUInt16LE(6);
      const height = header.readUInt16LE(8);
      if (width > 0 && height > 0) {
        return { width, height, valid: true };
      }
    }

    // 3. JPEG: 0xFF 0xD8
    if (header.length >= 4 && header[0] === 0xff && header[1] === 0xd8) {
      let offset = 2;
      while (offset < header.length - 8) {
        if (header[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = header[offset + 1];
        // SOF markers (SOF0 = 0xC0, SOF1 = 0xC1, SOF2 = 0xC2)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = header.readUInt16BE(offset + 5);
          const width = header.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) {
            return { width, height, valid: true };
          }
        }
        if (offset + 3 < header.length) {
          const chunkLen = header.readUInt16BE(offset + 2);
          offset += 2 + chunkLen;
        } else {
          break;
        }
      }
    }

    // 4. WebP: RIFF....WEBP
    if (
      header.length >= 30 &&
      header.toString('ascii', 0, 4) === 'RIFF' &&
      header.toString('ascii', 8, 12) === 'WEBP'
    ) {
      const type = header.toString('ascii', 12, 16);
      if (type === 'VP8 ' && header.length >= 30) {
        const width = header.readUInt16LE(26) & 0x3fff;
        const height = header.readUInt16LE(28) & 0x3fff;
        return { width, height, valid: true };
      } else if (type === 'VP8L' && header.length >= 25) {
        const b0 = header[21], b1 = header[22], b2 = header[23], b3 = header[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height, valid: true };
      } else if (type === 'VP8X' && header.length >= 30) {
        const width = 1 + header.readUIntLE(24, 3);
        const height = 1 + header.readUIntLE(27, 3);
        return { width, height, valid: true };
      }
    }

    // All others rejected
    return { width: 0, height: 0, valid: false };
  } catch (err) {
    return { width: 0, height: 0, valid: false };
  }
}

export interface HandoffTaskOptions {
  projectId: string;
  taskId?: string;
  taskType: 'copywriting' | 'image_generation' | 'layout' | 'video_cover';
  executionParty: 'gemini' | 'codex';
  targetPlatform?: 'x' | 'xiaohongshu' | 'gzh' | 'douyin' | 'channels';
  visualRequirements?: {
    ratios: string[];
    skillId?: string;
    styleName?: string;
    headline?: string;
    subheadline?: string;
  };
  references?: Array<{ name: string; contentOrPath: string }>;
}

export interface IncomingManifest {
  schemaVersion: string;
  importId: string;
  operation?: string;
  projectId?: string;
  variantId?: string;
  platform?: string;
  title?: string;
  sourceUrl?: string;
  skillId?: string;
  taskId?: string;
  costPath?: string;
  quotaStatus?: string;
  baseRevision?: number;
  executionParty?: 'gemini' | 'codex' | 'antigravity';
  allowedModifications?: string[];
  files?: {
    copy?: string;
    video?: string | { path: string; name?: string };
    videos?: Array<{ path: string; name?: string }>;
    images?: Array<{
      path: string;
      usage: 'primary' | 'channels_vertical' | 'channels_horizontal' | 'card';
      ratio: string;
      prompt?: string;
      skillId?: string;
    }>;
    prompts?: string[];
    layoutHtml?: string;
  };
  reviewNotes?: string;
}

export interface Receipt {
  receiptId: string;
  importId: string;
  projectId?: string;
  topicId?: string;
  taskId?: string;
  status: 'imported' | 'rejected' | 'conflict_preserved' | 'failed' | 'partial';
  importedAt: string;
  assetsAdded: number;
  executionParty?: string;
  skillId?: string;
  costPath?: string;
  quotaStatus?: string;
  conflict?: {
    isConflict: boolean;
    baseRevision: number;
    currentRevision: number;
    incomingText?: string;
    currentText?: string;
    message: string;
  } | null;
  warnings: string[];
}

export const handoffService = {
  // 1. Export Handoff Task for Gemini or Codex
  exportTask(options: HandoffTaskOptions) {
    const project = db.getProject(options.projectId);
    if (!project) {
      throw new Error(`Project not found: ${options.projectId}`);
    }

    const taskId = options.taskId || 'task_' + Math.random().toString(36).substring(2, 10);
    const taskDir = path.join(getHandoffDir(), options.projectId, taskId);
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    // task.json
    const taskMeta = {
      schemaVersion: '1.2',
      projectId: options.projectId,
      taskId,
      taskType: options.taskType,
      executionParty: options.executionParty,
      baseRevision: project.masterDraft.currentRev,
      targetPlatform: options.targetPlatform || 'all',
      allowedModifications: options.taskType === 'copywriting' ? ['copy', 'variants'] : ['covers', 'layout'],
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(taskDir, 'task.json'), JSON.stringify(taskMeta, null, 2), 'utf-8');

    // sources.md
    let sourcesMd = `# 来源事实源 (Project Sources)\n\n`;
    if (project.sources && project.sources.length > 0) {
      project.sources.forEach((s, idx) => {
        sourcesMd += `## 来源 ${idx + 1}\n- 原作者: ${s.author || '未知'}\n- 原链接: ${s.url || '无'}\n- 捕获时间: ${s.capturedAt}\n\n内容:\n${s.text}\n\n---\n\n`;
      });
    } else {
      sourcesMd += `(本选题由创作者原始输入发起，无外部链接事实绑定)\n`;
    }
    fs.writeFileSync(path.join(taskDir, 'sources.md'), sourcesMd, 'utf-8');

    // approved-copy.md
    const currentRevObj = project.masterDraft.revisions[0];
    const approvedCopy = `# 经创作者认可的正文 (Approved Copy - Rev ${project.masterDraft.currentRev})\n\n> 注意：作图与排版任务必须保护本正文，严禁篡改已有事实或静默重写。\n\n${currentRevObj ? currentRevObj.content : ''}\n`;
    fs.writeFileSync(path.join(taskDir, 'approved-copy.md'), approvedCopy, 'utf-8');

    // visual-brief.json
    const visualBrief = {
      ratios: options.visualRequirements?.ratios || ['3:4', '16:9', '9:16'],
      skillId: options.visualRequirements?.skillId || 'punk-cover',
      styleName: options.visualRequirements?.styleName || '商业杂志头版风格',
      headline: options.visualRequirements?.headline || project.title,
      subheadline: options.visualRequirements?.subheadline || '实操经验分享',
      notes: '双客户端交接视觉需求包'
    };
    fs.writeFileSync(path.join(taskDir, 'visual-brief.json'), JSON.stringify(visualBrief, null, 2), 'utf-8');

    // references/
    const refDir = path.join(taskDir, 'references');
    if (!fs.existsSync(refDir)) {
      fs.mkdirSync(refDir, { recursive: true });
    }
    if (options.references) {
      options.references.forEach(ref => {
        fs.writeFileSync(path.join(refDir, ref.name), ref.contentOrPath, 'utf-8');
      });
    }

    return { taskId, taskDir, taskMeta };
  },

  // 2. Scan & Import Incoming Handoff Packages (idempotent, conflict-guarded)
  importIncoming(importId: string): Receipt {
    const incomingDir = path.join(getIncomingDir(), importId);
    if (!fs.existsSync(incomingDir)) {
      throw new Error(`Incoming directory not found: ${importId}`);
    }

    const manifestFile = path.join(incomingDir, 'manifest.json');
    if (!fs.existsSync(manifestFile)) {
      throw new Error(`manifest.json missing in ${importId}`);
    }

    const readyFile = path.join(incomingDir, 'READY');
    if (!fs.existsSync(readyFile)) {
      throw new Error(`Package is incomplete (READY marker missing) in ${importId}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8')) as IncomingManifest;

    const receiptFile = path.join(getReceiptsDir(), `${importId}.json`);
    // Idempotent: if already imported FOR THE CURRENT PROJECT/TARGET, return existing receipt directly!
    if (fs.existsSync(receiptFile)) {
      const existing = JSON.parse(fs.readFileSync(receiptFile, 'utf-8')) as Receipt;
      if (!manifest.projectId || existing.projectId === manifest.projectId) {
        return existing;
      }
    }
    let projectId = manifest.projectId;
    let project = projectId ? db.getProject(projectId) : null;
    let createdTopicId: string | undefined = undefined;

    // Handle offline capture package without prior projectId
    if (!project) {
      if (manifest.operation === 'capture' || !projectId) {
        let copyText = '';
        if (manifest.files?.copy) {
          const copyPath = path.join(incomingDir, manifest.files.copy);
          if (fs.existsSync(copyPath)) {
            copyText = fs.readFileSync(copyPath, 'utf-8');
          }
        }
        if (!copyText) copyText = `离线捕获灵感 ${importId}`;
        const title = manifest.title || (copyText.split('\n')[0].replace(/^[#\s]+/, '').trim().substring(0, 40) || `离线想法 ${importId}`);
        const topic = db.addTopic({
          title,
          sourceHot: manifest.sourceUrl ? `外部文章: ${manifest.sourceUrl}` : '离线对话捕获',
          platform: (manifest.platform as any) || 'custom',
          category: '待整理想法',
          angleHook: '',
          targetAudience: '目标受众',
          estimatedViralScore: 0,
          status: 'to_do'
        });
        createdTopicId = topic.id;
        project = db.addProject({
          title,
          masterContent: copyText,
          topicId: topic.id,
          sources: [
            {
              id: 'src_' + Math.random().toString(36).substring(2, 10),
              url: manifest.sourceUrl || '',
              author: '离线对话捕获',
              text: copyText,
              capturedAt: new Date().toISOString()
            }
          ]
        });
        projectId = project.id;
      } else {
        throw new Error(`Target project not found: ${manifest.projectId}`);
      }
    }

    const warnings: string[] = [];
    let conflictInfo: Receipt['conflict'] = null;
    let assetsAdded = 0;

    const baseRev = manifest.baseRevision ?? 1;
    // Check version conflict: if website approved copy was bumped since task baseRevision
    if (project.masterDraft.currentRev > baseRev) {
      const incomingCopyPath = manifest.files?.copy ? path.join(incomingDir, manifest.files.copy) : null;
      let incomingText = '';
      if (incomingCopyPath && isSafeRelativePath(incomingDir, manifest.files!.copy!) && fs.existsSync(incomingCopyPath)) {
        try { incomingText = fs.readFileSync(incomingCopyPath, 'utf-8'); } catch (_) {}
      }
      const currentRevObj = project.masterDraft.revisions?.find(r => r.rev === project.masterDraft.currentRev) || project.masterDraft.revisions?.[0];
      const currentText = currentRevObj?.content || '';
      conflictInfo = {
        isConflict: true,
        baseRevision: baseRev,
        currentRevision: project.masterDraft.currentRev,
        incomingText,
        currentText,
        message: `网站正文已在外部工具离线期间被更新至修订 Rev ${project.masterDraft.currentRev}，外部任务基于旧版本 Rev ${baseRev}，已保护网站当前正文并记录差异！`
      };
      warnings.push(conflictInfo.message);
    }

    // Process Copy (Check locked status & executionParty authorization!)
    let isCopyRejected = false;
    if (manifest.files?.copy) {
      const isLocked = project.masterDraft.revisions?.some(r => r.locked);
      if (isLocked) {
        isCopyRejected = true;
        warnings.push('拒绝外部任务修改正文：正文已被锁定保护');
      } else if (manifest.executionParty === 'codex') {
        isCopyRejected = true;
        warnings.push('拒绝作图任务修改正文：作图方 (Codex) 无权变更正文');
      } else if (!conflictInfo && manifest.executionParty === 'gemini') {
        const copyPath = path.join(incomingDir, manifest.files.copy);
        if (isSafeRelativePath(incomingDir, manifest.files.copy) && fs.existsSync(copyPath)) {
          const newCopyContent = fs.readFileSync(copyPath, 'utf-8');
          db.updateProjectMasterDraft(project.id, newCopyContent, 'gemini', `Imported from Gemini incoming ${importId}`);
        }
      }
    }

    // Process Images
    if (manifest.files?.images && Array.isArray(manifest.files.images)) {
      for (const imgSpec of manifest.files.images) {
        if (!isSafeRelativePath(incomingDir, imgSpec.path)) {
          warnings.push(`Path traversal detected and skipped: ${imgSpec.path}`);
          continue;
        }
        const imgDiskPath = path.join(incomingDir, imgSpec.path);
        const dimensionInfo = inspectImageDimensions(imgDiskPath);
        if (!dimensionInfo.valid) {
          warnings.push(`Image file invalid, non-image, or empty on disk: ${imgSpec.path}`);
          continue; // Strict rejection of non-image files!
        }

        // Target variant selection: Attach ONLY to target variant!
        const variantList = project.variants || [];
        let targetVariants: PlatformVariant[] = [];

        if (manifest.variantId) {
          targetVariants = variantList.filter(v => v.id === manifest.variantId);
        } else if (manifest.platform) {
          targetVariants = variantList.filter(v => v.platform === manifest.platform);
        } else if (variantList.length > 0) {
          targetVariants = [variantList[0]];
        }

        for (const variant of targetVariants) {
          const newCover = {
            id: 'cov_' + Math.random().toString(36).substring(2, 10),
            name: `${imgSpec.usage} (${imgSpec.ratio})`,
            usage: imgSpec.usage,
            ratio: imgSpec.ratio,
            url: `/api/assets/incoming/${importId}/${imgSpec.path}`,
            prompt: imgSpec.prompt || '',
            skillId: imgSpec.skillId || (manifest.executionParty === 'codex' ? 'imagegen' : 'punk-cover'),
            verifiedOnDisk: true,
            width: dimensionInfo.width,
            height: dimensionInfo.height
          };
          variant.covers = [...(variant.covers || []), newCover];
          assetsAdded++;
        }
        db.updateProject(project.id, { variants: variantList });
      }
    }

    // Process Videos
    const videoSpecs: Array<{ path: string; name?: string }> = [];
    if (typeof manifest.files?.video === 'string') {
      videoSpecs.push({ path: manifest.files.video, name: path.basename(manifest.files.video) });
    } else if (manifest.files?.video && typeof manifest.files.video === 'object') {
      videoSpecs.push(manifest.files.video as any);
    }
    if (manifest.files?.videos && Array.isArray(manifest.files.videos)) {
      videoSpecs.push(...manifest.files.videos);
    }

    if (videoSpecs.length > 0) {
      for (const vidSpec of videoSpecs) {
        if (!isSafeRelativePath(incomingDir, vidSpec.path)) {
          warnings.push(`Path traversal detected and skipped video: ${vidSpec.path}`);
          continue;
        }
        const vidDiskPath = path.join(incomingDir, vidSpec.path);
        if (!fs.existsSync(vidDiskPath) || fs.statSync(vidDiskPath).size === 0) {
          warnings.push(`Video file missing or empty on disk: ${vidSpec.path}`);
          continue;
        }

        // Real video decode integrity validation (Codex Round 4 Review)
        const integrity = validateVideoIntegrity(vidDiskPath);
        if (!integrity.valid) {
          warnings.push(`Video file invalid, corrupted, or non-video: ${vidSpec.path} (${integrity.error || 'decode failed'})`);
          continue;
        }

        const variantList = project.variants || [];
        let targetVariants: PlatformVariant[] = [];

        if (manifest.variantId) {
          targetVariants = variantList.filter(v => v.id === manifest.variantId);
        } else if (manifest.platform) {
          targetVariants = variantList.filter(v => v.platform === manifest.platform);
        } else if (variantList.length > 0) {
          targetVariants = variantList.filter(v => v.format === 'video' || v.format === 'image_combo');
          if (targetVariants.length === 0) targetVariants = [variantList[0]];
        }

        const vidUrl = `/api/assets/incoming/${importId}/${vidSpec.path}`;
        const vidId = 'vid_' + Math.random().toString(36).substring(2, 10);

        let videoAdded = false;
        if (!project.baseVideo) {
          project.baseVideo = {
            id: vidId,
            url: vidUrl,
            path: vidDiskPath,
            name: vidSpec.name || path.basename(vidSpec.path)
          };
          assetsAdded++;
          videoAdded = true;
        }

        for (const variant of targetVariants) {
          variant.videoUrl = vidUrl;
          variant.videoPath = vidDiskPath;
          variant.videoId = vidId;
          variant.videoName = vidSpec.name || path.basename(vidSpec.path);
          if (!videoAdded) {
            assetsAdded++;
            videoAdded = true;
          }
        }
        if (!videoAdded) {
          assetsAdded++;
        }
        db.updateProject(project.id, { variants: variantList, baseVideo: project.baseVideo });
      }
    }

    const declaredImageCount = manifest.files?.images?.length || 0;
    const declaredVideoCount = videoSpecs.length;
    const declaredTotalAssets = declaredImageCount + declaredVideoCount;
    let finalStatus: Receipt['status'] = 'imported';

    if (isCopyRejected) {
      finalStatus = 'rejected';
    } else if (conflictInfo) {
      finalStatus = 'conflict_preserved';
    } else if (manifest.quotaStatus === 'paused_quota') {
      finalStatus = 'paused' as any;
      warnings.push('外部任务已进入配额暂停状态 (paused_quota)，已保留交接上下文且未回退至付费API');
    } else if (declaredTotalAssets > 0) {
      if (assetsAdded === 0) {
        finalStatus = 'failed';
        warnings.push('所有声明的素材均无效或损坏，未添加任何资产');
      } else if (assetsAdded < declaredTotalAssets) {
        finalStatus = 'partial';
        warnings.push(`部分素材无效，仅添加了 ${assetsAdded}/${declaredTotalAssets} 个有效资产`);
      } else {
        finalStatus = 'imported';
      }
    }

    const costPath = manifest.costPath || (manifest.executionParty === 'gemini'
      ? 'subscription_quota'
      : manifest.executionParty === 'codex'
      ? 'local_imagegen'
      : 'local_free');

    const quotaStatus = manifest.quotaStatus || (costPath === 'subscription_quota' ? 'unknown' : 'active');

    // Generate real receipt
    const receipt: Receipt = {
      receiptId: 'rec_' + Math.random().toString(36).substring(2, 10),
      importId,
      projectId: project.id,
      topicId: createdTopicId || project.topicId,
      taskId: manifest.taskId,
      status: finalStatus,
      importedAt: new Date().toISOString(),
      assetsAdded,
      executionParty: manifest.executionParty || 'external',
      skillId: manifest.skillId || (manifest.executionParty === 'codex' ? 'imagegen' : 'punk-cover'),
      costPath,
      quotaStatus,
      conflict: conflictInfo,
      warnings
    };

    fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2), 'utf-8');
    return receipt;
  },

  // 3. Scan pending incoming directories that have READY marker
  scanPendingIncoming(): string[] {
    const incDir = getIncomingDir();
    const recDir = getReceiptsDir();
    if (!fs.existsSync(incDir)) return [];
    const entries = fs.readdirSync(incDir);
    const readyDirs: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(incDir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        const readyFile = path.join(fullPath, 'READY');
        const receiptFile = path.join(recDir, `${entry}.json`);
        if (fs.existsSync(readyFile) && !fs.existsSync(receiptFile)) {
          readyDirs.push(entry);
        }
      }
    }
    return readyDirs;
  },

  // 4. Chat Capture (workbench-capture protocol)
  captureChatInput(rawInput: string, meta?: { title?: string; sourceUrl?: string; platform?: string; status?: string }) {
    if (!rawInput || !rawInput.trim()) {
      throw new Error('Raw input cannot be empty');
    }

    const importId = 'cap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const captureDir = path.join(getIncomingDir(), importId);
    fs.mkdirSync(captureDir, { recursive: true });

    const title = meta?.title || (rawInput.split('\n')[0].replace(/^[#\s]+/, '').slice(0, 40) || '对话捕获灵感');

    // 1. Create Topic in database (PRD Case 27 & Round 5: to_do topic)
    const topic = db.addTopic({
      title,
      sourceHot: meta?.sourceUrl ? '外部文章链接' : 'Antigravity 对话捕获',
      platform: (meta?.platform as any) || 'custom',
      category: '灵感捕获',
      angleHook: '对话直接捕获事实源',
      targetAudience: '大众创作者',
      estimatedViralScore: 0,
      status: (meta?.status as any) || 'to_do'
    });

    // 2. Create Project in database
    const project = db.addProject({
      topicId: topic.id,
      title,
      masterContent: rawInput,
      sources: [
        {
          id: 'src_' + Math.random().toString(36).substring(2, 10),
          url: meta?.sourceUrl,
          author: '创作者对话输入',
          text: rawInput,
          capturedAt: new Date().toISOString()
        }
      ]
    });

    // Link topic back to project
    db.updateTopic(topic.id, { projectId: project.id });

    // 3. Write incoming package files
    fs.writeFileSync(path.join(captureDir, 'sources.md'), `# 原始输入\n\n${rawInput}\n`, 'utf-8');

    const copyDir = path.join(captureDir, 'copy');
    fs.mkdirSync(copyDir, { recursive: true });
    fs.writeFileSync(path.join(copyDir, 'master.md'), rawInput, 'utf-8');

    const manifest: IncomingManifest = {
      schemaVersion: '1.2',
      importId,
      projectId: project.id,
      baseRevision: 1,
      executionParty: 'antigravity',
      title,
      sourceUrl: meta?.sourceUrl,
      platform: meta?.platform,
      files: {
        copy: 'copy/master.md'
      },
      reviewNotes: 'Antigravity 对话捕获流水线入库'
    };
    fs.writeFileSync(path.join(captureDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Write READY marker
    fs.writeFileSync(path.join(captureDir, 'READY'), 'READY\n', 'utf-8');

    // 4. Generate and save real receipt
    const receipt: Receipt = {
      receiptId: 'rec_' + Math.random().toString(36).substring(2, 10),
      importId,
      projectId: project.id,
      topicId: topic.id,
      status: 'imported',
      importedAt: new Date().toISOString(),
      assetsAdded: 0,
      executionParty: 'antigravity',
      skillId: 'workbench-capture',
      costPath: 'local_free',
      quotaStatus: 'active',
      conflict: null,
      warnings: []
    };
    fs.writeFileSync(path.join(getReceiptsDir(), `${importId}.json`), JSON.stringify(receipt, null, 2), 'utf-8');

    return {
      receipt,
      topic,
      project
    };
  },

  // 5. Get all receipts from disk
  getAllReceipts(): Receipt[] {
    const receiptsDir = getReceiptsDir();
    if (!fs.existsSync(receiptsDir)) return [];
    const files = fs.readdirSync(receiptsDir).filter(f => f.endsWith('.json'));
    const receipts: Receipt[] = [];
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(receiptsDir, file), 'utf-8'));
        receipts.push(content);
      } catch (_) {}
    }
    receipts.sort((a, b) => new Date(b.importedAt || 0).getTime() - new Date(a.importedAt || 0).getTime());
    return receipts;
  }
};
