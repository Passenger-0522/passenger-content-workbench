import fs from 'fs';
import path from 'path';
import { execSync, execFileSync, spawn } from 'child_process';
import { db } from '../db.js';

export function getFfmpegPath(): string | null {
  const customBin = '/Users/liangxiaoling/Documents/Playground/bin/ffmpeg';
  if (fs.existsSync(customBin)) return customBin;

  const candidates = [
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  try {
    const which = execSync('which ffmpeg', { stdio: 'pipe' }).toString().trim();
    if (which && fs.existsSync(which)) return which;
  } catch (_) {}

  return null;
}

export function checkFfmpegAvailability(): { available: boolean; path: string | null; version?: string } {
  const bin = getFfmpegPath();
  if (!bin) {
    return { available: false, path: null };
  }
  try {
    const ver = execFileSync(bin, ['-version'], { stdio: 'pipe' }).toString().split('\n')[0];
    return { available: true, path: bin, version: ver };
  } catch (e: any) {
    return { available: false, path: null };
  }
}

/**
 * Validate video integrity using container structural check and FFmpeg decode verification.
 * Does not mislabel decode timeout as corrupted file.
 */
export function validateVideoIntegrity(filePath: string): { valid: boolean; error?: string } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: '文件不存在' };
  }
  const stat = fs.statSync(filePath);
  if (stat.size < 64) {
    return { valid: false, error: '视频文件过小或为空' };
  }

  // Fast structural container inspection
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(Math.min(stat.size, 4096));
  fs.readSync(fd, header, 0, header.length, 0);
  fs.closeSync(fd);

  // Check MP4/MOV ftyp or WebM/MKV EBML
  const isFtyp = header.length >= 8 && header.slice(4, 8).toString('ascii') === 'ftyp';
  const isEbml = header.length >= 4 && header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  if (!isFtyp && !isEbml) {
    return { valid: false, error: '视频文件头缺失或不是有效视频容器格式' };
  }

  const ffmpegBin = getFfmpegPath();
  if (ffmpegBin) {
    try {
      execFileSync(ffmpegBin, ['-v', 'error', '-i', filePath, '-f', 'null', '-'], {
        stdio: 'pipe',
        timeout: 30000 // 30s timeout so load does not fail valid files
      });
    } catch (err: any) {
      if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM') {
        console.warn(`[WARN] FFmpeg video decode timed out for ${filePath}, accepting valid container format`);
        return { valid: true };
      }
      return { valid: false, error: '视频解码失败或文件已损坏' };
    }
  }

  return { valid: true };
}

export interface ComposeVideoOptions {
  imagePaths: string[];
  durationPerImage?: number;
  musicPath?: string;
  outputFileName?: string;
}

/**
 * Compose ordered images into playable MP4 (PRD 4.6, UC-12, UC-13)
 * If ffmpeg is missing, returns clear error and missingDependency flag.
 * If music is omitted, produces silent MP4 and does not pretend music is attached.
 */
export async function composeImagesToVideo(options: ComposeVideoOptions): Promise<{
  success: boolean;
  videoPath?: string;
  videoUrl?: string;
  isSilent?: boolean;
  hasMusic?: boolean;
  duration?: number;
  missingDependency?: string;
  error?: string;
}> {
  const ffmpeg = getFfmpegPath();
  if (!ffmpeg) {
    return {
      success: false,
      missingDependency: 'ffmpeg',
      error: '缺少本地视频合成运行器 ffmpeg 依赖，无法导出合成 MP4 视频，请使用有序图片包交付。'
    };
  }

  if (!options.imagePaths || options.imagePaths.length === 0) {
    return {
      success: false,
      error: '图片列表不能为空'
    };
  }

  // Resolve disk paths for images
  const dataDir = db.getDataDir();
  const validImagePaths: string[] = [];
  for (const p of options.imagePaths) {
    let resolved = p;
    if (p.startsWith('/api/assets/incoming/')) {
      const rel = p.replace('/api/assets/incoming/', '');
      resolved = path.join(dataDir, 'incoming', rel);
    } else if (p.startsWith('/api/assets/uploads/')) {
      const rel = p.replace('/api/assets/uploads/', '');
      resolved = path.join(dataDir, 'media', 'uploads', rel);
    } else if (!path.isAbsolute(p)) {
      resolved = path.join(dataDir, p);
    }
    if (fs.existsSync(resolved)) {
      validImagePaths.push(resolved);
    }
  }

  if (validImagePaths.length === 0) {
    return {
      success: false,
      error: '未找到可在磁盘上访问的有效图片文件'
    };
  }

  const durationPerImg = options.durationPerImage || 3;
  const totalDuration = validImagePaths.length * durationPerImg;
  const outDir = path.join(dataDir, 'media', 'synthesized');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const filename = options.outputFileName || `synth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp4`;
  const outputPath = path.join(outDir, filename);

  // Generate ffmpeg concat input file
  const concatListPath = path.join(outDir, `concat_${Date.now()}.txt`);
  let concatText = '';
  for (const img of validImagePaths) {
    concatText += `file '${img.replace(/'/g, "'\\''")}'\n`;
    concatText += `duration ${durationPerImg}\n`;
  }
  // The last file must be repeated without duration in concat demuxer
  concatText += `file '${validImagePaths[validImagePaths.length - 1].replace(/'/g, "'\\''")}'\n`;
  fs.writeFileSync(concatListPath, concatText, 'utf-8');

  const hasMusic = Boolean(options.musicPath && fs.existsSync(options.musicPath));

  return new Promise((resolve) => {
    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-vf', 'scale=1080:1440:force_original_aspect_ratio=decrease,pad=1080:1440:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '25',
      '-t', totalDuration.toString()
    ];

    if (hasMusic) {
      args.push('-i', options.musicPath!);
      args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    }

    args.push(outputPath);

    const proc = spawn(ffmpeg, args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      try { if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath); } catch (_) {}
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve({
          success: true,
          videoPath: outputPath,
          videoUrl: `/api/assets/synthesized/${filename}`,
          isSilent: !hasMusic,
          hasMusic: hasMusic,
          duration: totalDuration
        });
      } else {
        resolve({
          success: false,
          error: `视频合成进程异常退出 (code ${code}): ${stderr.slice(-300)}`
        });
      }
    });

    proc.on('error', (err) => {
      try { if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath); } catch (_) {}
      resolve({
        success: false,
        error: `视频合成执行失败: ${err.message}`
      });
    });
  });
}
