import React, { useState, useEffect, useRef } from 'react';
import {
  FolderPlus,
  FileText,
  Lock,
  Unlock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Send,
  Download,
  Share2,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Upload,
  Video,
  Image as ImageIcon,
  CheckSquare,
  FileDown,
  ArrowUp,
  ArrowDown,
  Film,
  Settings2,
  Sliders,
  Play,
  AlertCircle
} from 'lucide-react';
import {
  ContentProject,
  PlatformVariant,
  PlatformType,
  VariantFormat,
  VariantCover,
  MasterDraftRevision
} from '../types';
import { api } from '../api';

interface ProjectStudioProps {
  onRefreshKpi?: () => void;
  initialProjectId?: string | null;
}

const PLATFORM_LABELS: Record<PlatformType, { name: string; color: string; badge: string }> = {
  x: { name: 'X (推特)', color: 'text-sky-400 bg-sky-950/60 border-sky-800/60', badge: 'X' },
  xiaohongshu: { name: '小红书', color: 'text-rose-400 bg-rose-950/60 border-rose-800/60', badge: '红' },
  gzh: { name: '微信公众号', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60', badge: '公' },
  douyin: { name: '抖音', color: 'text-slate-200 bg-slate-900 border-slate-700', badge: '抖' },
  channels: { name: '微信视频号', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60', badge: '视' }
};

const PLATFORM_ALLOWED_FORMATS: Record<PlatformType, VariantFormat[]> = {
  x: ['short_post', 'thread', 'quote', 'repost', 'long_article'],
  xiaohongshu: ['image_text', 'video'],
  gzh: ['article', 'mini_image'],
  douyin: ['image_combo', 'video'],
  channels: ['video', 'image_combo']
};

const FORMAT_LABELS: Record<VariantFormat, { name: string; desc: string }> = {
  short_post: { name: '短推', desc: '单条精炼短推' },
  thread: { name: '推文串 (Thread)', desc: '多条串联拆解' },
  quote: { name: '引用推 (Quote)', desc: '带观点引述' },
  repost: { name: '转推 (Repost)', desc: '纯转发' },
  long_article: { name: '长推 / 长文', desc: '长篇深度文章' },
  image_text: { name: '图文笔记', desc: '封面+文案卡片' },
  video: { name: '短视频', desc: '视频原片+文案' },
  article: { name: '深度长文', desc: '公众号排版图文' },
  mini_image: { name: '小图文', desc: '图片配文动态' },
  image_card: { name: '图文卡片', desc: '卡片式图文' },
  image_combo: { name: '动感图文组合', desc: '多图轮播' }
};

export const ProjectStudio: React.FC<ProjectStudioProps> = ({ onRefreshKpi, initialProjectId }) => {
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('x');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectMaster, setNewProjectMaster] = useState('');

  // Editing state for selected variant
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // GZH preview mode: 'edit' | 'preview'
  const [gzhViewMode, setGzhViewMode] = useState<'edit' | 'preview'>('edit');

  // Media upload state
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New variant format picker modal
  const [isAddingVariantFormat, setIsAddingVariantFormat] = useState(false);

  // New revision modal / state
  const [isAddingRevision, setIsAddingRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionContent, setRevisionContent] = useState('');

  // Publish confirmation modal
  const [confirmingVariant, setConfirmingVariant] = useState<PlatformVariant | null>(null);
  const [publishUrl, setPublishUrl] = useState('');

  // Editable Channels Dual Cover Profiles (PRD Case 11)
  const [channelsProfiles, setChannelsProfiles] = useState([
    {
      id: 'vertical' as const,
      name: '竖屏视频主封面',
      purpose: '流播放 / 个人主页作品流',
      targetWidth: 1080,
      targetHeight: 1920,
      targetRatioStr: '9:16',
      assignedCoverId: ''
    },
    {
      id: 'horizontal' as const,
      name: '横屏分享/动态卡片封面',
      purpose: '分享卡片 / 公众号与朋友圈嵌入',
      targetWidth: 1920,
      targetHeight: 1080,
      targetRatioStr: '16:9',
      assignedCoverId: ''
    }
  ]);
  const [isEditingChannelsProfiles, setIsEditingChannelsProfiles] = useState(false);

  // Multi-card / Ordered Images & Local Video Compose Runner (PRD Cases 7, 12, 13)
  const [cardTexts, setCardTexts] = useState<Record<string, string>>({});
  const [isComposingVideo, setIsComposingVideo] = useState(false);
  const [composeDuration, setComposeDuration] = useState(3);
  const [composeMusicPath, setComposeMusicPath] = useState('');
  const [composedVideoResult, setComposedVideoResult] = useState<any>(null);
  const [composeError, setComposeError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const list = await api.getProjects();
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (e: any) {
      console.error('Failed to load projects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const currentProject = projects.find(p => p.id === selectedProjectId) || null;
  const currentVariants = currentProject?.variants || [];
  
  // All variants for currently selected platform
  const platformVariants = currentVariants.filter(v => v.platform === selectedPlatform);
  
  // Currently active variant (matched by ID, or fallback to first of this platform)
  const currentVariant = platformVariants.find(v => v.id === selectedVariantId) || (platformVariants.length > 0 ? platformVariants[0] : null);

  useEffect(() => {
    if (currentVariant) {
      setEditingContent(currentVariant.content || '');
      setEditingTitle(currentVariant.title || '');
      setCardTexts(currentVariant.cardPageTexts || {});
      if (currentVariant.channelsProfiles && currentVariant.channelsProfiles.length > 0) {
        setChannelsProfiles(currentVariant.channelsProfiles as any);
      } else {
        setChannelsProfiles([
          {
            id: 'vertical' as const,
            name: '竖屏视频主封面',
            purpose: '流播放 / 个人主页作品流',
            targetWidth: 1080,
            targetHeight: 1920,
            targetRatioStr: '9:16',
            assignedCoverId: currentVariant.covers?.find(c => c.usage === 'channels_vertical')?.id || ''
          },
          {
            id: 'horizontal' as const,
            name: '横屏分享/动态卡片封面',
            purpose: '分享卡片 / 公众号与朋友圈嵌入',
            targetWidth: 1920,
            targetHeight: 1080,
            targetRatioStr: '16:9',
            assignedCoverId: currentVariant.covers?.find(c => c.usage === 'channels_horizontal')?.id || ''
          }
        ]);
      }
      if (selectedVariantId !== currentVariant.id) {
        setSelectedVariantId(currentVariant.id);
      }
    } else {
      setEditingContent(currentProject?.masterDraft.revisions?.[0]?.content || '');
      setEditingTitle(currentProject?.title || '');
      setCardTexts({});
      setSelectedVariantId(null);
    }
  }, [currentVariant?.id, selectedPlatform, selectedProjectId]);

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim() || !newProjectMaster.trim()) {
      alert('请填写项目标题与母稿正文');
      return;
    }
    try {
      const p = await api.createProject({
        title: newProjectTitle,
        masterContent: newProjectMaster
      });
      setProjects([p, ...projects]);
      setSelectedProjectId(p.id);
      setIsCreatingProject(false);
      setNewProjectTitle('');
      setNewProjectMaster('');
    } catch (err: any) {
      alert('创建项目失败: ' + err.message);
    }
  };

  const handleToggleLock = async () => {
    if (!currentProject) return;
    const isCurrentlyLocked = currentProject.masterDraft.revisions?.some(r => r.locked);
    const updatedRevisions = currentProject.masterDraft.revisions.map((r, idx) =>
      idx === 0 ? { ...r, locked: !isCurrentlyLocked } : r
    );
    try {
      const res = await api.updateProject(currentProject.id, {
        masterDraft: {
          ...currentProject.masterDraft,
          revisions: updatedRevisions
        }
      });
      setProjects(projects.map(p => p.id === res.id ? res : p));
    } catch (e: any) {
      alert('锁定状态切换失败: ' + e.message);
    }
  };

  const handleAddRevision = async () => {
    if (!currentProject || !revisionContent.trim()) return;
    try {
      const res = await api.addProjectRevision(
        currentProject.id,
        revisionContent,
        'user',
        revisionNote || '人工确认正文修订'
      );
      setProjects(projects.map(p => p.id === res.id ? res : p));
      setIsAddingRevision(false);
      setRevisionNote('');
    } catch (e: any) {
      alert('添加修订失败: ' + e.message);
    }
  };

  // Add new format variant on the same platform
  const handleAddNewFormatVariant = async (format: VariantFormat) => {
    if (!currentProject) return;
    try {
      const defaultTitle = currentProject.title;
      const defaultContent = currentProject.masterDraft.revisions?.[0]?.content || '';
      const newVar = await api.addVariant(currentProject.id, {
        platform: selectedPlatform,
        format,
        title: defaultTitle,
        candidateTitles: [defaultTitle],
        content: defaultContent,
        tags: ['实操'],
        covers: [],
        status: 'draft'
      });
      const updatedVariants = [...(currentProject.variants || []), newVar];
      setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
      setSelectedVariantId(newVar.id);
      setIsAddingVariantFormat(false);
    } catch (e: any) {
      alert('添加格式变体失败: ' + e.message);
    }
  };

  // Save variant as Draft (never rejects for missing assets)
  const handleSaveVariantDraft = async () => {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      if (currentVariant) {
        const updated = await api.updateVariant(currentProject.id, currentVariant.id, {
          title: editingTitle,
          content: editingContent,
          status: currentVariant.status === 'published' ? 'published' : 'draft',
          covers: currentVariant.covers || [],
          cardPageTexts: cardTexts,
          channelsProfiles: channelsProfiles as any
        });
        const updatedVariants = currentProject.variants.map(v => v.id === updated.id ? updated : v);
        setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
      } else {
        const defaultFormat = PLATFORM_ALLOWED_FORMATS[selectedPlatform][0];
        const created = await api.addVariant(currentProject.id, {
          platform: selectedPlatform,
          format: defaultFormat,
          title: editingTitle,
          candidateTitles: [editingTitle],
          content: editingContent,
          tags: ['实操'],
          covers: [],
          status: 'draft',
          cardPageTexts: cardTexts,
          channelsProfiles: channelsProfiles as any
        });
        const updatedVariants = [...(currentProject.variants || []), created];
        setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
        setSelectedVariantId(created.id);
      }
      alert('💾 草稿已成功保存！');
    } catch (e: any) {
      alert('保存失败: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Mark variant as Ready (Completeness-gated action!)
  const handleMarkAsReady = async () => {
    if (!currentProject || !currentVariant) return;

    // Completeness validation checks
    const format = currentVariant.format;
    const validCovers = (currentVariant.covers || []).filter(c => c.verifiedOnDisk || c.url);

    if (format === 'image_text' || format === 'image_combo') {
      if (validCovers.length === 0) {
        alert('❌ 无法标记为已就绪：图文变体必须包含至少 1 张封面或排版图片！请先上传或导入图片素材。');
        return;
      }
    } else if (format === 'video') {
      if (validCovers.length === 0) {
        alert('❌ 无法标记为已就绪：视频变体必须提供视频封面图片！');
        return;
      }
      const hasVid = currentVariant.videoUrl || currentVariant.videoPath || currentProject.baseVideo;
      if (!hasVid) {
        alert('❌ 无法标记为已就绪：视频变体必须上传视频素材或关联母版基础视频！');
        return;
      }
    }

    try {
      setIsSaving(true);
      const updated = await api.updateVariant(currentProject.id, currentVariant.id, {
        title: editingTitle,
        content: editingContent,
        status: 'ready',
        covers: currentVariant.covers || [],
        cardPageTexts: cardTexts,
        channelsProfiles: channelsProfiles as any
      });
      const updatedVariants = currentProject.variants.map(v => v.id === updated.id ? updated : v);
      setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
      alert('✅ 变体素材已齐套，已成功标记为「已就绪 (ready)」！');
    } catch (e: any) {
      alert('标记就绪失败: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Media file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject || !currentVariant) return;

    setIsUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const isVid = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov');
        const uploadRes = await api.uploadMedia(file.name, base64Data, isVid ? 'video' : 'image');

        if (isVid) {
          // Bind video
          const updated = await api.updateVariant(currentProject.id, currentVariant.id, {
            videoUrl: uploadRes.url,
            videoPath: uploadRes.path,
            videoId: uploadRes.assetId,
            videoName: uploadRes.filename
          });
          await api.updateProject(currentProject.id, {
            baseVideo: {
              id: uploadRes.assetId,
              url: uploadRes.url,
              path: uploadRes.path,
              name: uploadRes.filename
            }
          });
          const updatedVariants = currentProject.variants.map(v => v.id === updated.id ? updated : v);
          setProjects(projects.map(p => p.id === currentProject.id ? {
            ...p,
            variants: updatedVariants,
            baseVideo: { id: uploadRes.assetId, url: uploadRes.url, path: uploadRes.path, name: uploadRes.filename }
          } : p));
          alert(`🎬 视频文件「${file.name}」已成功上传并通过 FFmpeg 完整性检验！已设为项目通用视频素材。`);
        } else {
          // Bind cover
          const newCover: VariantCover = {
            id: uploadRes.assetId,
            name: file.name,
            usage: selectedPlatform === 'channels' ? 'channels_vertical' : 'primary',
            ratio: uploadRes.ratio || (uploadRes.width && uploadRes.height ? `${uploadRes.width}:${uploadRes.height}` : '3:4'),
            url: uploadRes.url,
            prompt: '',
            verifiedOnDisk: true,
            width: uploadRes.width,
            height: uploadRes.height
          };
          const updatedCovers = [...(currentVariant.covers || []), newCover];
          const updated = await api.updateVariant(currentProject.id, currentVariant.id, {
            covers: updatedCovers
          });
          const updatedVariants = currentProject.variants.map(v => v.id === updated.id ? updated : v);
          setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
          alert(`🖼️ 真实图片「${file.name}」已上传落盘（${uploadRes.width}x${uploadRes.height}）！`);
        }
      } catch (err: any) {
        alert('素材上传失败: ' + err.message);
      } finally {
        setIsUploadingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Dual MIME HTML + Plain Text Copy for WeChat Official Accounts
  const handleCopyGzhRich = async () => {
    if (!editingContent) return;

    // Convert markdown headings and paragraphs into elegant WeChat Official Account HTML
    const formattedHtml = generateWeChatHtml(editingTitle, editingContent, currentVariant?.covers || []);

    try {
      if (typeof window.ClipboardItem !== 'undefined') {
        const textBlob = new Blob([editingContent], { type: 'text/plain' });
        const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
        const item = new window.ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(editingContent);
      }
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2500);
      alert('✨ 公众号富文本已成功复制到剪贴板！可以直接在微信公众号编辑器中按 ⌘V / Ctrl+V 粘贴，保留绿色标题栏、引用框与段落排版！');
    } catch (e: any) {
      await navigator.clipboard.writeText(editingContent);
      alert('已降级复制纯文本 Markdown。');
    }
  };

  function escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Parse numeric ratio from string (e.g. "9:16" -> 0.5625, "1086:1448" -> 0.75)
  function parseCoverNumericRatio(ratioStr?: string): number {
    if (!ratioStr) return 1;
    const parts = ratioStr.split(':').map(Number);
    if (parts.length === 2 && parts[1] > 0) return parts[0] / parts[1];
    return 1;
  }

  // Helper: WeChat HTML generator with green accents, clean typography, escaped text & body image mapping
  const generateWeChatHtml = (title: string, markdownText: string, covers: VariantCover[]) => {
    const lines = markdownText.split('\n');
    let html = `<section style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #222; line-height: 1.8; letter-spacing: 0.5px; padding: 10px 0;">`;

    if (title) {
      html += `<h1 style="font-size: 20px; font-weight: bold; color: #07c160; margin-bottom: 16px; border-bottom: 2px solid #07c160; padding-bottom: 8px;">${escapeHtml(title)}</h1>`;
    }

    // Cover image at top
    const headerCover = covers.find(c => c.usage === 'primary' || c.usage === 'channels_vertical') || covers[0];
    const bodyImages = covers.filter(c => c !== headerCover);

    if (headerCover && headerCover.url) {
      html += `<div style="margin: 16px 0; text-align: center;"><img src="${escapeHtml(headerCover.url)}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" /><p style="font-size: 12px; color: #888; margin-top: 6px;">[封面图 - ${escapeHtml(headerCover.ratio || '标准')}]</p></div>`;
    }

    let bodyImgIdx = 0;
    let inList = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (inList) { html += `</ul>`; inList = false; }
        continue;
      }

      // Check for explicit image marker like [插图1] or [图1]
      const imgMarkerMatch = line.match(/^\[(?:插图|图)(\d+)\]$/);
      if (imgMarkerMatch) {
        if (inList) { html += `</ul>`; inList = false; }
        const idx = parseInt(imgMarkerMatch[1], 10) - 1;
        const targetImg = bodyImages[idx] || covers[idx];
        if (targetImg && targetImg.url) {
          html += `<div style="margin: 18px 0; text-align: center;"><img src="${escapeHtml(targetImg.url)}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" /><p style="font-size: 12px; color: #888; margin-top: 4px;">[图${idx + 1}: ${escapeHtml(targetImg.name || '正文配图')}]</p></div>`;
        }
        continue;
      }

      if (line.startsWith('### ')) {
        if (inList) { html += `</ul>`; inList = false; }
        html += `<h3 style="font-size: 16px; font-weight: bold; color: #111; margin: 18px 0 8px 0; display: flex; align-items: center;"><span style="display: inline-block; width: 4px; height: 16px; background: #07c160; margin-right: 8px; border-radius: 2px;"></span>${escapeHtml(line.slice(4))}</h3>`;
        if (bodyImgIdx < bodyImages.length && !markdownText.includes('[插图')) {
          const curImg = bodyImages[bodyImgIdx++];
          if (curImg?.url) {
            html += `<div style="margin: 14px 0; text-align: center;"><img src="${escapeHtml(curImg.url)}" style="max-width: 100%; border-radius: 6px;" /><p style="font-size: 11px; color: #888; margin-top: 4px;">[插图${bodyImgIdx}: ${escapeHtml(curImg.name || '')}]</p></div>`;
          }
        }
      } else if (line.startsWith('## ')) {
        if (inList) { html += `</ul>`; inList = false; }
        html += `<h2 style="font-size: 17px; font-weight: bold; color: #07c160; margin: 24px 0 10px 0; border-left: 4px solid #07c160; padding-left: 10px;">${escapeHtml(line.slice(3))}</h2>`;
      } else if (line.startsWith('# ')) {
        if (inList) { html += `</ul>`; inList = false; }
        html += `<h1 style="font-size: 19px; font-weight: bold; color: #07c160; margin: 24px 0 12px 0;">${escapeHtml(line.slice(2))}</h1>`;
      } else if (line.startsWith('> ')) {
        if (inList) { html += `</ul>`; inList = false; }
        html += `<blockquote style="margin: 14px 0; padding: 10px 14px; background: #f7f9fa; border-left: 3px solid #07c160; color: #555; font-size: 14px; border-radius: 4px;">${escapeHtml(line.slice(2))}</blockquote>`;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) { html += `<ul style="margin: 10px 0; padding-left: 20px; color: #333;">`; inList = true; }
        html += `<li style="margin-bottom: 6px;">${escapeHtml(line.slice(2))}</li>`;
      } else {
        if (inList) { html += `</ul>`; inList = false; }
        html += `<p style="margin: 12px 0; color: #333;">${escapeHtml(line)}</p>`;
      }
    }
    if (inList) html += `</ul>`;
    html += `</section>`;
    return html;
  };

  const handleExportGzhPackage = () => {
    if (!currentProject || !currentVariant) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const sourceUrls = currentProject.sources?.map(s => s.url).filter(Boolean) || [];
    const sourceIds = currentProject.sources?.map(s => s.id).filter(Boolean) || [];

    const lines = [
      '---',
      `projectId: "${currentProject.id}"`,
      `variantId: "${currentVariant.id}"`,
      `platform: "gzh"`,
      `format: "${currentVariant.format}"`,
      `title: "${currentVariant.title}"`,
      `date: "${dateStr}"`,
      `revision: ${currentProject.masterDraft?.currentRev || 1}`,
      `sourceIds: ${JSON.stringify(sourceIds)}`,
      `sourceUrls: ${JSON.stringify(sourceUrls)}`,
      `publicationState: "${currentVariant.status}"`,
      `coversCount: ${currentVariant.covers?.length || 0}`,
      '---',
      '',
      `# ${currentVariant.title}`,
      '',
      currentVariant.content,
      '',
      '## 图片插图清单与排版映射点',
      ''
    ];
    (currentVariant.covers || []).forEach((c, idx) => {
      const isHeaderCover = c.usage === 'primary' || idx === 0;
      const roleDesc = isHeaderCover ? '封面主图' : `正文插图 [插图${idx}]`;
      lines.push(`- [图${idx + 1}] 用途: ${c.usage} (${roleDesc}) | 比例: ${c.ratio} | 本地URL: ${c.url}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gzh-article-${currentProject.id}-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reorder covers/cards
  const handleReorderCover = (index: number, direction: 'up' | 'down') => {
    if (!currentVariant || !currentProject) return;
    const covers = [...(currentVariant.covers || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= covers.length) return;
    const temp = covers[index];
    covers[index] = covers[targetIndex];
    covers[targetIndex] = temp;
    
    const updatedVariants = currentProject.variants.map(v => v.id === currentVariant.id ? { ...v, covers } : v);
    setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
    api.updateVariant(currentProject.id, currentVariant.id, { covers }).catch(err => {
      console.error('Failed to auto-save reordered covers:', err);
    });
  };

  // Export ordered card deck
  const handleExportOrderedDeck = () => {
    if (!currentProject || !currentVariant) return;
    const lines = [
      '---',
      `projectId: "${currentProject.id}"`,
      `variantId: "${currentVariant.id}"`,
      `format: "${currentVariant.format}"`,
      `cardsCount: ${currentVariant.covers?.length || 0}`,
      `date: "${new Date().toISOString()}"`,
      '---',
      '',
      `# 有序图文卡片清单: ${currentVariant.title}`,
      '',
      currentVariant.content,
      '',
      '## 卡片分页与独立文案清单',
      ''
    ];
    (currentVariant.covers || []).forEach((c, idx) => {
      const pageText = cardTexts[c.id] || '';
      lines.push(`### 卡片 P${idx + 1} (${c.ratio})`);
      lines.push(`- 图片URL: ${c.url}`);
      lines.push(`- 尺寸: ${c.width || '?'}×${c.height || '?'}`);
      lines.push(`- 本页独立卡片文案: ${pageText || '（无单独卡片文案，使用主文案）'}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordered-deck-${currentProject.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run local silent MP4 video composer via ffmpeg
  const handleRunComposeVideo = async () => {
    if (!currentVariant || !currentVariant.covers || currentVariant.covers.length === 0) {
      alert('请先上传至少一张卡片图片以进行合成');
      return;
    }
    try {
      setIsComposingVideo(true);
      setComposeError(null);
      setComposedVideoResult(null);
      const imagePaths = currentVariant.covers.map(c => c.url).filter(Boolean);
      const res = await api.composeImagesToVideo({
        imagePaths,
        durationPerImage: composeDuration,
        musicPath: composeMusicPath.trim() || undefined
      });
      if (!res.success) {
        if (res.missingDependency === 'ffmpeg') {
          setComposeError('⚠️ 缺少本地视频合成运行器 ffmpeg 依赖，无法在本地执行 MP4 导出。请使用上方「导出有序图片包」交付，或在系统 PATH 中安装 ffmpeg。');
        } else {
          setComposeError(res.error || '合成执行异常');
        }
      } else {
        setComposedVideoResult(res);
        alert(`🎉 本地图片视频合成成功！输出时长: ${res.duration}s，无背景音乐静音 MP4 已生成。`);
      }
    } catch (e: any) {
      setComposeError(e.message);
    } finally {
      setIsComposingVideo(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!currentProject || !confirmingVariant) return;
    try {
      const res = await api.confirmPublish(
        currentProject.id,
        confirmingVariant.id,
        publishUrl.trim() || undefined
      );
      alert(`🎉 发布确认成功！\n今日已计入发布 KPI (+1)`);
      setConfirmingVariant(null);
      setPublishUrl('');
      loadProjects();
      if (onRefreshKpi) onRefreshKpi();
    } catch (e: any) {
      alert('发布确认失败: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for media upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>内容项目与多平台版本工坊</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            同平台多格式并存 · 真实媒体素材上传与落盘 · 微信公众号富文本排版 · 视频号双封面核验
          </p>
        </div>
        <button
          onClick={() => setIsCreatingProject(true)}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/20"
        >
          <FolderPlus className="w-4 h-4" />
          <span>新建内容项目</span>
        </button>
      </div>

      {/* Main Layout: Project List Sidebar + Detail Panel */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Projects List */}
        <div className="col-span-4 bg-[#14161c] border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
            <span>项目与历史文稿 ({projects.length})</span>
            <button onClick={loadProjects} className="hover:text-slate-200">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[740px] overflow-y-auto pr-1">
            {projects.map(p => {
              const isSelected = p.id === selectedProjectId;
              const hasCoversToReview = p.variants?.some(v => v.covers?.some(c => c.needsReview));
              const isLocked = p.masterDraft?.revisions?.some(r => r.locked);
              const isLegacy = Boolean(p.isLegacyDraft);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/80 border-indigo-500/80 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-semibold text-slate-100 line-clamp-1">{p.title}</h4>
                    <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                      {isLegacy && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          历史草稿
                        </span>
                      )}
                      {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {p.masterDraft?.revisions?.[0]?.content}
                  </p>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                    <span>Rev {p.masterDraft?.currentRev || 1}</span>
                    <div className="flex items-center space-x-1">
                      {p.variants?.map(v => (
                        <span
                          key={v.id}
                          className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center bg-slate-800 text-slate-300"
                          title={`${PLATFORM_LABELS[v.platform]?.name} - ${FORMAT_LABELS[v.format]?.name || v.format}`}
                        >
                          {PLATFORM_LABELS[v.platform]?.badge || v.platform[0]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {hasCoversToReview && (
                    <div className="mt-1.5 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/50 text-[10px] text-amber-300 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">旧封面待重新核验</span>
                    </div>
                  )}
                </div>
              );
            })}

            {projects.length === 0 && !isLoading && (
              <div className="p-8 text-center text-xs text-slate-500">
                暂无项目，点击右上角新建一个
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Project & Variant Editor */}
        <div className="col-span-8 space-y-4">
          {currentProject ? (
            <div className="space-y-4">
              {/* Project Master Card */}
              <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <span>项目权威母稿 (Master Draft)</span>
                      {currentProject.isLegacyDraft && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] lowercase font-sans">
                          {currentProject.sourceFile || '历史存档'}
                        </span>
                      )}
                    </span>
                    <h3 className="text-sm font-bold text-white">{currentProject.title}</h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleToggleLock}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center space-x-1 transition ${
                        currentProject.masterDraft?.revisions?.some(r => r.locked)
                          ? 'bg-amber-950/80 border-amber-700/60 text-amber-300 hover:bg-amber-900/80'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {currentProject.masterDraft?.revisions?.some(r => r.locked) ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>已锁定保护</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-slate-400" />
                          <span>未锁定</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setRevisionContent(currentProject.masterDraft.revisions?.[0]?.content || '');
                        setIsAddingRevision(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition"
                    >
                      产生新修订 (Rev {currentProject.masterDraft.currentRev + 1})
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto font-sans">
                  {currentProject.masterDraft.revisions?.[0]?.content}
                </div>

                {/* Revision History Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto pt-1 text-[11px] text-slate-400">
                  <span className="shrink-0 text-slate-500 font-mono">修订历史:</span>
                  {currentProject.masterDraft.revisions?.map(rev => (
                    <span
                      key={rev.rev}
                      className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 shrink-0 font-mono"
                    >
                      Rev {rev.rev} ({rev.author}) {rev.locked ? '🔒' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Platform & Variant Multi-Format Workspace */}
              <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-4 space-y-4">
                {/* 1. Main Platform Tabs */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    {(['x', 'xiaohongshu', 'gzh', 'douyin', 'channels'] as PlatformType[]).map(plat => {
                      const isActive = selectedPlatform === plat;
                      const platVars = currentVariants.filter(v => v.platform === plat);
                      const hasVar = platVars.length > 0;
                      const isPub = platVars.some(v => v.status === 'published');

                      return (
                        <button
                          key={plat}
                          onClick={() => {
                            setSelectedPlatform(plat);
                            const firstVar = currentVariants.find(v => v.platform === plat);
                            setSelectedVariantId(firstVar ? firstVar.id : null);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span>{PLATFORM_LABELS[plat].name}</span>
                          {hasVar && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                              {platVars.length}
                            </span>
                          )}
                          {isPub && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {currentVariant && currentVariant.status !== 'published' && (
                    <button
                      onClick={() => setConfirmingVariant(currentVariant)}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>记录已发布</span>
                    </button>
                  )}
                </div>

                {/* 2. Sub-Row: Multi-Format Variant Selection for THIS Platform */}
                <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="flex items-center space-x-2 overflow-x-auto">
                    <span className="text-[11px] text-slate-400 font-medium shrink-0 mr-1">
                      {PLATFORM_LABELS[selectedPlatform].name} 格式变体:
                    </span>
                    {platformVariants.map(v => {
                      const isSelected = currentVariant?.id === v.id;
                      const statusColor = v.status === 'published'
                        ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40'
                        : v.status === 'ready'
                        ? 'text-indigo-400 border-indigo-700/80 bg-indigo-950/40'
                        : 'text-slate-300 border-slate-700 bg-slate-900';

                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition shrink-0 ${
                            isSelected ? 'ring-2 ring-indigo-500 ' + statusColor : statusColor + ' opacity-75 hover:opacity-100'
                          }`}
                        >
                          <span>{FORMAT_LABELS[v.format]?.name || v.format}</span>
                          <span className="text-[10px] font-mono opacity-80">
                            {v.status === 'published' ? '已发布' : v.status === 'ready' ? '已就绪' : '草稿'}
                          </span>
                        </button>
                      );
                    })}

                    {platformVariants.length === 0 && (
                      <span className="text-xs text-slate-500">
                        该平台暂无任何变体，点击右侧添加一个格式版本
                      </span>
                    )}
                  </div>

                  {/* Add Format Button */}
                  <button
                    onClick={() => setIsAddingVariantFormat(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 shrink-0 ml-2 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加格式变体</span>
                  </button>
                </div>

                {/* 3. Variant Editor Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      {PLATFORM_LABELS[selectedPlatform].name} · {currentVariant ? FORMAT_LABELS[currentVariant.format]?.name : '变体'} 标题
                    </label>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      placeholder="输入适合该平台调性的标题..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* View mode toggle for GZH */}
                  {selectedPlatform === 'gzh' && (
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="inline-flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                        <button
                          onClick={() => setGzhViewMode('edit')}
                          className={`px-3 py-1 rounded-md font-medium transition ${
                            gzhViewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          编辑 Markdown 正文
                        </button>
                        <button
                          onClick={() => setGzhViewMode('preview')}
                          className={`px-3 py-1 rounded-md font-medium flex items-center space-x-1 transition ${
                            gzhViewMode === 'preview' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>公众号富文本排版预览</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleCopyGzhRich}
                          className="px-3 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                        >
                          {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedHtml ? '已复制富文本！' : '复制到公众号 (带排版与图片)'}</span>
                        </button>

                        <button
                          onClick={handleExportGzhPackage}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition border border-slate-700"
                          title="导出带图片插图清单与排版映射点的图文包"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>导出图文包</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Body Editor OR GZH Formatted Preview */}
                  {selectedPlatform === 'gzh' && gzhViewMode === 'preview' ? (
                    <div className="p-4 bg-white rounded-xl text-slate-900 border border-slate-300 max-h-96 overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: generateWeChatHtml(editingTitle, editingContent, currentVariant?.covers || []) }} />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-400">
                          {PLATFORM_LABELS[selectedPlatform].name} 专用发布正文
                        </label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(editingContent);
                            setCopiedText(true);
                            setTimeout(() => setCopiedText(false), 2000);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                        >
                          {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText ? '已复制' : '复制纯文本'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={8}
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        placeholder="输入该平台的定制文案..."
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                      />
                    </div>
                  )}

                  {/* Media Section: Video & Covers */}
                  {currentVariant && (
                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                          <ImageIcon className="w-4 h-4 text-indigo-400" />
                          <span>媒体素材 (Covers & Video)</span>
                        </span>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingMedia}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1 transition shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isUploadingMedia ? '正在落盘校验...' : '上传真实素材 (图片/视频)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Video Player / Attachment slot if video format */}
                      {(currentVariant.format === 'video' || currentVariant.videoUrl) && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                            <span className="flex items-center space-x-1.5">
                              <Video className="w-4 h-4 text-purple-400" />
                              <span>关联视频原片: {currentVariant.videoName || '尚未上传视频'}</span>
                            </span>
                            {currentVariant.videoUrl && (
                              <span className="text-[10px] text-emerald-400 font-mono">已校验通过</span>
                            )}
                          </div>

                          {currentVariant.videoUrl ? (
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 max-h-48 flex items-center justify-center">
                              <video src={currentVariant.videoUrl} controls className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="py-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg space-y-2">
                              <div>短视频变体需要上传真实 .mp4 / .mov 文件</div>
                              {currentProject.baseVideo && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const updated = await api.updateVariant(currentProject.id, currentVariant.id, {
                                        videoUrl: currentProject.baseVideo!.url,
                                        videoPath: currentProject.baseVideo!.path,
                                        videoId: currentProject.baseVideo!.id,
                                        videoName: currentProject.baseVideo!.name
                                      });
                                      const updatedVariants = currentProject.variants.map(v => v.id === updated.id ? updated : v);
                                      setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
                                    }}
                                    className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-lg text-purple-200 text-xs inline-flex items-center space-x-1.5 transition"
                                  >
                                    <Video className="w-3.5 h-3.5 text-purple-400" />
                                    <span>复用项目基础视频 ({currentProject.baseVideo.name})</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Channels Dual Cover Manager (Special 9:16 + 16:9 profiles with Editable specs & Deviation Warning) */}
                      {selectedPlatform === 'channels' && (
                        <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-3">
                          <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                            <div className="flex items-center space-x-2">
                              <span>视频号双封面规范 (竖屏 9:16 + 横屏 16:9)</span>
                              <span className="text-[10px] text-amber-400/80 font-mono">双比例独立输出</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsEditingChannelsProfiles(!isEditingChannelsProfiles)}
                              className="px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-900/60 text-amber-200 text-[10px] flex items-center space-x-1 transition"
                            >
                              <Settings2 className="w-3 h-3" />
                              <span>{isEditingChannelsProfiles ? '完成规格编辑' : '编辑封面规格'}</span>
                            </button>
                          </div>

                          {/* Editable Specs Panel if toggled */}
                          {isEditingChannelsProfiles && (
                            <div className="p-2.5 rounded-lg bg-slate-950 border border-amber-800/40 space-y-2 text-xs">
                              <span className="text-[11px] text-amber-300 font-semibold block">编辑目标封面推荐尺寸（非平台硬编码）：</span>
                              <div className="grid grid-cols-2 gap-3">
                                {channelsProfiles.map((p, pIdx) => (
                                  <div key={p.id} className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                                    <span className="font-semibold text-slate-200 text-[11px]">{p.name} ({p.targetRatioStr})</span>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <div>
                                        <span className="text-slate-500 block">宽 (px)</span>
                                        <input
                                          type="number"
                                          value={p.targetWidth}
                                          onChange={e => {
                                            const w = parseInt(e.target.value) || 1080;
                                            const updated = [...channelsProfiles];
                                            updated[pIdx] = { ...p, targetWidth: w };
                                            setChannelsProfiles(updated);
                                          }}
                                          className="w-full px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block">高 (px)</span>
                                        <input
                                          type="number"
                                          value={p.targetHeight}
                                          onChange={e => {
                                            const h = parseInt(e.target.value) || 1920;
                                            const updated = [...channelsProfiles];
                                            updated[pIdx] = { ...p, targetHeight: h };
                                            setChannelsProfiles(updated);
                                          }}
                                          className="w-full px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {channelsProfiles.map((p, pIdx) => {
                              const targetRatio = p.targetWidth / p.targetHeight;
                              // Match cover by assignedCoverId or closest aspect ratio
                              let matchedCover: VariantCover | null = null;
                              if (p.assignedCoverId && currentVariant.covers) {
                                matchedCover = currentVariant.covers.find(c => c.id === p.assignedCoverId) || null;
                              }
                              if (!matchedCover && currentVariant.covers && currentVariant.covers.length > 0) {
                                let minDiff = Infinity;
                                for (const c of currentVariant.covers) {
                                  let ratioNum = 1;
                                  if (c.width && c.height) {
                                    ratioNum = c.width / c.height;
                                  } else if (c.ratio) {
                                    const parts = c.ratio.split(':').map(Number);
                                    if (parts.length === 2 && parts[1] > 0) ratioNum = parts[0] / parts[1];
                                  }
                                  const diff = Math.abs(ratioNum - targetRatio);
                                  if (diff < minDiff) {
                                    minDiff = diff;
                                    matchedCover = c;
                                  }
                                }
                              }

                              // Calculate deviation
                              let deviationWarning: string | null = null;
                              if (matchedCover) {
                                let actualRatio: number | null = null;
                                if (matchedCover.width && matchedCover.height) {
                                  actualRatio = matchedCover.width / matchedCover.height;
                                } else if (matchedCover.ratio) {
                                  const parts = matchedCover.ratio.split(':').map(Number);
                                  if (parts.length === 2 && parts[1] > 0) actualRatio = parts[0] / parts[1];
                                }
                                if (actualRatio !== null) {
                                  const diff = Math.abs(actualRatio - targetRatio) / targetRatio;
                                  if (diff > 0.08) {
                                    deviationWarning = `尺寸比例偏差 ${(diff * 100).toFixed(0)}% (实际: ${actualRatio.toFixed(2)}, 目标: ${targetRatio.toFixed(2)})`;
                                  }
                                }
                              }

                              return (
                                <div key={p.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-200">
                                    <span>{p.name} ({p.targetRatioStr})</span>
                                    <span className="font-mono text-[10px] text-indigo-400">{p.purpose}</span>
                                  </div>

                                  {/* Cover assignment dropdown */}
                                  {currentVariant.covers && currentVariant.covers.length > 1 && (
                                    <div className="flex items-center space-x-1.5 text-[10px]">
                                      <span className="text-slate-400 shrink-0">指定素材:</span>
                                      <select
                                        value={p.assignedCoverId || matchedCover?.id || ''}
                                        onChange={e => {
                                          const updated = [...channelsProfiles];
                                          updated[pIdx] = { ...p, assignedCoverId: e.target.value };
                                          setChannelsProfiles(updated);
                                        }}
                                        className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 text-[10px] focus:outline-none"
                                      >
                                        <option value="">自动就近匹配</option>
                                        {currentVariant.covers.map((c, cIdx) => (
                                          <option key={c.id} value={c.id}>
                                            素材 {cIdx + 1}: {c.name || c.id} ({c.width && c.height ? `${c.width}×${c.height}` : c.ratio})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {/* Preview box */}
                                  <div className={`bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800 max-h-36 ${
                                    p.id === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'
                                  }`}>
                                    {matchedCover?.url ? (
                                      <img
                                        src={matchedCover.url}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-slate-500">待上传 {p.targetRatioStr} 素材</span>
                                    )}
                                  </div>

                                  {/* Deviation warning */}
                                  {deviationWarning && (
                                    <div className="text-[10px] text-amber-400 font-medium flex items-center space-x-1 bg-amber-950/40 p-1.5 rounded border border-amber-900/60">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>⚠️ {deviationWarning}</span>
                                    </div>
                                  )}

                                  {/* Download button */}
                                  {matchedCover?.url && (
                                    <a
                                      href={matchedCover.url}
                                      download={`channels-cover-${p.id}.png`}
                                      className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center justify-center space-x-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>下载 {p.name}</span>
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Multi-Card Deck & Silent MP4 Runner (PRD cases 7, 12, 13) */}
                      {currentVariant.covers && currentVariant.covers.length > 0 && (
                        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Layers className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs font-bold text-slate-200">
                                多图卡片分页与排序管理 ({currentVariant.covers.length} 页)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleExportOrderedDeck}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition border border-slate-700"
                              title="导出有序图文包与分页独立文案"
                            >
                              <Download className="w-3.5 h-3.5 text-indigo-400" />
                              <span>导出有序图文包 (Markdown)</span>
                            </button>
                          </div>

                          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {currentVariant.covers.map((cov, idx) => (
                              <div key={cov.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                                {/* Thumbnail & Order Controls */}
                                <div className="w-20 shrink-0 space-y-1.5">
                                  <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                                    {cov.url ? (
                                      <img src={cov.url} alt={cov.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] text-slate-500">待导入图像</span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                    <span>P{idx + 1}</span>
                                    <span>{cov.width && cov.height ? `${cov.width}×${cov.height}` : cov.ratio}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleReorderCover(idx, 'up')}
                                      disabled={idx === 0}
                                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                                      title="向上移动"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReorderCover(idx, 'down')}
                                      disabled={idx === currentVariant.covers.length - 1}
                                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                                      title="向下移动"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Per-Card Independent Copy & Usage Selector */}
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-slate-300">本页独立卡片文案 (与发布正文分离)</span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {cardTexts[cov.id]?.length || 0} 字
                                    </span>
                                  </div>
                                  <textarea
                                    value={cardTexts[cov.id] ?? ''}
                                    onChange={e => {
                                      const updated = { ...cardTexts, [cov.id]: e.target.value };
                                      setCardTexts(updated);
                                    }}
                                    placeholder="填写此单页卡片上的标题或正文（与发布正文完全分离，若留空则使用主文案）..."
                                    rows={3}
                                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                                  />
                                  <div className="flex items-center space-x-3 text-[10px]">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-slate-400">素材角色:</span>
                                      <select
                                        value={cov.usage || 'card'}
                                        onChange={e => {
                                          const newUsage = e.target.value as any;
                                          const updatedCovers = currentVariant.covers.map((c, i) => i === idx ? { ...c, usage: newUsage } : c);
                                          const updatedVariants = currentProject.variants.map(v => v.id === currentVariant.id ? { ...v, covers: updatedCovers } : v);
                                          setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
                                          api.updateVariant(currentProject.id, currentVariant.id, { covers: updatedCovers }).catch(console.error);
                                        }}
                                        className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-[10px] focus:outline-none"
                                      >
                                        <option value="primary">主封面 (primary)</option>
                                        <option value="card">图文卡片 (card)</option>
                                        <option value="body_image">公众号正文插图 (body_image)</option>
                                        <option value="channels_vertical">视频号竖版 (channels_vertical)</option>
                                        <option value="channels_horizontal">视频号横版 (channels_horizontal)</option>
                                        <option value="poster">海报 (poster)</option>
                                      </select>
                                    </div>
                                    {cov.usage === 'body_image' && (
                                      <div className="flex items-center space-x-1">
                                        <span className="text-slate-400">插图位置:</span>
                                        <input
                                          type="text"
                                          value={cov.name || `[插图${idx + 1}]`}
                                          onChange={e => {
                                            const updatedCovers = currentVariant.covers.map((c, i) => i === idx ? { ...c, name: e.target.value } : c);
                                            const updatedVariants = currentProject.variants.map(v => v.id === currentVariant.id ? { ...v, covers: updatedCovers } : v);
                                            setProjects(projects.map(p => p.id === currentProject.id ? { ...p, variants: updatedVariants } : p));
                                            api.updateVariant(currentProject.id, currentVariant.id, { covers: updatedCovers }).catch(console.error);
                                          }}
                                          placeholder="[插图1]"
                                          className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-slate-200 text-[10px] w-20 font-mono"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Silent MP4 Compose Runner Panel */}
                          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5">
                                <Film className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold text-slate-200">合成动感视频 (本地运行器)</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                                  无音乐静音 MP4
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRunComposeVideo}
                                disabled={isComposingVideo}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>{isComposingVideo ? '正在合成...' : '运行本地视频合成'}</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="text-slate-400 text-[10px] block mb-1">每张卡片停留时长 (秒)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={composeDuration}
                                  onChange={e => setComposeDuration(Math.max(1, parseInt(e.target.value) || 3))}
                                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 text-[10px] block mb-1">背景音乐路径 (留空生成无杂音纯净片)</label>
                                <input
                                  type="text"
                                  value={composeMusicPath}
                                  onChange={e => setComposeMusicPath(e.target.value)}
                                  placeholder="留空即输出无音乐静音视频"
                                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                                />
                              </div>
                            </div>

                            {composeError && (
                              <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300 space-y-1">
                                <div className="flex items-center space-x-1 font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                  <span>合成异常提示</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">{composeError}</p>
                              </div>
                            )}

                            {composedVideoResult && (
                              <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                                  <span>🎉 本地视频合成成功 (时长: {composedVideoResult.duration}s)</span>
                                  <a
                                    href={composedVideoResult.videoUrl}
                                    download="composed-cards.mp4"
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] flex items-center space-x-1 font-medium"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>下载生成的 MP4</span>
                                  </a>
                                </div>
                                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 max-h-40 flex items-center justify-center">
                                  <video src={composedVideoResult.videoUrl} controls className="w-full h-full object-contain" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* General Covers Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {currentVariant.covers?.map(cov => (
                          <div
                            key={cov.id}
                            className={`p-2.5 rounded-xl border bg-slate-950 space-y-2 ${
                              cov.needsReview ? 'border-amber-600/80' : 'border-slate-800'
                            }`}
                          >
                            <div className="aspect-[3/4] bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800">
                              {cov.url ? (
                                <img src={cov.url} alt={cov.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs text-slate-500">待导入图像</span>
                              )}
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px] font-medium text-slate-200">
                                <span className="truncate">{cov.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{cov.ratio}</span>
                              </div>
                              {cov.width && cov.height && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {cov.width} × {cov.height} px
                                </div>
                              )}
                              {cov.needsReview && (
                                <div className="text-[10px] text-amber-400 font-semibold flex items-center space-x-0.5">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  <span>正文已更新，待核验</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {(!currentVariant.covers || currentVariant.covers.length === 0) && (
                          <div className="col-span-3 py-6 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
                            暂无封面图片。点击上方「上传真实素材」或通过交接包将图片落盘。
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: Save Draft vs Mark as Ready */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] text-slate-500">
                      状态：<strong className="text-slate-300 font-mono">{currentVariant?.status || '未保存'}</strong>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleSaveVariantDraft}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 disabled:opacity-50"
                      >
                        {isSaving ? '正在保存...' : '保存为草稿 (Draft)'}
                      </button>

                      {currentVariant && currentVariant.status !== 'published' && (
                        <button
                          onClick={handleMarkAsReady}
                          disabled={isSaving}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>标记为已就绪 (Ready)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#14161c] border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
              请从左侧选择一个内容项目，或点击右上角新建项目
            </div>
          )}
        </div>
      </div>

      {/* Add Format Modal */}
      {isAddingVariantFormat && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>添加 {PLATFORM_LABELS[selectedPlatform].name} 格式变体</span>
            </h3>

            <p className="text-xs text-slate-400">
              同一个发布平台支持制作多个不同形式的文案与物料变体：
            </p>

            <div className="space-y-2">
              {PLATFORM_ALLOWED_FORMATS[selectedPlatform].map(fmt => (
                <div
                  key={fmt}
                  onClick={() => handleAddNewFormatVariant(fmt)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/80 hover:bg-slate-850 cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-white block">{FORMAT_LABELS[fmt]?.name || fmt}</span>
                    <span className="text-[11px] text-slate-400">{FORMAT_LABELS[fmt]?.desc}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 text-[10px] font-mono border border-indigo-900/60">
                    创建
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAddingVariantFormat(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreatingProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              <span>新建内容项目 (母稿权威创建)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">项目标题</label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  placeholder="例如：2026跨境出海AI自动化踩坑复盘"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">母稿正文内容</label>
                <textarea
                  rows={6}
                  value={newProjectMaster}
                  onChange={e => setNewProjectMaster(e.target.value)}
                  placeholder="输入最初确认的核心文案或对话灵感..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsCreatingProject(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                立即创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Revision Modal */}
      {isAddingRevision && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>产生新修订版本 (Rev {currentProject?.masterDraft.currentRev ? currentProject.masterDraft.currentRev + 1 : 2})</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">修订说明</label>
                <input
                  type="text"
                  value={revisionNote}
                  onChange={e => setRevisionNote(e.target.value)}
                  placeholder="例如：调整黄金前3秒钩子，强化出海实操细节"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">修订后正文</label>
                <textarea
                  rows={6}
                  value={revisionContent}
                  onChange={e => setRevisionContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-amber-400/90">
              ⚠️ 提示：保存新修订后，该项目下所有旧封面将自动标记为「待重新核验」，确保图文事实一致。
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsAddingRevision(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleAddRevision}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                提交新修订
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Publish Modal */}
      {confirmingVariant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>记录已发布 · 计入今日 KPI</span>
            </h3>

            <p className="text-xs text-slate-300">
              您已在 <strong className="text-white">{PLATFORM_LABELS[confirmingVariant.platform].name}</strong> 完成手动发布？确认后将真实计入今日发布统计（严禁仅生成未发布计入 KPI）。
            </p>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">公开链接 (可选)</label>
              <input
                type="text"
                value={publishUrl}
                onChange={e => setPublishUrl(e.target.value)}
                placeholder="例如：https://x.com/... 或 https://xhslink.com/..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmingVariant(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPublish}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                确认已发布 (+1)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
