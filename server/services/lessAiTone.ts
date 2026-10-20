import fs from 'fs';
import path from 'path';
import { callGemini } from './gemini.js';
import { db, PersonaProfile } from '../db.js';

const WORKSPACE_SKILL_PATH = path.resolve(process.cwd(), '.agents/skills/lieflat-less-ai-tone/SKILL.md');
const GLOBAL_SKILL_PATH = path.resolve(process.env.HOME || '', '.agents/skills/lieflat-less-ai-tone/SKILL.md');
const VOICE_PROFILE_PATH = path.resolve(process.cwd(), 'persona/voice_profile.md');

/**
 * Read the full lieflat-less-ai-tone skill documentation
 */
export function getSkillDocument(): string {
  try {
    if (fs.existsSync(WORKSPACE_SKILL_PATH)) {
      return fs.readFileSync(WORKSPACE_SKILL_PATH, 'utf-8');
    }
  } catch (e) {
    console.error('Error reading workspace SKILL.md:', e);
  }

  try {
    if (fs.existsSync(GLOBAL_SKILL_PATH)) {
      return fs.readFileSync(GLOBAL_SKILL_PATH, 'utf-8');
    }
  } catch (e) {
    console.error('Error reading global SKILL.md:', e);
  }

  return '';
}

/**
 * Read creator voice profile document if present
 */
export function getVoiceProfileDocument(): string {
  try {
    if (fs.existsSync(VOICE_PROFILE_PATH)) {
      return fs.readFileSync(VOICE_PROFILE_PATH, 'utf-8');
    }
  } catch (e) {
    console.error('Error reading voice_profile.md:', e);
  }
  return '';
}

export interface CleanReport {
  rulesChecked: number;
  originalWordCount: number;
  newWordCount: number;
  appliedTone: string;
}

/**
 * Execute lieflat-less-ai-tone strict rule-based rewriting
 */
export async function cleanWithLessAiTone(
  content: string,
  customPersona?: PersonaProfile
): Promise<{ polished: string; report: CleanReport }> {
  if (!content || !content.trim()) {
    return {
      polished: '',
      report: {
        rulesChecked: 11,
        originalWordCount: 0,
        newWordCount: 0,
        appliedTone: '无内容'
      }
    };
  }

  const persona = customPersona || db.getPersona();
  const voiceDoc = getVoiceProfileDocument();

  const systemPrompt = `你是一个基于语言学实测（283万字语料）的专业中文文本去AI味净化器。
你必须严格执行《lieflat-less-ai-tone》白名单改写规则。

【硬性边界与最高准则】：
1. 白名单式改写：只能处理下列 11 条明确命中的问题，未命中规则的文字必须逐字保留！绝不能凭主观写作经验润色或改动其他文字。
2. 信息守恒（绝对不许新增或删减）：
   - 严禁凭空添加任何姓名、数据、时间、案例、对话、动机或细节；
   - 严禁删减原文观点、结论、限定词和让步（如“可能”“通常”“在某些情况下”）；
   - 改写后的每个实词，都必须在原文中找到出处。
3. 结构绝对不动：标题层级、章节顺序、段落数量与顺序、列表、表格、引用和代码块的位置必须原样保留。
4. 风格文档最高优先级：若创作者有专属口吻与习惯，以创作者风格为准，不强行抹平个人特色。

【11 条核心改写规则（逐项检查）】：
1. 翻案腔：去除“不是……而是……”“并非……而是……”“与其说……不如说……”“表面……实际……”“看似……实则……”“不是A是B”，直接正面陈述判断。
2. 顿号罗列过密：一个分句内出现两个以上顿号连起三项以上并列，改变句法或概括，打破整齐结构。
3. 相邻句结构同款：相邻两句以上成分顺序相同、长度接近（如主谓宾+说明连续复现），打散其中一句句法；段内3个平级凑数例子压缩主次。
4. 破折号滥用：去除制造停顿揭晓或插入无谓补充的破折号，改用逗号、句号或完整句。
5. 冒号滥用：删除“一句话总结：”“核心是：”等无信息提示语冒号；改写“几种典型场景：”等空转宣布列表的句子。
6. 序数词当小标题：小标题若以“一、二、三”连续编号，删去编号，保留小标题原文字。
7. 拟人化喻体：去除“像一位智慧的导师/永不疲倦的审查员”等理想化职业人格喻体，改写真实机制。
8. 恢复具体数据与动词：原文同段有具体数据时，不许用“显著提升/大幅增长”等概括词盖掉；将“完成了对……的优化”等名词化恢复为直接动词。
9. 禁用起手式：删除“说白了”“说穿了”“先说结论”，直接给出判断。
10. 定向5类翻译腔：拆分超15字的长前置定语、删除前置“当……时”、删除前置话题壳（“对于……来说”）、句首“然而/此外”移至句中、简化“这意味着”式复述句。
11. 段首零主语评论：非首段直接以评论开头缺回指时，补上“这/这一点”等回指成分。

【不改的情况（绝不误伤）】：
- 绝不为了“制造节奏”调整句长或拆段；
- 绝不强加“我/你”或口语词；
- 绝不删除正文问句、反问句；
- 绝不删除正常比喻与排比。

【输出格式】：
直接输出改写后的正文全文，严禁输出任何前言、解释或改动说明！`;

  let userPrompt = '';
  if (voiceDoc) {
    userPrompt += `【创作者专属风格指南 (高于通用规则)】：\n${voiceDoc}\n\n`;
  }
  userPrompt += `【创作者人设基调】：${persona.toneStyle}\n`;
  userPrompt += `【待去味文案】：\n${content}\n\n`;
  userPrompt += `请严格根据上述 11 条白名单规则与信息守恒约束，对文案进行去 AI 味改写，直接输出改写全文：`;

  const polished = await callGemini(userPrompt, systemPrompt, 0.3);
  const cleanResult = polished.trim();

  return {
    polished: cleanResult,
    report: {
      rulesChecked: 11,
      originalWordCount: content.length,
      newWordCount: cleanResult.length,
      appliedTone: persona.toneStyle
    }
  };
}
