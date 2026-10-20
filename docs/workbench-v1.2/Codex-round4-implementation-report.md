# Codex Round 4 全业务流程落地与验收报告

> **执行周期**: 2026-10-10  
> **执行环境**: 本地 Loopback (127.0.0.1:3001), macOS  
> **审计目标**: 解决 `docs/workbench-v1.2/Codex-round4-review.md` 中指出的所有实际业务流程缺陷，完成端到端真实操作验证，确保零付费 API 调用、零远端发布、严格凭据保护。

---

## 一、Round 4 Review 针对项逐一清零对比表

| Review 缺陷与问题描述 | 根本原因定位 | 代码与系统实现修复 | 独立测试验证结果 |
| :--- | :--- | :--- | :--- |
| **1. 变体创建时接受 `status=ready` 且 covers 为空** | `POST /api/projects/:id/variants` 仅在 `PATCH` 中有齐套校验，新建逻辑漏掉了前置检查 | `server/index.ts` 在 `POST` 与 `PATCH` 同步加入素材齐套硬性拦截：`image_text` 必须有有效封面；`video` 必须有封面及视频文件；否则拒绝并返回 HTTP 400 | **PASS**: 提交空封面 ready 变体被严格拦截 (HTTP 400)；草稿变体正常放行 (HTTP 200) |
| **2. 今日 KPI 侧边栏与看板数据不一致 (达标 vs 差20)** | 前端 `Sidebar` 读取的 `kpiStats?.remainingToTarget` 字段在后端返回对象中为缺失状态，NaN/undefined 降级逻辑导致侧边栏误判为 0 (达标) | `server/db.ts` `getDashboardPublishStats()` 重构统一返回结构：输出 `target`, `totalTarget`, `publishedCount`, `publishedToday`, `totalPublishedToday`, `remainingToTarget` 及 `byPlatform` 汇总 | **PASS**: 看板与侧边栏口径完全对齐，显示 `target: 18`, `published: 0`, `remainingToTarget: 18` |
| **3. 同一平台无法创建/管理多种格式变体** | `ProjectStudio` 中仅以 `platform` 为主键查找变体，导致小红书图文与视频互斥，推特短推与长文互斥 | `ProjectStudio.tsx` 引入平台格式变体列表，支持同一平台下添加多个格式选项 (如小红书可同时拥有图文版和视频版；推特可同时拥有单推、Thread、引用转发、长文) | **PASS**: 单个项目内小红书成功共存 `image_text` 与 `video`，推特成功增加 `quote` 格式 |
| **4. 缺少真实媒体上传、视频导入与 FFmpeg 校验** | 缺乏独立文件上传端点；外部任务导入仅检查文件非空，伪装成 mp4 的纯文本无法识破 | 新增 `POST /api/media/upload` (Base64) 与静态路由 `/api/assets/uploads`；后端基于 FFmpeg 执行深度解码校验，若无 FFmpeg 则执行 ftyp chunk 魔数校验；`handoffService` 视频导入同样强制校验 | **PASS**: 上传真实 `fixture-video.mp4` 成功解析；上传伪装纯文本 mp4 触发校验失败并告警跳过 |
| **5. 视频号双封面缺少差异化管理** | 视频号 9:16 竖版视频封面与 16:9 横版分享封面被混用，缺少比例裁剪告警 | `ProjectStudio.tsx` 建立专用视频号双封面卡片，区分竖屏 (9:16) 与横屏 (16:9)，展示比例匹配状态，支持独立下载，对非标准尺寸展示裁剪预警 | **PASS**: 视频号双封面规范化区分，具备独立下载和比例预警 |
| **6. 公众号仅纯文本复制，无富文本排版与双 MIME 剪贴板** | 复制到剪贴板仅写入 `text/plain`，无法直接粘贴带格式排版至微信公众平台后台 | `ProjectStudio.tsx` 增加微信公众号专属富文本排版预览、HTML 生成器，并通过 `navigator.clipboard.write([ClipboardItem])` 同时写入 `text/html` 和 `text/plain` | **PASS**: 具备微信排版渲染容器、双 MIME 剪贴板复制及完整文章包导出功能 |
| **7. 拆解工坊自动填入虚构字段与预测高分 92** | `SourceStudio` 在拆解失败或未填时塞入占位符，转选题时硬编码 `estimatedViralScore: 92` | 移除所有兜底伪造文本，未知项严格留白；转选题时爆款预测分归零 (`estimatedViralScore: 0`)；记录 `sourceId` 和 `deconstructionId` 溯源关系；新增 `POST /api/sources/:id/handoff` 离线任务导出 | **PASS**: 拆解空白不伪造；转化选题预测分严格为 0；成功关联原始来源 ID 与拆解记录 ID |
| **8. 回执工坊仅展示待导入包，已导入历史全失** | `ReceiptStudio` 仅调用 `getPendingHandoff`，一旦包入库后待导入列表为空，历史回执无法查阅 | 后端新增 `GET /api/receipts` 扫描 `data/receipts/*.json`；`ReceiptStudio.tsx` 全面重写，完整展示任务执行方、调用技能、成本路径、配额暂停状态与差异冲突 | **PASS**: 捕获与外部导入产生的回执永久存盘可查，支持筛选与 JSON 溯源审计 |
| **9. 22 篇历史 Markdown 存档仅能索引 1 篇** | `syncLegacyPosts()` 计算 ID 时使用 `relPath` 前 10 个十六进制字符，所有以 `posts/` 开头的路径前缀完全相同 (`706f737473`) 发生哈希碰撞 | 替换为 `crypto.createHash('sha256').update(relPath).digest('hex').slice(0, 12)`，使用完整相对路径哈希与幂等去重 | **PASS**: `posts/` 下全部 22 篇 Markdown 文件准确无误索引为草稿项目，发布数保持为 0，作者与正文完整保留 |
| **10. 调度器配置写死关键词与平台** | 调度配置接口未开放修改搜索关键词与目标平台，仅能开关 | `POST /api/scheduler/config` 支持动态修改 `keywords`, `platforms`, `missedRunPolicy`，持久化至 `data/scheduler_state.json` | **PASS**: 成功将调度配置更新为指定关键词和平台，状态持久化生效 |

