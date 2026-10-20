# Skill 清单与多工具协作

日期：2026-10-10
版本：配合 PRD v1.2
配套文件：[PRD.md](./PRD.md)、[日常流程与对标拆解.md](./日常流程与对标拆解.md)、[Antigravity-实施提示词.md](./Antigravity-实施提示词.md)

## 1. 推荐方案

工作台保存内容和任务；Antigravity / Gemini 写全部平台文案，包括 X；Codex 直接读取正文，提炼视觉表达、制作图片与封面，需要时完成公众号排版；用户在工作台审阅、复制和下载，再手动发布。不要求 Gemini 先写封面标题或图内文字。

Antigravity 负责开发这个网站，并不意味着网站只能接收它的产物。第一版用共享本地目录交接，就能使用两个工具自己的订阅额度。用户可以在两个客户端分别聊天，网站把成果归到同一个项目。

第一步先跑通“Antigravity 对话提交 → 工具写入捕获包 → 网站后台自动入库并返回真实回执”，以及两个客户端的产物交接。用户无需先开网站建项目或重复粘贴。第二步再增加“交给 Gemini 写作”“交给 Codex 作图”等按钮，由本地后台调用官方 CLI。按钮自动执行需要逐项验证，不因有订阅就假定所有任务都能无人值守运行。

## 2. 订阅、CLI 与 API 的区别

| 路线 | 是否需要模型 API key | 费用与限制 | 当前建议 |
| --- | --- | --- | --- |
| Antigravity 内聊天与写作 | 不以自备模型 API key 为前提 | 以账号计划、额度和实际设置为准 | 用于 Gemini 文案 |
| Codex 内原生生图 | 不需要 OpenAI API key | 消耗 Codex 用量，仍有额度限制 | 用于图片与封面 |
| 官方 CLI 使用客户端登录 | 不以自备模型 API key 为前提 | 以官方登录、任务能力和订阅额度为准 | 下一阶段接入，先验收真实输出 |
| 本地 HTML / 图片 / 视频渲染 | 渲染本身不需要模型 API key | 使用本机计算资源；写文案和生成插画另算 | 适合排版和简单组合 |
| 普通模型 API | 需要相应 API 凭据 | 与客户端订阅分开计费 | 默认关闭 |
| TikHub 搜索 API | 需要 TikHub 凭据 | 独立数据服务费用，不计入模型订阅 | 每日搜索的单独连接器 |

