# Codex 原生生图验收提示词

用途：小红书 3:4 封面；用于工作台文件交接验收，未发布。
输入：现有 Gemini 稿件 post_ai_solo_1 的中心观点：工具收集和反复写提示词不等于交付，要把素材、写作、个人口吻、发布准备串成工作流程。不使用原稿中未核验的产出或营收宣称。
执行：imagegen 原生工具；不调用 API 备用脚本，不指定未经核验的 image2.5。

Use case: ads-marketing
Asset type: one Xiaohongshu cover, portrait 3:4, ideally 1200 by 1600 pixels.
Primary request: derive a single memorable Chinese cover from an existing Gemini article about turning scattered AI tools into a repeatable creative workflow. Main text exactly: “把工具变成工作流”. Small supporting line exactly: “AI内容创作”.
Scene and subject: a tangible editorial collage, loose paper drafts on the lower left becoming one continuous paper ribbon that passes through a pen motif, a small image frame, and a neat stack of finished cards on the lower right. One clear transformation metaphor, without numerical performance promises.
Style: contemporary print magazine art direction, tactile paper, charcoal ink, warm ivory, one vermilion accent. Strong oversized Chinese typography integrated into the composition, generous breathing room, visual rhythm and clear hierarchy.
Composition: portrait cover; large readable title in the upper half; one central physical metaphor in the lower half, with enough inset margin for platform crop. All necessary words must fit and be legible at thumbnail size.
Constraints: Chinese text spelled correctly and no additional text. No generic blue-white dashboard, rounded UI panels, logos, watermark, income claims, fake statistics, or invented testimonials. Return one finished raster cover.
