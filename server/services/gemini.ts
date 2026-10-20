import { db, PersonaProfile, Topic } from '../db.js';

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.7
): Promise<string> {
  // TECHNICAL SWITCH per PRD 8.5 & 8.6 & Audit Point 8:
  // "模型 API 调用要在服务入口和服务函数显式默认禁用，即使已有凭据也不能自动生成；UI声明“订阅”不能代替技术开关。"
  if (process.env.ENABLE_MODEL_API !== 'true') {
    throw new Error('模型 API 默认已禁用（遵循官方客户端订阅与双客户端交接路线，防止产生额外 API 账单。如需启用，请配置 ENABLE_MODEL_API=true）。');
  }

  const settings = db.getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  const baseUrl = (settings.geminiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  const model = settings.geminiModel || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('未配置 Gemini API Key。请在右上角设置中填写您的 Google Gemini API Key。');
  }

  // Check if baseUrl is an OpenAI-compatible proxy (e.g. ends with /v1 or contains openai)
  const isOpenAICompatible = baseUrl.includes('/v1') || baseUrl.includes('openai');

  if (isOpenAICompatible) {
    const endpoint = `${baseUrl}/chat/completions`;
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI 兼容网关请求失败 (${res.status}): ${errText}`);
    }

    const data = await res.json() as any;
    return data?.choices?.[0]?.message?.content || '';
  } else {
    // Native Google Gemini REST API
    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 4096
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API 请求失败 (${res.status}): ${errText}`);
    }

    const data = await res.json() as any;
    const candidates = data?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('Gemini 未返回任何生成内容');
    }

    const parts = candidates[0]?.content?.parts;
    if (parts && parts.length > 0) {
      return parts.map((p: any) => p.text).join('');
    }

    throw new Error('Gemini 返回格式异常');
  }
}

/**
 * Clean and parse JSON from LLM response
 */
function extractJsonFromResponse<T>(rawText: string, fallback: T): T {
  try {
    let clean = rawText.trim();
    // Remove markdown code fence ```json ... ```
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    return JSON.parse(clean) as T;
  } catch (e) {
    console.error('Failed to parse JSON from LLM:', e, 'Raw content:', rawText);
    return fallback;
  }
}

/**
 * Turn TikHub trending raw keywords into viral content topics tailored to user niche
 */
export async function generateTopicsFromTrends(
  rawTrends: string[],
  niche: string,
  count: number = 8
): Promise<Array<Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>>> {
  const systemPrompt = `你是一个顶级社交媒体爆款策划操盘手。
你的专长是将全网实时热门事件与热搜关键词，降维打击式转化为高点击率（高CTR）、强共鸣、强传播力的自媒体选题。
你必须严格输出合法的 JSON 数组，不要携带任何多余的废话或 markdown 外部说明。`;

  const userPrompt = `【当前创作者定位赛道】：${niche}
【TikHub 抓取到的实时热搜/热点列表】：
${rawTrends.map((t, i) => `${i + 1}. ${t}`).join('\n')}

请帮我产出 ${count} 个针对该赛道的极具爆款潜质的全新选题。
要求：
1. 标题必须有反差感、好奇心钩子或直击人性的痛点；
2. 选题要接地气，适合单篇 500-1500 字的图文或短视频口播文案；
3. 输出格式为严格的 JSON 数组，每个对象包含：
   - "title": 爆款标题
   - "sourceHot": 关联的原始热点
   - "platform": "douyin" 或 "xiaohongshu" 或 "weibo"
   - "category": 选题子分类 (如: "认知差", "避坑干货", "底层逻辑", "效率黑科技")
   - "angleHook": 一句话破题钩子
   - "targetAudience": 目标受众与解决的痛点
   - "estimatedViralScore": 预估爆款指数（85-99整数）
   - "status": "pending"

格式范例：
[
  {
    "title": "为什么很多天天用AI的人，反而最先被AI淘汰？",
    "sourceHot": "AI工具全面替代初级程序员真相",
    "platform": "douyin",
    "category": "认知反差",
    "angleHook": "大多数人把AI当打字机，高手用AI做杠杆放大器",
    "targetAudience": "科技职场人/自由职业者，陷入工具虚假繁荣的焦虑",
    "estimatedViralScore": 95,
    "status": "pending"
  }
]`;

  try {
    const rawResponse = await callGemini(userPrompt, systemPrompt, 0.7);
    const parsed = extractJsonFromResponse<any[]>(rawResponse, []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(item => ({
        title: item.title || '爆款选题',
        sourceHot: item.sourceHot || '综合热点',
        platform: item.platform || 'douyin',
        category: item.category || '自媒体',
        angleHook: item.angleHook || '核心切入点',
        targetAudience: item.targetAudience || '大众读者',
        estimatedViralScore: item.estimatedViralScore || 90,
        status: 'pending'
      }));
    }
  } catch (err: any) {
    console.error('Error generating topics from Gemini:', err);
    // If Gemini fails, fallback to intelligent procedural generation
  }

  // Fallback procedural topics if Gemini offline or error
  return rawTrends.slice(0, count).map((t, idx) => ({
    title: `【深拆】关于“${t}”，90%的人都看错的核心本质`,
    sourceHot: t,
    platform: (idx % 2 === 0 ? 'douyin' : 'xiaohongshu') as any,
    category: '认知升级',
    angleHook: '戳破表象看底层逻辑，少走三年弯路',
    targetAudience: '追求高效成长与商业变现的自媒体人',
    estimatedViralScore: 90 + (idx % 8),
    status: 'pending'
  }));
}