Codex 官方支持订阅登录，`codex exec` 能运行非交互任务并默认复用保存的登录；原生生图文档包含 CLI 使用方式。[认证](https://learn.chatgpt.com/docs/auth)、[非交互执行](https://learn.chatgpt.com/docs/non-interactive-mode)、[原生生图](https://learn.chatgpt.com/docs/image-generation)

Antigravity 官方支持 `agy -p`，已有登录凭据可用于非交互运行；没有凭据时会报认证错误。[CLI 非交互文档](https://www.antigravity.google/docs/cli/headless/)

使用官方 CLI 是让官方客户端执行任务。不要把登录令牌提取出来、自建兼容 API 或通过第三方反代调用。模型 API 备用路线即使有现成脚本，也不能自动启用。

用户说的“Gemini 3.8 Flash 文笔好”“Codex image2.5 图片好”保存为个人偏好，不作为质量保证。Codex 原生生图文档当前标为 `gpt-image-2`；本次可用原生生图工具没有暴露模型选择参数，因此不能保证订阅路线固定指定 image2.5。先保留用户喜欢的 Codex 原生生图路线，以实际成图判断是否满足需求。

## 3. 本轮核验的本机状态（实施后更新）

- Codex CLI 已安装，前期核验版本为 `0.162.0-alpha.2`，使用 ChatGPT 登录；没有复制登录令牌。
- Antigravity 桌面原生对话实际承担了本次网站开发；前期在界面核验到 Gemini 3.8 Flash High。网站接收外部文件，不限制只能在 Antigravity 聊天。
- 官方 `agy` CLI 1.3.3 已安装在 `/Users/liangxiaoling/Documents/Playground/bin/agy`。隔离目录试运行没有完成执行授权流程；交互设置的条款未被接受，因此没有把 CLI 无人值守运行列为交付完成。
- Codex 原生生图已实际生成两张图片，文件已打开检查，并在隔离工作台通过上传、尺寸读取和文件哈希核对。工具没有暴露图像模型选择参数，不承诺固定 image2.5。
- 外部交接包、重复导入保护、文字锁定及离线 READY 入库已通过本地接口验证。Antigravity 两个真实想法已入库并核对原始输入、项目 ID 与 imported 回执；Gemini 纯正文 X 草稿已保存，新的 Gemini 正文到 Codex 同项目封面链仍未闭环。
- 公众号网站排版由本次开发的 HTML 渲染逻辑提供；不能把它写成已经执行了 gzh-design Skill。封面设计 Skill 是可选创作规则，原生图像执行路线为 imagegen。
- 模型 API 默认禁用。本次未调用付费模型 API，也未用反向代理替代订阅路线。TikHub 仅通过 localhost 模拟服务验证请求与错误结构，真实搜索待凭据。

下面清单说明各 Skill 的真实路径与职责；列入清单不等于已经集成运行器或逐个执行。当前联动以本地文件交接为基础，不能称为网站一键驱动所有模型。

## 4. 主要 Skill：真实路径与职责

下面列的是本轮为该工作台检查的相关 Skill，并非将本机所有 Skill 全部装进网站。路径是本机快照；实施时检查完整目录和依赖。

| Skill 与真实文件 | 适合的任务 | 执行方 / 关键条件 |
| --- | --- | --- |
| [content-publishing-os](/Users/liangxiaoling/Documents/Playground/.codex/skills/content-publishing-os/SKILL.md) | 来源、母稿、平台版本、发布包与真实发布状态 | 外部创作工具可读取规则；现有脚本需要按其参数与契约接入。不能杜撰亲历或把导出当发布 |
| [imagegen](/Users/liangxiaoling/.codex/skills/.system/imagegen/SKILL.md) | 原生图片生成与编辑 | 优先由 Codex 调用原生 image_gen；设计 Skill 最终交给它出图。其 API 备用脚本需要 key，默认禁用 |
| [gzh-design](/Users/liangxiaoling/.codex/skills/gzh-design/SKILL.md) | 公众号 Markdown → 正文 HTML、复制预览、摘要与封面交付 | 主题与组件指导生成正文 HTML，现有校验 / 预览脚本本地执行；AI 封面交给 Codex。网站自动排版仍需实现或接入实际渲染器 |
| [punk-cover](/Users/liangxiaoling/.codex/skills/punk-cover/SKILL.md) | 通用封面设计与可复用完整提示词；包含公众号母版流程 | 设计规则 + Codex 原生生图。按具体比例制作；保存完整提示词、检查裁切 |
| [gbro-cover-design](/Users/liangxiaoling/.codex/skills/gbro-cover-design/SKILL.md) | 3:4 竖版封面，10 种构图；需要真人时使用真实参考照片 | 设计规则 + Codex 生图。固定 3:4，不直接当公众号横版封面模板 |
| [punk-ip-video-cover](/Users/liangxiaoling/.agents/skills/Punk-Skill/skills/punk-ip-video-cover/SKILL.md) | 从真人照片提取配色、人物主体与多比例视频封面 | 需要本次人物照片；支持多个比例，不等于已经核验抖音 / 视频号规格。图片交 Codex 生成 |
| [baoyu-xhs-images](/Users/liangxiaoling/.codex/skills/baoyu-xhs-images/SKILL.md) | 小红书多页图文：分页、构图、风格、完整提示词与图片 | 优先原生生图；CLI 包装执行有额外依赖，当前不能视为已安装。应使用真实素材与视觉检查 |
| [xhs-note-creator](/Users/liangxiaoling/.codex/skills/xhs-note-creator/SKILL.md) | 小红书发布标题 / 正文与本地模板图文卡片 | `scripts/render_xhs.py` 是本地模板渲染路线，依赖需核验；与 AI 插画制作区分。其发布脚本不接入第一版 |
| [guizang-social-card-skill](/Users/liangxiaoling/.codex/skills/guizang-social-card-skill/SKILL.md) | 真实素材优先的社交卡片、视觉编排与本地呈现 | 可作为另一种设计 / 渲染风格。选择一个模板家族，不把不同封面规范混成同一配置 |
| [x-quote-comment](/Users/liangxiaoling/.codex/skills/x-quote-comment/SKILL.md) | X 引用转推：原帖、评论、事实核验与评论稿 | 专用深度流程，依赖下面的 dbs-chatroom、dbs-content、dbs-ai-check。完整流程有额外工具 / 多角色执行要求，日常每条引用不必默认采用 |

## 5. 可选文案工具与依赖

| Skill 与真实文件 | 用途 | 工作台接入方式 |
| --- | --- | --- |
| [dbs-xhs-title](/Users/liangxiaoling/.codex/skills/dbs-xhs-title/SKILL.md) | 从现有标题公式挑选适用表达 | 可让 Gemini 参考；保留真实内容边界，公式不保证流量 |
| [dbs-hook](/Users/liangxiaoling/.codex/skills/dbs-hook/SKILL.md) | 诊断 / 调整短视频开头 | 适用于有脚本的视频；不强制用于所有图片组合 |
| [dbs-content](/Users/liangxiaoling/.codex/skills/dbs-content/SKILL.md) | 内容诊断，识别表达与选题问题 | 以建议任务运行，不自动替换用户已经认可的稿件 |
| [dbs-ai-check](/Users/liangxiaoling/.codex/skills/dbs-ai-check/SKILL.md) | 按列举的写作特征检查文稿 | 输出诊断；不能当成确定作者身份的检测器 |
| [lieflat-less-ai-tone](/Users/liangxiaoling/.agents/skills/lieflat-less-ai-tone/SKILL.md) | 按明确规则修改表达，保留事实与结构 | 用户选择后执行，展示改动；文案锁定后默认不执行 |
| [dbs-chatroom](/Users/liangxiaoling/.codex/skills/dbs-chatroom/SKILL.md) | x-quote-comment 的多角色讨论依赖，也可独立讨论 | 完整执行需要其规定的工具与步骤；只读其文件不算完成流程，不默认放入高频生产 |

这次用于需求与官方能力核验的辅助 Skill：

- [grill-me](/Users/liangxiaoling/.codex/skills/grill-me/SKILL.md)：通过追问收敛产品目标与范围，不是图片或发布运行器。
- [openai-docs](/Users/liangxiaoling/.codex/skills/.system/openai-docs/SKILL.md)：核验 Codex 官方能力与订阅路径，不是模型调用运行器。

## 6. 第一版怎么选择 Skill

| 需求 | 初始组合 |
| --- | --- |
| 公众号文章 | Gemini 定稿 → gzh-design 本地排版 → Codex + punk-cover 制作独立封面 |
| 小红书 AI 图文 | Gemini 写正文 → Codex 按 baoyu-xhs-images 规划分页 / 图内表达 → imagegen 生成图片 |
| 小红书模板卡片 | Gemini 正文 → Codex / 用户确认卡片表达 → xhs-note-creator 本地渲染；有插画需要时另用原生生图 |
| 真人视频封面 | Codex 读取正文与照片 → punk-ip-video-cover 或 gbro-cover-design 二选一 → imagegen；封面文字由 Codex 提炼 |
| 通用视频封面 | Codex 读取正文、比例与用途 → punk-cover → imagegen |
| X 引用评论 | 默认 Gemini 完成；需要深度事实分析时用户选择完整 x-quote-comment 流程，由有相应工具的执行方承担 |
| 图片组合视频 | 已确认图片与用户音乐 → 登记的本地合成运行器；不要求再调用写作或生图模型 |

封面设计 Skill 负责提示词和视觉方法，imagegen 负责生成图片。公众号排版可以先由 Codex 根据主题与组件生成 HTML，再运行本地校验 / 预览脚本；后续可把确定的规则做成本地 Markdown 渲染器，无须为固定排版购买模型 API。不能把现有校验脚本描述成已经实现完整自动排版引擎。

小红书不默认套用纯文字大圆角模板。优先检查素材、信息密度、首图吸引力、每页节奏和可读性；在确实适合文字卡片的选题中再选择模板路线。

## 7. 双客户端的完整交接

以下为待实施的约定，不是当前网站已经存在的文件。

```text
data/handoff/<projectId>/<taskId>/
  task.json            项目 ID、版本号、执行方、任务类型、允许修改字段
  sources.md           真实来源与事实边界
  approved-copy.md     正文与当前修订；存在用户指定文字时一并保存
  visual-brief.json    比例、用途、风格、参考素材 ID；准确指定文字可选
  references/          允许发送给执行工具的参考素材

data/incoming/<importId>/
  manifest.json        对应项目 / 任务、版本号、文件用途、执行信息
  copy/                本任务确实允许新增或修改的文稿
  images/              真实图片
  prompts/             完整生图提示词
  layout/              HTML 和复制预览等
  READY                最后写入的完成标记

data/receipts/<importId>.json
                       后台导入后生成的真实回执
```

步骤：

1. 用户在 Antigravity 直接提交想法、正文或链接；工具按项目规则保存捕获包，网站自动导入，返回实际对象 ID。
2. Gemini 产出用户需要的平台正文，写入独立导入包；不强制先产出标题、封面文字或图文页文字。
3. 网站导入并保存正文修订号；需要图片时导出该修订的作图 / 排版任务。
4. 用户在 Codex 让它读取任务与指定 Skill，生成真实文件到自己的导入包。
5. 网站校验版本与锁定文字，补齐图片、封面、HTML，不覆盖正文。
6. 用户预览成品，复制 / 下载发布包，发布后才记录完成。

两个客户端不直接改数据库、不同时改同一文件，不要求互相读聊天。网站自动导入并提供任务入口；复制任务和手动导入保留为兜底。后台未运行时工具只能说“已写入待导入”，不能没有回执就说“已保存到网站”。

## 8. 可以直接使用的两段交接指令

给 Antigravity / Gemini：

```text
读取工作台导出的 <写作任务目录>，按其中的项目 ID、来源和平台形式写作。
默认负责全部平台正文，包括 X；必要摘要按格式提供。
不要求提前写封面标题或图内文字，封面由后续 Codex 直接读取正文制作。
平台最终发布所需标题可以后续补齐，不作为想法入库的前置条件。
不要伪造亲历、检索成功或已发布状态。
产物写入任务指定的独立 incoming 包，按工作台 schema 写 manifest，文件完整后写 READY。
涉及未核验事实或无法完成的能力，写入 reviewNotes。
```

给 Codex：

```text
读取工作台导出的 <视觉任务目录>。
读取 approved-copy 的正文，自行决定封面文字、构图与视觉表达，不重写正文或新增缺乏依据的事实。
用户另行指定的准确标题 / 图内文字必须保留；没有指定文字也应继续制作。
按任务指定的封面 / 图文 Skill 规划视觉，调用原生 imagegen 生成真实图片。
不使用需要 API key 的备用生图脚本，不转付费 API；没有原生生图能力时报告缺口。
如需公众号排版，按 gzh-design 运行本地排版与校验，保留原文。
保存完整提示词、实际图片、HTML 与校验结果，写入指定独立 incoming 包。
检查尺寸、裁切、文字和引用关系；按 schema 写 manifest，最后写 READY。
不要直接修改工作台数据库或标为已发布。
```

尖括号目录由网站实际任务生成替换。第一版任务模板不用自动向别的 Codex 会话发送消息。

## 9. 官方 CLI 接入的验收顺序

1. 核验 CLI 可执行文件、版本、官方登录方式与可用任务权限，输出状态，不输出令牌。
2. 先用现有文件验证读入任务、写出规定目录、JSON / 日志解析和幂等导入。
3. 用一个用户指定的写作任务验证 Antigravity 非交互执行及实际模型，不批量耗费额度。
4. 用一张用户指定的图片验证 Codex 非交互任务能否调用原生生图并保存真实图片；不能用“生成了提示词”代替。
5. 原生工具不可用、权限不足、超时或限流时停止该任务，保留手动客户端交接路径。
6. 按不同任务类型分别启用按钮，不设置一个无法解释的通用“AI 已连接”。

执行器只调用登记的官方 CLI / 本地脚本，限定输入输出目录，使用结构化参数与有上限的重试。按现有官方帮助确定命令，不预写未经本机验收的万能命令。

## 10. 迁移和注册要求

- 读取 Skill 主说明及其引用的 scripts、references、templates、assets；只复制主文件会丢失能力。
- 跨工具复用时，设计规则保留，专属工具调用另写适配器，不假定 Antigravity 拥有 Codex 的原生 image_gen。
- 注册时保存 skillId、路径、用途、执行方、依赖、输入 / 输出、允许修改字段、收费路径和最近真实验证。
- 区分“说明已检查”“脚本依赖通过”“真实任务通过”“视觉检查通过”。
- 一个版本的封面先选择一个设计流程，不把所有封面 Skill 自动串起来重复生图。
- 网站内的模板、比例与平台规则独立配置；Skill 默认值不直接升级为平台官方要求。
- 不注册现有 Skill 中的账号登录、自动公开发布脚本；发布仍由用户完成。
- 不复制 .env、令牌、登录缓存或用户私有业务数据到普通技能包。

建议第一版核心注册 content-publishing-os、imagegen、gzh-design、punk-cover、baoyu-xhs-images；模板渲染与其他风格按实际需要启用。所有项目仍可导入由其他工具制作的真实产物。

## 11. 新增的收藏、知识留档与拆解候选

| Skill 与真实文件 | 职责 | 接入说明 |
| --- | --- | --- |
| [defuddle](/Users/liangxiaoling/.codex/skills/defuddle/SKILL.md) | 普通网页提取干净 Markdown 和基础元信息 | 可读文章的采集候选；实际 CLI / 依赖未执行核验，不当作小红书、视频号等全平台万能采集器 |
| [obsidian-personal-database-ops](/Users/liangxiaoling/Documents/Playground/.codex/skills/obsidian-personal-database-ops/SKILL.md) | 真实 Vault 的原件、资料卡、查重、来源与操作日志 | 本轮仅检查说明；实施时先读 Vault AGENTS.md / 契约、dry-run，再按用户启用的范围单向导出，不覆盖原件 |
| [dbs-benchmark](/Users/liangxiaoling/.codex/skills/dbs-benchmark/SKILL.md) | 商业对标筛选与模仿检查 | 已检查，未选作默认内容拆解。其利润门槛与部分观点不对应本轮内容增长目标，不作为平台事实 |

需新编写的项目流程：

- `workbench-capture`：识别用户当天想法 / 正文 / 收藏 / 拆解指令，保存原始输入、生成捕获包、读取真实入库回执。可用 Antigravity 项目规则实现，不一定另装插件。
- `content-deconstruction`：由 Gemini 按 PRD 7.7 输出文章 / 有限样本账号报告、证据与可选选题，保存到网站。

以上两个名称是待实现流程，不是本机已有 Skill，不提供虚构安装路径。网站支持这些结果的导入与查询，不因注册名称就宣称已经可运行。