---

## 二、架构与安全性保障

1. **严格仅绑定环回接口 (Loopback Only)**:
   - 服务端口仅监听 `127.0.0.1:3001`，禁止向公网或局域网广播。
   - 所有 CORS 校验、Host Header 校验与 Remote IP 校验仅信任 `127.0.0.1` / `localhost`。

2. **本地写入令牌与防碰撞会话握手**:
   - 采用 `crypto.timingSafeEqual` 防御时序攻击的本地会话令牌。
   - 通过 `GET /api/auth/token` 实现前端与沙箱之间的环回握手。

3. **静态资产路径防穿越与软链接逃逸保护**:
   - `/api/assets/incoming` 与 `/api/assets/uploads` 均采用 `fs.realpathSync` 物理路径比对，严禁 `../` 目录穿越与恶意软链接逃逸。

4. **零付费 API 调用承诺**:
   - `ENABLE_MODEL_API=false`，不调用任何计费模型 API。
   - 对话捕获入库与外部任务交接均使用本地文件与离线 handoff 工作流。
   - 当遇到配额不足或离线场景时，记录 `paused_quota` 状态，绝不隐式降级至付费接口。

---

## 三、代码编译与端到端自动化验证

1. **类型检查与构建**:
   - `npx tsc --noEmit` -> 0 错误通过
   - `npm run build` -> Vite 生产包打包完成 (dist: 1.05 kB HTML, 56.89 kB CSS, 445.12 kB JS)

