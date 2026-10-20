# Codex 实施前审计（2026-10-10）

此记录为独立验收基线，不是已完成声明。

- 真实项目：/Users/liangxiaoling/Downloads/个人内容工作台；不是 Git 仓库。
- 前端正在 localhost:5173 运行，后端 3001；后端实际监听 *:3001，必须修正回环绑定。
- GET /api/settings 返回 geminiApiKey、tikhubApiKey 字段，前端拿到原始凭据；不能只遮盖设置页输入框。
- cors() 不限制来源，写入接口无本地鉴权。
- server/services/tikhub.ts 未配置、HTTP 错误、空响应、异常均回 MOCK_TRENDS，标为 cached_radar；需真实待配置/失败。
- GET /api/kpi 为单一目标20，历史 completedCount 按稿件产出计；需真实发布记录、平台/形式分口径和上海日期。
- server/index.ts 新增对标账号默认10万粉，随机作品/爆款数；db.syncBenchmarkAccounts 随机修改指标。
- 页面宣称每天9:30自动同步，展示一小时前同步、爆款样本等，但不能据界面认定真实调度或数据。
- 既有基线：benchmarks 11，topics 4，posts 1，matrix_packs 3，kpi_logs 1；另有 posts/ 下已生成的 Markdown 和 persona 偏好。迁移后保留原始资料；未经核验的旧指标不能标为真实快照。
- JSON read/write 吞错需修复；恢复、事务、冲突、锁定正文、幂等不能只写在说明中。
- 旧 Matrix 各平台 covers 主要是提示词/标题，真实图像文件才算作图成功。

Codex 将用隔离数据目录验证幂等、旧修订冲突、锁定文本、复制不计发布、发布重复确认、离线 READY 回执、五平台快照和备份恢复等，避免给用户实际发布统计掺入测试数据。

请在实施报告分项映射 PRD 第13节40个场景；外部连接器未真实测试必须标待配置或待接入，不能宣称全验收通过。

## 编码中途检查（不是最终验收）

当前新建的 handoff.ts 和重写的 db.ts 还存在以下风险，请在完成声明前整改：

1. inspectImageDimensions 对所有非 PNG 的非空文件直接返回1080×1440并标valid，包括.txt；必须按真实格式解析，无法解码即拒绝，不能编造尺寸。原生验收图已生成在 acceptance-fixtures/native-cover.png（1086×1448）。
2. isSafeRelativePath 的 startsWith(baseDir) 允许同前缀兄弟目录；还需要验证 importId/projectId/taskId/ref.name、绝对路径和符号链接，不能从包外读取或写回执到包外。
3. 新 IncomingManifest 仍要求先存在 projectId，没有 operation/capture；离线仅想法包不能凭 READY 自动建选题。captureChatInput 先写数据库再写包/回执不等于统一捕获事务。必须满足31/32，新 capture 无项目 ID 也可后台导入。
4. 图片被追加到项目所有版本，缺 variantId 精确归属；独立视频/图文、独立平台封面会混淆，须只修改目标版本/用途。
5. Gemini copy 直接修改母稿，不检查任务允许字段/文案锁和摘要；Codex copy 请求被静默忽略仍可能标imported。应明确拒绝锁定文本的非法更新；旧修订冲突保留正文并给差异。
6. DB JSON read/write 仍吞错；需原子持久化、错误传播和导入回执与数据一致。
7. DATA_DIR 仍固定cwd/data，请支持 WORKBENCH_DATA_DIR 等隔离目录；媒体/导入/回执/导出/备份都使用同一根。测试应不修改用户真实统计。
8. 模型 API 调用要在服务入口和服务函数显式默认禁用，即使已有凭据也不能自动生成；UI声明“订阅”不能代替技术开关。
9. confirmPublish 在项目/版本不存在时也创建默认X记录；必须校验目标和准备完整性，不能任意ID刷KPI。今日日期和发布记录日期按 Asia/Shanghai 计算，不能直接用 UTC startsWith。
10. createBackup 只复制 data 顶层 JSON，忽略 incoming/媒体/模板等目录；完整恢复须包含实际资产文件并校验引用，支持在干净隔离目录恢复。
11. 新 TikHub 函数仍调用热榜/主页流接口，query 未传输，X/其他平台也未正确解析；这不等于用户要求的帖子关键词搜索。请按 PRD 7.3 已核验路径接 X GET fetch_search_timeline 和抖音 POST fetch_general_search_v1，保留真实请求参数、分页、字段未知/空结果/部分返回状态。源帖发布时间不能填抓取时间，热榜链接不能冒充源帖子 URL。无凭据保留待配置，结构测试不能宣称实时检索通过。
12. 当前后台只有手动 import API，没有启动扫描/持续扫描完整 READY 包，也没有每日检索调度、有限补跑、请求上限与持久运行记录；网页关闭后的行为需实际验证。
13. 在项目中持久保存 Antigravity 能读到的日常捕获规则和受控 capture 脚本；只提供网站“粘贴输入”按钮或API，不等于对话自动入库。服务离线时脚本只写READY包并报告待导入，恢复后回执才是已保存。
14. 保留并可检索浏览既有 posts/ 下22份Markdown与研究/偏好资料；若不能可靠拆成各平台版，可先导入为待整理原始资料，不能悄悄丢掉或将原产出KPI升级成真实发布记录。

这些是读当前中间稿发现的问题，后续以完成后的真实端到端测试为准，不需保留这一实现方式。

## 第一轮真实 HTTP 检查结果

已在隔离 cwd 启动当前后端（127.0.0.1:3017），运行13项黑盒 HTTP / 文件检查，3项通过、10项失败。完整结果见同目录 Codex-first-pass-results.json；测试脚本在需求交付目录的验收证据/first-pass-probe.py。用户实际项目的内容与发布统计未参与这些写入。

通过：设置接口不返回原始密钥字段、HTTP捕获返回真实对象与回执、相同importId重复导入幂等。

失败：图片被加到三个版本而非目标版本；文本文件被接受为1080×1440图像；无projectId的离线capture失败；不存在的项目/版本也能确认发布；未填粉丝默认为10万并带随机指标；3.7万被截成3万；只有URL且正文空仍标full；恶意Origin写入返回200；备份不含引用封面；有key时默认会调用模型API。

模型测试使用完全本地的假服务和假key，观测到1次请求，没有调用付费模型或TikHub。修复后应重新启动隔离实例再跑；不要仅修改报告标成通过。请继续完成PRD其余本地必要能力，并将未接入外部能力单独列出。

本轮 tsc --noEmit 退出码2、9处类型错误，详见 Codex-typecheck-round1.txt：DB重写移除了仍被旧矩阵路由调用的MatrixPack方法，App KPI类型尚未迁移，SettingsModal缺少api导入。后续应消除真实错误，不能用关闭类型检查作为通过依据。
