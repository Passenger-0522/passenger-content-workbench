---
trigger: always_on
description: Capture only user content ideas into this local workbench; preserve raw input and receipts.
---
# Workbench Dialogue Capture Rule (自媒体工作台对话自动捕获规则)

本文档定义 Antigravity 针对本工作台的自动捕获协议（符合 PRD v1.2 第 7.5 节与 Codex Round 2/5 审计要求）：

## 排除范围（严禁捕获）
严禁将以下工程指令当作内容创作灵感捕获：
- 代码开发、编译构建、排错调试、测试验证指令
- 审计报告、评审意见、系统环境配置指令
- 仅当用户明确提供创作灵感、选题构想、短推观点、文案草稿或收藏文章时才进行内容捕获

## 触发条件
当用户在对话中发送以下自媒体创作内容时，必须触发对话捕获流程：
1. 自媒体选题构想、灵感火花或观点吐槽；
2. 文章正文草稿、短推内容、多平台文案母稿；
3. 外部文章链接（如公众号、小红书、知乎、推特等收藏链接）；
4. 对标博主分析或商业线索。

## 捕获执行 SOP
1. 调用受控捕获脚本或服务端接口：
   ```bash
   ./scripts/capture.sh "<用户原始输入全文>" "<提炼的简明标题>" "<提取的URL(如有)>" "<平台(x/xiaohongshu/gzh/douyin/channels/custom)>"
   ```
2. 边界约束：
   - 必须保留用户原始输入文本，不得擅自删减或改写原意；
   - 缺标题或缺平台时，自动补齐简明标题，不要求用户先打开网站或建立项目；
   - 服务在线时：读取脚本返回的 JSON 回执（包含 `projectId`, `topicId`, `receipt.status`），向用户报告“已保存到工作台”；
   - 服务离线时：脚本会自动降级写入 `data/incoming/<importId>/` 并生成 `READY` 就绪包，向用户明确报告“已写入待导入包，回执状态：待导入”，工作台启动后会自动扫入入库，绝不冒充此前已保存到网站。