/**
 * Generate 3 distinct outlines/angles for a chosen topic
 */
export async function generateOutlinesForTopic(
  topicTitle: string,
  angleHook: string,
  niche: string,
  persona: PersonaProfile
): Promise<Array<{
  id: string;
  name: string;
  hook: string;
  points: string[];
  cta: string;
}>> {
  const systemPrompt = `你是一个拥有千万级自媒体操盘经验的文案主编。
你的任务是为创作者提供 3 个不同维度、极具网感的破题思路与行文结构骨架。
必须严格输出合法的 JSON 数组，严禁其他文字。`;

  const userPrompt = `【选题标题】：${topicTitle}
【原切入点】：${angleHook}
【博主定位】：${niche}
【博主风格偏好】：${persona.toneStyle}

请提供 3 种完全不同行文风格的思路大纲：
1. 角度一：颠覆认知/反直觉流（抓眼球、打破固有偏见、直击本质）
2. 角度二：保姆级实操/避坑流（保姆级清单、手把手拆解、直接抄作业）
3. 角度三：扎心共情/故事代入流（亲历痛点切入、转折顿悟、升华金句）

每个思路大纲输出格式：
[
  {
    "id": "angle-1",
    "name": "颠覆认知流 (击碎常识)",
    "hook": "开篇前3秒黄金钩子内容...",
    "points": [
      "拆解核心认知盲区：大家以为是A，其实本质是B",
      "核心案例佐证与逻辑漏洞揭露",
      "高手背后的反常规做法"
    ],
    "cta": "结尾金句与引导读者思考的互动问句"
  },
  ...
]`;

  // When model API is disabled by default, return high-quality structured local outlines directly
  if (process.env.ENABLE_MODEL_API !== 'true') {
    return [
      {
        id: 'angle-1',
        name: '颠覆认知流 (戳破幻觉)',
        hook: `说句大实话：如果你还在以为“${topicTitle.replace(/^[【[].*?[\]】]/, '')}”只是普通小事，你正在交巨额隐形成本。`,
        points: [
          '痛点直击：为什么90%的人在这件事上全在盲目跟风？',
          '本质还原：底层运作逻辑其实只有两个关键点',
          '降维打法：高手从来不用笨办法，而是建立自动化闭环'
        ],
        cta: '别把热闹当风口，想看我们团队内部SOP的，评论区扣【干货】。'
      },
      {
        id: 'angle-2',
        name: '保姆级实操流 (抄作业清单)',
        hook: '建议先收藏！今天不讲虚的，花3分钟手把手教你一套直接能跑通的极简方案。',
        points: [
          '第一步：砍掉80%无意义动作，只保留核心触点',
          '第二步：用现成工具搭建自动化生产流水线',
          '第三步：设定严格的日常交付指标（如日更20篇）并做复盘'
        ],
        cta: '按照这个清单去跑一周，如果没效果你回来找我。'
      },
      {
        id: 'angle-3',
        name: '扎心故事流 (底层复盘)',
        hook: '上个月和一个年入百万的朋友深聊了3个小时，他的一句话彻底点醒了我。',
        points: [
          '前车之鉴：当初我也走过同样的弯路，浪费了整整半年时间',
          '转折时刻：从低效内耗到拿到正向反馈的关键破局点',
          '思维升级：真正拉开人与人差距的，永远是敢于交付的胆量'
        ],
        cta: '种一棵树最好的时间是十年前，其次是现在。你今天迈出第一步了吗？'
      }
    ];
  }

  try {
    const raw = await callGemini(userPrompt, systemPrompt, 0.7);
    const parsed = extractJsonFromResponse<any[]>(raw, []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        id: item.id || `angle-${idx + 1}`,
        name: item.name || `角度 ${idx + 1}`,
        hook: item.hook || '黄金开头钩子',
        points: Array.isArray(item.points) ? item.points : ['要点一', '要点二', '要点三'],
        cta: item.cta || '结尾互动引导'
      }));
    }
  } catch (e) {
    console.error('Failed to generate outlines via Gemini:', e);
  }

  // Fallback outlines
  return [
    {
      id: 'angle-1',
      name: '颠覆认知流 (戳破幻觉)',
      hook: `说句大实话：如果你还在以为“${topicTitle.replace(/^[【[].*?[\]】]/, '')}”只是普通小事，你正在交巨额隐形成本。`,
      points: [
        '痛点直击：为什么90%的人在这件事上全在盲目跟风？',
        '本质还原：底层运作逻辑其实只有两个关键点',
        '降维打法：高手从来不用笨办法，而是建立自动化闭环'
      ],
      cta: '别把热闹当风口，想看我们团队内部SOP的，评论区扣【干货】。'
    },
    {
      id: 'angle-2',
      name: '保姆级实操流 (抄作业清单)',
      hook: '建议先收藏！今天不讲虚的，花3分钟手把手教你一套直接能跑通的极简方案。',
      points: [
        '第一步：砍掉80%无意义动作，只保留核心触点',
        '第二步：用现成工具搭建自动化生产流水线',
        '第三步：设定严格的日常交付指标（如日更20篇）并做复盘'
      ],
      cta: '按照这个清单去跑一周，如果没效果你回来找我。'
    },
    {
      id: 'angle-3',
      name: '扎心故事流 (底层复盘)',
      hook: '上个月和一个年入百万的朋友深聊了3个小时，他的一句话彻底点醒了我。',
      points: [
        '前车之鉴：当初我也走过同样的弯路，浪费了整整半年时间',
        '转折时刻：从低效内耗到拿到正向反馈的关键破局点',
        '思维升级：真正拉开人与人差距的，永远是敢于交付的胆量'
      ],
      cta: '种一棵树最好的时间是十年前，其次是现在。你今天迈出第一步了吗？'
    }
  ];
}

