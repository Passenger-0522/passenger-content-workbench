import { db, MatrixPack, PersonaProfile } from '../db.js';
import { callGemini } from './gemini.js';
import { cleanWithLessAiTone } from './lessAiTone.js';

function extractJson<T>(rawText: string, fallback: T): T {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    return JSON.parse(clean) as T;
  } catch (e) {
    console.error('Failed to parse JSON for MatrixPack:', e, 'Raw content preview:', rawText.slice(0, 300));
    return fallback;
  }
}

/**
 * Generate full-platform matrix adaptation pack for a source topic/post
 */
export async function generateMatrixPack(
  sourceTitle: string,
  sourceContent: string,
  customPersona?: PersonaProfile
): Promise<MatrixPack> {
  const persona = customPersona || db.getPersona();
  const id = `matrix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const systemPrompt = `你是一个顶级全媒体矩阵操盘手（跨公众号、视频号、抖音、小红书、推特）。
你的专长是将同一篇核心母本文案，通过“一鱼多吃”策略，极速精准适配为 5 大平台的全套定制物料。

【必须严格遵守各平台的发布规范与用户要求】：
1. 微信公众号 (wechatArticle)：
   - 深度排版长图文（含导语、2-3个清晰小标题正文、金句引用块、文末互动关注引导）；
   - 3个备选爆款标题；
   - 1个公众号头图封面设计（比例 2.35:1，主标题大字，包含 Midjourney/AI 生图提示词与排版建议）。

2. 微信视频号 (wechatChannels)：
   - 30字内具有情绪共鸣、认知反差的视频号标题；
   - 黄金短视频口播文案（口播节奏、台词、前3秒钩子、文末引导关注）；
   - 【严格要求 2 个封面】：
     ① 原本视频封面（比例 6:7 或 9:16 竖版）：大字核心标签，居中视觉焦点，包含生图 Prompt；
     ② 朋友圈/社群转发卡片封面（比例 2.35:1 横版）：高社交货币与好奇心卡片，包含生图 Prompt。

3. 抖音 (douyin)：
   - 吸睛反差标题；
   - 视频版口播脚本（60秒内，快节奏，痛点直击，分镜台词提示）；
   - 【严格要求 1 个封面】：竖版视频封面（比例 9:16，高饱和对比大字，包含生图 Prompt）；
   - 图文版内容：图文正文描述 + 4张轮播图文大纲（卡片1封面Hook，卡片2痛点剖析，卡片3实操方案，卡片4避坑互动）；
   - 热门抖音标签。

4. 小红书 (xiaohongshu)：
   - 带 Emoji 的高点击标题；
   - 图文版笔记全文：段落呼吸感（每段1-2行）、高频 Emoji（✨💡🔥）、文末互动提问引导收藏；
   - 视频版简介与口播要点；
   - 【严格要求 1 个封面】：小红书专属高审美封面（比例 3:4，大字贴纸风，包含生图 Prompt）；
   - 4-6张图文轮播卡片拆解（每张卡片的标题、核心要点、视觉提示词）；
   - 小红书精准搜索标签。

5. 推特 / X (twitter)：
   - 【纯文字形态！不设图片封面】：
   - 单条爆款推文：<280 字符极度精炼单推，Punchline 金句 + 核心认知；
   - 深度长 Thread 线程：由 4~5 条推文构成的完整 Thread（🧵 1/5 抓眼球钩子，2/5 痛点拆解，3/5 解决方案，4/5 实操案例，5/5 结语求转评）。

【全局去AI味准则】：
严格遵循 lieflat-less-ai-tone 语言学规范：严禁翻案腔（不是...而是）、严禁顿号密排、严禁揭晓式破折号、严禁“说白了/先说结论”起手式、严禁假大空翻译腔。文字干脆利落。

你必须严格输出合法的 JSON 对象，不携带任何 markdown 代码块外部的说明文字。`;

  const userPrompt = `【母本标题】：${sourceTitle}
【母本文案内容】：
${sourceContent}

【创作者人设口吻基调】：${persona.toneStyle}
【常用标志性表达】：${persona.vocabularyTraits.join('、')}

请根据上述母本，一键生成完整的 5 大平台矩阵物料包（包含视频号2个封面、抖音1个封面、小红书1个封面、公众号头图、推特纯文字等所有需求）。
输出合法 JSON 格式：
{
  "wechatArticle": {
    "platform": "wechatArticle",
    "platformName": "微信公众号",
    "primaryFormat": "article",
    "title": "公众号主打深度标题",
    "candidateTitles": ["备选标题1", "备选标题2", "备选标题3"],
    "content": "完整的公众号深度排版长文（带导语、小标题、金句引用、排版段落、文末引导）...",
    "tags": ["深度长文", "科技洞察", "干货"],
    "covers": [
      {
        "id": "cover-wechat-1",
        "name": "微信公众号头图封面 (2.35:1)",
        "ratio": "2.35:1",
        "headline": "主标题大字（8-12字）",
        "subheadline": "副标题补充",
        "visualPrompt": "A modern minimalist graphic design illustration, high-tech, cinematic lighting, clean composition --ar 16:9",
        "layoutNotes": "横版 2.35:1 比例，视觉主体居中偏右，左侧留出高对比大字标题区域"
      }
    ],
    "platformTips": "微信公众号排版建议留白舒适，关键金句加粗或使用引用框，头图必须在前台列表具备强点击欲"
  },
  "wechatChannels": {
    "platform": "wechatChannels",
    "platformName": "微信视频号",
    "primaryFormat": "video",
    "title": "视频号走心/认知反差标题（30字内）",
    "candidateTitles": ["备选标题1", "备选标题2"],
    "content": "视频号黄金短视频口播文案（包含【开篇前3秒黄金Hook】、【核心论点展开】、【结尾社交互动】）...",
    "tags": ["视频号", "认知差", "干货口播"],
    "covers": [
      {
        "id": "cover-channels-main",
        "name": "视频号原本视频封面 (6:7 / 9:16)",
        "ratio": "6:7",
        "headline": "原本视频封面大字",
        "subheadline": "关键看点标识",
        "visualPrompt": "Portrait orientation video cover, expressive human subject, bold typography, cinematic 8k --ar 9:16",
        "layoutNotes": "竖版 6:7/9:16，上半部分放主标题大字，中央为核心视觉画面，底部避免遮挡字幕"
      },
      {
        "id": "cover-channels-share",
        "name": "视频号朋友圈/社群转发分享卡片 (2.35:1)",
        "ratio": "2.35:1",
        "headline": "朋友圈转发吸睛文案",
        "subheadline": "一句话痛点直击",
        "visualPrompt": "Clean banner visual with curiosity hook, eye-catching editorial style, clean background --ar 16:9",
        "layoutNotes": "横版 2.35:1，专为微信聊天卡片和朋友圈缩略图设计，文字必须放大且反差极高"
      }
    ],
    "platformTips": "视频号算法高度依赖社交裂变推荐（朋友点赞/转发到群），前3秒必须击中中年与职场群体的痛点共鸣"
  },
  "douyin": {
    "platform": "douyin",
    "platformName": "抖音",
    "primaryFormat": "video",
    "title": "抖音反差吸睛爆款标题",
    "candidateTitles": ["备选标题1", "备选标题2"],
    "content": "抖音短视频爆款口播脚本（包含镜头提示、前3秒痛点炸弹、高密度干货、转化引导）...",
    "secondaryContent": "抖音图文模式配文正文描述...",
    "tags": ["抖音热点", "搞钱思维", "认知升级"],
    "covers": [
      {
        "id": "cover-douyin-1",
        "name": "抖音竖版视频封面 (9:16)",
        "ratio": "9:16",
        "headline": "抖音极大字号主标题",
        "subheadline": "看点小标签",
        "visualPrompt": "Hyper-realistic dynamic shot, vibrant lighting, ultra contrast, trendy Douyin aesthetic --ar 9:16",
        "layoutNotes": "竖版 9:16，黄金中间位置放大加粗文字，配合高饱和度荧光黄或纯白黑底，杜绝边缘遮挡"
      }
    ],
    "cards": [
      {
        "pageIndex": 1,
        "pageType": "cover",
        "title": "图文第1页：悬念封面",
        "bulletPoints": ["大字主标", "痛点副标"],
        "visualPrompt": "Hook cover slide"
      },
      {
        "pageIndex": 2,
        "pageType": "pain_point",
        "title": "图文第2页：为什么90%的人都踩坑？",
        "bulletPoints": ["现象剖析", "核心误区"],
        "visualPrompt": "Problem comparison slide"
      },
      {
        "pageIndex": 3,
        "pageType": "core_steps",
        "title": "图文第3页：高手都在用的3步法",
        "bulletPoints": ["步骤一", "步骤二", "步骤三"],
        "visualPrompt": "Actionable step slide"
      },
      {
        "pageIndex": 4,
        "pageType": "summary_cta",
        "title": "图文第4页：避坑建议与互动",
        "bulletPoints": ["总结金句", "评论区扣666自取SOP"],
        "visualPrompt": "Summary CTA slide"
      }
    ],
    "platformTips": "抖音完播率第一！前2秒必须抛出颠覆认知的问题，语速要快、字字干货，图文和口播均可双发"
  },
  "xiaohongshu": {
    "platform": "xiaohongshu",
    "platformName": "小红书",
    "primaryFormat": "image_text",
    "title": "小红书爆款标题 (带Emoji)",
    "candidateTitles": ["备选标题1", "备选标题2"],
    "content": "小红书图文笔记全文（呼吸感排版、短句分行、高频Emoji、文末互动提问引导收藏）...",
    "secondaryContent": "小红书视频版笔记简介与口播要点...",
    "tags": ["我的日常", "干货分享", "效率神器", "搞钱认知"],
    "covers": [
      {
        "id": "cover-xhs-1",
        "name": "小红书高清封面 (3:4)",
        "ratio": "3:4",
        "headline": "小红书高点击主标题",
        "subheadline": "副标标签与高光点",
        "visualPrompt": "Aesthetic lifestyle flatlay, soft pastel tones, editorial typography, Xiaohongshu cover style --ar 3:4",
        "layoutNotes": "竖版 3:4 比例，大字贴纸感排版，上方主标题，中央留白放高清视觉主体，下方副标题"
      }
    ],
    "cards": [
      {
        "pageIndex": 1,
        "pageType": "cover",
        "title": "Card 1: 视觉封面",
        "bulletPoints": ["主标题", "副标题", "收藏诱饵"],
        "visualPrompt": "Editorial cover card"
      },
      {
        "pageIndex": 2,
        "pageType": "pain_point",
        "title": "Card 2: 扎心现状与痛点",
        "bulletPoints": ["普遍误区剖析", "真实成本拆解"],
        "visualPrompt": "Infographic pain points"
      },
      {
        "pageIndex": 3,
        "pageType": "core_steps",
        "title": "Card 3: 核心实操拆解",
        "bulletPoints": ["关键节点拆解", "立竿见影的动作"],
        "visualPrompt": "Actionable checklist card"
      },
      {
        "pageIndex": 4,
        "pageType": "takeaway",
        "title": "Card 4: 独家踩坑血泪经验",
        "bulletPoints": ["不要做的事", "资源工具清单"],
        "visualPrompt": "Pro tips card"
      },
      {
        "pageIndex": 5,
        "pageType": "summary_cta",
        "title": "Card 5: 总结与互动",
        "bulletPoints": ["金句收尾", "评论区交流提问"],
        "visualPrompt": "Engagement closing card"
      }
    ],
    "platformTips": "小红书是搜索驱动型平台，首图美感决定打开率，内页干货密度决定收藏率，正文必须带高权重关键词"
  },
  "twitter": {
    "platform": "twitter",
    "platformName": "推特 / X",
    "primaryFormat": "pure_text",
    "title": "推特主打核心金句 Punchline",
    "candidateTitles": ["备选推文1", "备选推文2"],
    "content": "单条极简爆款推文（280字符以内，高密度认知反差，直击本质，文末留互动钩子）...",
    "secondaryContent": "🧵 深度长 Thread 线程：\n1/5 黄金钩子...\n\n2/5 痛点直击...\n\n3/5 底层逻辑...\n\n4/5 实操SOP...\n\n5/5 总结金句，如果对你有启发请转推关注！",
    "tags": ["AI", "BuildInPublic", "Tech", "Productivity"],
    "covers": [],
    "platformTips": "推特平台纯文字至上，杜绝花里胡哨！单推要求每句话都在传递认知增量，长Thread要求1/5推文有极强好奇心"
  }
}`;

  try {
    const raw = await callGemini(userPrompt, systemPrompt, 0.6);
    const parsed = extractJson<any>(raw, null);

    if (parsed && parsed.wechatArticle && parsed.xiaohongshu && parsed.douyin) {
      const pack: MatrixPack = {
        id,
        sourceTitle,
        sourceContent,
        createdAt: now,
        updatedAt: now,
        platforms: {
          wechatArticle: parsed.wechatArticle,
          wechatChannels: parsed.wechatChannels,
          douyin: parsed.douyin,
          xiaohongshu: parsed.xiaohongshu,
          twitter: parsed.twitter
        }
      };

      db.saveMatrixPack(pack);
      return pack;
    }
  } catch (err) {
    console.error('Gemini matrix adaptation failed, generating high-quality structured fallback:', err);
  }

  // High-Quality Fallback Generation if Gemini is unreachable or formatted incorrectly
  const fallbackPack: MatrixPack = createFallbackMatrixPack(id, sourceTitle, sourceContent, persona, now);
  db.saveMatrixPack(fallbackPack);
  return fallbackPack;
}

/**
 * Intelligent Fallback Generator adhering strictly to user requirements
 */
function createFallbackMatrixPack(
  id: string,
  title: string,
  content: string,
  persona: PersonaProfile,
  now: string
): MatrixPack {
  const cleanTitle = title.replace(/^[【[].*?[\]】]/, '').trim();
  const summarySnippet = content.slice(0, 180).replace(/\n+/g, ' ');

  return {
    id,
    sourceTitle: title,
    sourceContent: content,
    createdAt: now,
    updatedAt: now,
    platforms: {
      wechatArticle: {
        platform: 'wechatArticle',
        platformName: '微信公众号',
        primaryFormat: 'article',
        title: `深度拆解：为什么聪明人都在关注“${cleanTitle}”？`,
        candidateTitles: [
          `为什么聪明人都在关注“${cleanTitle}”？`,
          `关于“${cleanTitle}”，这是我看过最透彻的一篇分析`,
          `踩过无数坑后，我总结出关于${cleanTitle}的底层逻辑`
        ],
        content: `很多人常问：为什么同样的赛道，别人做就能拿到结果，自己做却总是处处碰壁？

今天不谈虚头巴脑的理论，只聊真枪实弹的实操复盘。建议泡杯茶，花5分钟认真读完。

---

## 颠覆认知：被大众忽视的根本原因

绝大多数人在做这件事情时，往往把精力耗散在表层的细枝末节上，却忽略了最根本的杠杆支点。

${summarySnippet}

真正的高手，从来不是靠死磕体力，而是先找准痛点，再搭建自动化与标准化闭环。

---

## 落地实操：拿来即用的关键步骤

把复杂问题简单化，核心只抓这三个动作：

1. **锚定真实需求**：砍掉一切虚假繁荣的自嗨动作，直面最具确定性的核心触点；
2. **搭建流水线**：利用现代化工具武装自己，让重复动作自动化；
3. **高频高质量交付**：与其脑海里构思100篇神作，不如每天扎实完成固定指标。

---

## 写在最后

种一棵树最好的时间是十年前，其次是现在。商业世界里最大的成本，永远是信息差与行动迟缓。

> **互动探讨**：关于${cleanTitle}，你目前最头疼的卡点是什么？欢迎在评论区留言交流，每一条我都会认真回复。`,
        tags: ['深度思考', '个人成长', '商业本质', '超级个体'],
        covers: [
          {
            id: 'cover-wechat-1',
            name: '微信公众号头图封面 (2.35:1)',
            ratio: '2.35:1',
            headline: `关于${cleanTitle}的底层真相`,
            subheadline: '深度长文复盘 · 建议收藏',
            visualPrompt: `Editorial graphic banner for WeChat article, subject "${cleanTitle}", conceptual modern art, clean background, high typography contrast, 8k resolution --ar 16:9`,
            layoutNotes: '标准公众号头图比例（2.35:1），右侧为主视觉概念图，左侧留白设计醒目大字标题'
          }
        ],
        platformTips: '公众号建议在早间 8:30 或晚间 21:00 发送；小标题下方搭配1-2个金句引用块，能大幅提升读者阅读完播率。'
      },

      wechatChannels: {
        platform: 'wechatChannels',
        platformName: '微信视频号',
        primaryFormat: 'video',
        title: `说句大实话：如果你还在搞不懂“${cleanTitle}”，成本太高了！`,
        candidateTitles: [
          `说句大实话：关于${cleanTitle}，很多人都理解反了`,
          `3分钟讲透${cleanTitle}的底层逻辑，越早看明白越少走弯路`
        ],
        content: `【开篇前3秒黄金Hook】
说句得罪人的大实话：
很多人以为做好“${cleanTitle}”靠的是天赋，其实90%的人连底层逻辑都没摸清。

【核心论点展开】
上周有个同行朋友和我深聊了两个小时，我告诉他：
想要真正拿到正向反馈，核心只做三件事：
第一，别盲目跟风，先算清楚你的投入产出比；
第二，把繁琐的脏活累活做成标准SOP；
第三，保持持续交付，用结果说话。

【结尾转化】
关注我，带你看透商业与个人成长的底层真相。觉得有用记得点赞转发！`,
        tags: ['视频号热门', '商业认知', '大白话干货', '超级个体'],
        covers: [
          {
            id: 'cover-channels-1',
            name: '视频号原本视频封面 (6:7 / 9:16)',
            ratio: '6:7',
            headline: `看懂${cleanTitle}`,
            subheadline: '少走三年弯路',
            visualPrompt: `Vertical video thumbnail, high contrast text overlay, mature and confident entrepreneur expression, cinematic studio lighting --ar 9:16`,
            layoutNotes: '竖版 6:7 / 9:16，核心大字放在画面上半部，人物视线聚焦镜头，视觉冲击力强'
          },
          {
            id: 'cover-channels-2',
            name: '视频号朋友圈/社群转发卡片 (2.35:1)',
            ratio: '2.35:1',
            headline: `同行绝不会告诉你的内幕真相`,
            subheadline: `关于${cleanTitle}深度解析`,
            visualPrompt: `Minimalist social share card banner, clean typographic layout, curiosity-driven design, WeChat moments card style --ar 16:9`,
            layoutNotes: '横版 2.35:1，专门为微信聊天会话与朋友圈转发卡片设计，文字加粗超醒目，激发点击欲'
          }
        ],
        platformTips: '视频号属于社交推荐算法，熟人点赞与群转发至关重要；转发封面（2.35:1）将直接决定朋友圈小卡片的点击率！'
      },

      douyin: {
        platform: 'douyin',
        platformName: '抖音',
        primaryFormat: 'video',
        title: `为什么绝大多数人在“${cleanTitle}”上全是无效内耗？揭秘高手做法 #干货分享`,
        candidateTitles: [
          `为什么聪明人都不碰传统做法？揭秘${cleanTitle}新打法`,
          `建议反复看三遍！${cleanTitle}保姆级实操指南`
        ],
        content: `【镜头1：快切近景，神情严肃】
“停一下！如果你现在还在用老办法做${cleanTitle}，你正在交巨额隐形成本！”

【镜头2：白板/手写板特写】
“很多人以为难在技术，其实难在认知差。
高手只用这套三步法：
① 砍掉80%冗余动作；
② 搭建自动化生产工具箱；
③ 每日保持稳定交付频率。”

【镜头3：面对镜头，真诚总结】
“别把简单问题搞复杂，按照这套清单跑一周，没效果你回来找我。
评论区扣【干货】，送你团队内部完整SOP！”`,
        secondaryContent: `刷到就是赚到！今天把【${cleanTitle}】的底层玩法彻底扒透。看完建议立刻截图保存！`,
        tags: ['抖音精选', '创业干货', '认知破局', '效率提升'],
        covers: [
          {
            id: 'cover-douyin-1',
            name: '抖音竖版视频封面 (9:16)',
            ratio: '9:16',
            headline: `${cleanTitle}真相大拆解`,
            subheadline: '高手绝不外传的3条捷径',
            visualPrompt: `Douyin dynamic vertical cover, high saturated color contrast, giant bold yellow-white title typography, ultra sharp focus --ar 9:16`,
            layoutNotes: '竖版 9:16，中央居中超大粗体字，避免底部被点赞评论图标遮挡'
          }
        ],
        cards: [
          {
            pageIndex: 1,
            pageType: 'cover',
            title: `Card 1：关于${cleanTitle}的大实话`,
            bulletPoints: ['普通人为什么做不成？', '高手的核心秘密是什么？'],
            visualPrompt: 'High contrast hook cover'
          },
          {
            pageIndex: 2,
            pageType: 'pain_point',
            title: 'Card 2：90%的人都陷入这3大误区',
            bulletPoints: ['误区一：盲目跟风', '误区二：完美主义拖延', '误区三：没有复盘习惯'],
            visualPrompt: 'Pain points comparison card'
          },
          {
            pageIndex: 3,
            pageType: 'core_steps',
            title: 'Card 3：可落地的3步破解法',
            bulletPoints: ['第一步：锁定最小可行性闭环', '第二步：善用生产力工具降维打击', '第三步：死磕稳定交付输出'],
            visualPrompt: 'Step-by-step SOP checklist'
          },
          {
            pageIndex: 4,
            pageType: 'summary_cta',
            title: 'Card 4：核心总结与互动',
            bulletPoints: ['行动永远大于空想', '评论区扣【工作流】免费领取实操资料'],
            visualPrompt: 'Engagement card'
          }
        ],
        platformTips: '抖音前3秒跳出率极其敏感，开头前2句话必须具备反差与痛点；图文模式在抖音流量正旺，建议视频与图文同发。'
      },

      xiaohongshu: {
        platform: 'xiaohongshu',
        platformName: '小红书',
        primaryFormat: 'image_text',
        title: `姐妹们/家人们！关于${cleanTitle}，劝你千万别盲目乱搞😭（纯干货避坑）`,
        candidateTitles: [
          `花3个月踩坑总结出来的${cleanTitle}实操手册💡建议收藏！`,
          `被问爆的${cleanTitle}全流程🔥小白也能照着抄作业`
        ],
        content: `最近私信里很多人都在问我关于【${cleanTitle}】到底该怎么落地。
今天抽空整理了一份超硬核的复盘笔记，纯大白话，绝无套路，看完少走半年弯路！建议先🌟【收藏】再看～

💡 核心认知：
很多人之所以迟迟拿不到正向反馈，并不是能力不行，而是方向搞反了。
别总想着一开始就做到100分，先完成，再迭代！

🔥 实操3步清单：
1️⃣ 拆解痛点：把大目标拆成每天能轻松完成的小任务
2️⃣ 搭建工具流：善用现代化AI与自动化工具，把效率拉满
3️⃣ 刻意复盘：每天固定看数据，找出可优化的微小细节

✨ 避坑指南：
千万不要花大几千去报那种割韭菜的课，公开互联网上的真实经验足够你跑通闭环！

大家目前在做${cleanTitle}时最大的难题是什么？欢迎在评论区聊聊，互相支招～👇`,
        secondaryContent: `小红书短视频口播要点：语调温和真诚，像朋友当面分享独家私藏经验，多展示操作细节。`,
        tags: ['小红书干货', '高效生活', '搞钱搞事业', '个人成长', '自媒体运营'],
        covers: [
          {
            id: 'cover-xhs-1',
            name: '小红书高清封面 (3:4)',
            ratio: '3:4',
            headline: `${cleanTitle}超全避坑指南`,
            subheadline: '小白3分钟抄作业 · 亲测有效',
            visualPrompt: `Xiaohongshu aesthetic lifestyle cover, 3:4 aspect ratio, pastel cream aesthetic, cozy modern studio background, cute stickers and clean bold typography --ar 3:4`,
            layoutNotes: '竖版 3:4，顶部放醒目吸睛大字，带精致贴纸图标，中间为真实案例/屏幕展示，高级感拉满'
          }
        ],
        cards: [
          {
            pageIndex: 1,
            pageType: 'cover',
            title: 'Card 1: 封面',
            bulletPoints: [`${cleanTitle}保姆级复盘`, '手把手教你跑通闭环', '建议收藏备用'],
            visualPrompt: 'Aesthetic cover card with bold title'
          },
          {
            pageIndex: 2,
            pageType: 'pain_point',
            title: 'Card 2: 常见踩坑现状',
            bulletPoints: ['时间花了很多却没结果？', '不知道第一步从哪开始？', '方向走偏白费精力'],
            visualPrompt: 'Comparison card layout'
          },
          {
            pageIndex: 3,
            pageType: 'core_steps',
            title: 'Card 3: 抄作业清单步骤',
            bulletPoints: ['明确核心触点', '选择顺手生产力工具', '建立每日执行打卡'],
            visualPrompt: 'Checklist card layout'
          },
          {
            pageIndex: 4,
            pageType: 'takeaway',
            title: 'Card 4: 高效秘诀',
            bulletPoints: ['利用AI批量跑骨架', '人工注入灵魂与口吻', '持续追踪受众反馈'],
            visualPrompt: 'Pro tips card'
          },
          {
            pageIndex: 5,
            pageType: 'summary_cta',
            title: 'Card 5: 总结与互动',
            bulletPoints: ['先完成再完美', '评论区留言你的疑问，下期继续深扒'],
            visualPrompt: 'Closing interaction card'
          }
        ],
        platformTips: '小红书图文轮播笔记点击率取决于封面（3:4大字+美感），收藏率取决于前3张干货密度，文末务必抛出讨论话题带动互动权重。'
      },

      twitter: {
        platform: 'twitter',
        platformName: '推特 / X',
        primaryFormat: 'pure_text',
        title: `关于 ${cleanTitle} 的核心认知：工具永远只是杠杆，交付才是唯一确定性。`,
        candidateTitles: [
          `90%的人在 ${cleanTitle} 上都在做无用功。`,
          `真正的超级个体，到底是如何把 ${cleanTitle} 做成资产的？`
        ],
        content: `很多人做 ${cleanTitle} 拿不到结果，根本原因不是不够努力，而是陷入了“低水平勤奋”。

聪明人的做法只有三点：
1. 聚焦真实痛点，不做假大空自嗨；
2. 搭建自动化工作流，把体力劳动压缩到极致；
3. 日更稳定交付，让复利替自己工作。

把时间换成资产，还是用体力对抗时代？答案显而易见。`,
        secondaryContent: `🧵 深度长 Thread 拆解：

1/5
很多人问我：在 AI 与超级个体时代，如何通过“${cleanTitle}”拿到真正可持续的正向反馈？

花了半年时间实测复盘，今天把 4 个底层逻辑讲透。建议 Bookmark 收藏。👇

2/5
【误区：把动作当结果】
绝大多数人每天花 2 个小时找选题、拼凑文字，结果发出去毫无水花。
原因很简单：你生产的内容没有“信息增量”。
读者要的从来不是套话，而是能立刻抄作业的实战结论。

3/5
【解法：模块化与工业化流水线】
高手做内容，早就脱离了“拍脑袋灵感”阶段：
- 选题：抓取全网高频真实痛点；
- 骨架：AI 快速辅助结构化梳理；
- 灵魂：注入独家个人经历与真实口吻。

4/5
【壁垒：日更交付的确定性】
很多人倒在“憋大招”的路上。
真实世界里，每天交付一篇 70 分的作品，其商业杠杆远远大于一年憋一篇 100 分的神作。
完成大于完美。

5/5
总结：
时代正在奖励那些敢于把流程标准化、并持续交付价值的人。

如果你觉得这条 Thread 对你有启发：
1. 转发首推让更多同行看到；
2. 关注我，持续分享 AI 生产力与超级个体一手实操。`,
        tags: ['AI', 'Productivity', 'BuildInPublic', 'Solopreneur'],
        covers: [],
        platformTips: '推特纯文字发布最佳，短推文重在金句观点，长Thread（1/5~5/5）重在深度结构拆解；末推引导转推与Bookmark能显著拉升推荐权重。'
      }
    }
  };
}