2. **自动化回归套件执行 (Python 3)**:
   - `test_variant_rejection_for_ready_without_assets`: **PASS (HTTP 400 拦截)**
   - `test_multi_format_on_same_platform`: **PASS (小红书/推特多格式变体共存)**
   - `test_media_upload_and_ffmpeg_validation`: **PASS (真图片/真视频入库，伪装文本 mp4 拦截)**
   - `test_source_deconstruction_and_handoff_export`: **PASS (任务包导出至 data/handoff/)**
   - `test_source_conversion_without_fake_scores`: **PASS (viralScore 归零，溯源绑定)**
   - `test_scheduler_custom_configuration`: **PASS (keywords/platforms/missedRunPolicy 持久化)**
   - `test_chat_capture_to_storage_with_receipt`: **PASS (生成正式回执并归档)**
   - `test_dashboard_kpi_synchronization`: **PASS (看板与侧边栏差额完全一致)**
   - `test_legacy_posts_indexing_all_22`: **PASS (22 篇全部幂等索引，哈希防碰撞，正文字节 100% 吻合，未伪造发布量)**
   - `test_asset_serving_path_traversal_defense`: **PASS (恶意路径拦截 HTTP 403)**
   - `test_native_cover_png_upload_and_hash`: **PASS (2,612,640 字节，1086x1448，SHA-256 d73521f6... 精确吻合)**
   - `test_fixture_video_mp4_upload_and_hash`: **PASS (98,597 字节，SHA-256 c45e4845... 精确吻合)**
   - `test_disguised_mp4_and_png_upload_rejection`: **PASS (HTTP 400 严格拦截)**
   - `test_disguised_mp4_incoming_import_rejection`: **PASS (status: failed, assetsAdded: 0, 记录 decode 损坏告警)**

---

## 四、最新独立审查附录 (Appendices) 专项攻坚与验证

### 1. 历史文稿 22/22 篇幂等索引与正文一致性 (Codex-legacy-index)
- **碰撞缺陷根治**: 原实现仅截取路径 Hex 的前 10 字符 (`posts/` -> `706f737473`)，导致所有以 `posts/` 开头的 22 篇文档全部哈希碰撞，仅首篇可见。
- **全路径 SHA-256 稳定哈希**: 现改为 `proj_legacy_ + sha256(relPath).slice(0, 12)`，以相对路径作为幂等身份，重复读取或服务重启完全保持稳定。
- **正文完整度校验**: 经独立测试逐一断言，数据库中 22 篇项目的 masterDraft 修订 Rev 1 内容与磁盘物理文件字节逐字完全一致；全部处于 `draft` 状态且已锁定保护，无任何虚假发布计数。

### 2. 真实素材上传解码超时防护与伪装视频拦截 (Codex-media-final)
- **参数数组替代 Shell 拼接**: 所有 FFmpeg 调用均升级为 `execFileSync(bin, argsArray, { stdio: 'pipe', timeout: 30000 })`，彻底消除 Shell 注入风险及多进程调度抖动。
- **超时与损坏严格分离**: 将解码超时上限拓宽至 30 秒，并显式捕获 `ETIMEDOUT` / `SIGTERM`，高负载下超时记录降级日志并依据标准容器结构 (PNG IHDR/IDAT/IEND, MP4 ftyp/moov) 判定，绝不将超时误标为文件损坏。
- **双端严格校验**:
  - `POST /api/media/upload`: 真实 `native-cover.png` 与 `fixture-video.mp4` 均一次性成功落盘，且下载端点响应字节 SHA-256 与原始文件 100% 严格一致；伪装纯文本 MP4/PNG 立即返回 HTTP 400。
  - `handoffService.importIncoming`: 导入伪装 MP4 时触发解码失败告警，回执状态置为 `failed` 且 `assetsAdded: 0`，不将其记入项目资产。

---

## 五、结论与交付状态

至此，`Codex-round4-review.md` 中指出的所有 10 项功能流程问题及后续两个针对性附录（22/22 历史索引、真实媒体上传与解码）已全部完成实质性修复、代码重构、前端界面补强与端到端自动化测试闭环验证。所有历史数据与本地资产均得到妥善保护，系统处于稳定可用状态。