/**
 * Deeply extract Tone & Voice Persona Profile from historical samples
 */
export async function extractPersonaFromSamples(
  samples: Array<{ title: string; content: string }>
): Promise<Partial<PersonaProfile>> {
  if (samples.length === 0) {
    throw new Error('请至少提供一篇历史原创样本用于口吻提取');
  }

  const sampleTexts = samples
    .map((s, idx) => `=== 历史样本 ${idx + 1}: 《${s.title}》 ===\n${s.content}\n`)
    .join('\n');

  const systemPrompt = `你是一个顶级语言学家和自媒体声音克隆（Voice Cloning）专家。
你的任务是通过严谨的语料统计与风格解构，提取这位创作者独一无二的“行文口吻画像”。
必须严格输出合法的 JSON 对象。`;

  const userPrompt = `以下是该创作者历史发布的真实高赞爆款文案样本：
${sampleTexts}

请从多维度进行深度解析，提取创作者的“文字指纹”：
1. toneStyle: 口吻主基调（例如：辛辣直接、极客硬核、温和睿智、像老炮说大实话）
2. vocabularyTraits: 常用标志性词汇、口头禅清单（字符串数组）
3. structureHabits: 段落长短、呼吸感、递进习惯（字符串数组）
4. punctuationEmojiHabits: 标点符号与Emoji表情的使用习惯描述
5. openingStyle: 开篇前3秒钩子的套路与典型句式
6. closingStyle: 结尾转化、互动、金句总结套路
7. systemPromptTemplate: 专门喂给大模型的高保真《模仿该作者口吻的专属System Prompt》

请输出合法 JSON：
{
  "toneStyle": "...",
  "vocabularyTraits": ["...", "..."],
  "structureHabits": ["...", "..."],
  "punctuationEmojiHabits": "...",
  "openingStyle": "...",
  "closingStyle": "...",
  "systemPromptTemplate": "..."
}`;

  const raw = await callGemini(userPrompt, systemPrompt, 0.5);
  const parsed = extractJsonFromResponse<Partial<PersonaProfile>>(raw, {});
  return parsed;
}

/**
 * Generate a complete post mimicking historical voice, based on outline and topic
 */
export async function generatePostWithPersona(
  topic: Topic,
  outline: { hook: string; points: string[]; cta: string; customNotes?: string },
  persona: PersonaProfile
): Promise<{ candidateTitles: string[]; content: string; tags: string[]; wordCount: number }> {
  const fewShotContext = persona.historicalSamples
    .slice(0, 3)
    .map(
      (s, i) =>
        `【作者真实历史高赞范例 ${i + 1}】\n标题：${s.title}\n内容：\n${s.content}\n`
    )
    .join('\n---\n');

  const systemPrompt = `你就是这位创作者本人。
你必须以100%原汁原味的个人口吻、语言节奏与行文逻辑来撰写文案。

【你的核心人设与写作规范】：
- 口吻基调：${persona.toneStyle}
- 标志性词汇习惯：${persona.vocabularyTraits.join('、')}
- 结构节奏规范：${persona.structureHabits.join('；')}
- 标点与符号规范：${persona.punctuationEmojiHabits}
- 开头套路：${persona.openingStyle}
- 结尾习惯：${persona.closingStyle}

【特别禁令（已全面集成 lieflat-less-ai-tone 语言学去味铁律）】：
1. 坚决不用翻案腔（如“不是……而是……”、“并非……而是……”、“表面……实际……”、“答案其实是……”）；直接从正面给判断与结论；
2. 避免单句顿号连续罗列清单（避免一句话里串起三个以上顿号并列）；
3. 相邻句拒绝结构同款与句式克隆，不要堆砌 3 个平级例子凑数；
4. 杜绝揭晓式破折号（“——”）与提示语冒号（如“一句话总结：”、“核心是：”）；
5. 杜绝“像一位智慧的导师/永不疲倦的审查员”等拟人化职业喻体，直接讲机制；
6. 严禁起手式（“说白了”、“说穿了”、“先说结论”）；
7. 杜绝英文直译翻译腔（禁止超长前置定语、禁止前置“当……时”、句首连接词“然而/此外”嵌入句中）；
8. 非首段不要直接抛出缺回指的零主语评论；
9. 严禁出现任何“在当今快节奏的社会”、“总而言之”等假大空公文腔；
必须短句为主，段落呼吸感强（每段1-3行），像在跟聪明的同行当面深夜对谈。

以下是你的历史经典爆款范文，请仔细揣摩其神韵与语气：
${fewShotContext}`;

  const userPrompt = `请根据以下选定的主题与行文思路，模仿我本人的口吻写出一篇完整的爆款文案：

【选定选题】：${topic.title}
【切入角度/分类】：${topic.category}
【我的行文大纲与核心思路】：
- 黄金开头 Hook：${outline.hook}
- 核心论述要点：
${outline.points.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}
- 结尾收束与转化 CTA：${outline.cta}
${outline.customNotes ? `- 我的独家见解与补充要求：${outline.customNotes}` : ''}

请严格输出合法的 JSON 格式：
{
  "candidateTitles": [
    "备选标题1（悬念反差型）",
    "备选标题2（直击痛点型）",
    "备选标题3（数字干货型）"
  ],
  "content": "完整的正文内容，严格按照我的断句排版与短段落格式...",
  "tags": ["标签1", "标签2", "标签3", "标签4"]
}`;

  try {
    const raw = await callGemini(userPrompt, systemPrompt, 0.7);
    const parsed = extractJsonFromResponse<any>(raw, null);
    if (parsed && parsed.content) {
      const content = parsed.content.trim();
      return {
        candidateTitles: Array.isArray(parsed.candidateTitles) ? parsed.candidateTitles : [topic.title],
        content: content,
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['干货分享', '认知跃迁', '超级个体'],
        wordCount: content.length
      };
    }
  } catch (err) {
    console.error('Failed to generate post via Gemini:', err);
  }

  // Fallback high-quality template post
  const fallbackContent = `${outline.hook}

很多人问我：为什么别人做能成，你做就不行？
其实说句扎心的大实话，根本不是能力问题，而是认知差。

${outline.points.map((p, idx) => `第${idx + 1}点，${p}。
别把简单问题复杂化。真正拿到结果的人，往往都是抓住这个关键点死磕到底。`).join('\n\n')}

${outline.customNotes ? `另外补充一个核心心得：${outline.customNotes}\n\n` : ''}${outline.cta}`;

  return {
    candidateTitles: [topic.title, `为什么聪明人都在做“${topic.title}”？`, `深度拆解：${topic.title}`],
    content: fallbackContent,
    tags: ['个人成长', '认知升级', '自媒体运营', '高频产出'],
    wordCount: fallbackContent.length
  };
}

/**
 * Polish, refine, or rewrite existing post content
 */
export async function polishPostContent(
  currentContent: string,
  instruction: string,
  persona: PersonaProfile
): Promise<string> {
  const systemPrompt = `你是一个顶级文案精修大师。你必须严格保持作者独特的行文口吻：${persona.toneStyle}。
标点习惯：${persona.punctuationEmojiHabits}。
杜绝一切AI味与虚浮辞藻，输出直接可用的精修后全文。`;

  const userPrompt = `【当前文案】：
${currentContent}

【修改与润色要求】：
${instruction}

请直接输出精修后的文案正文，不要输出任何额外的解释或开场白。`;

  const raw = await callGemini(userPrompt, systemPrompt, 0.6);
  return raw.trim();
}
