# 🔍 OpenAI Codex (VS Code 插件 & CLI) 深度痛点与开发者真实吐槽调研

> 调研对象：X (Twitter)、Reddit (r/vscode, r/ChatGPTCoding)、V2EX、GitHub (openai/codex issues)
> 调研焦点：聚焦 OpenAI 官方推出的 **Codex - OpenAI's coding agent**（VS Code 扩展插件及配套 CLI）在真实生产环境中的高频致命缺陷与开发者骂声

---

## 一、真实开发者对 OpenAI Codex 的 6 大高频致命槽点

### 1. Git 幽灵快照轰炸（`.git/refs/codex` 塞爆硬盘与干崩 GUI）
* **硬核真相**：Codex 每次 turn 交互都会在后台偷偷创建 `refs/codex/turn-diffs/checkpoints/`，把整个工作区甚至是未跟踪文件的快照一股脑塞进 `.git` 对象库。
* **致命后果**：
  * 项目 `.git` 文件夹体积莫名其妙暴涨几十 GB，硬盘直接告急。
  * 打开 SourceTree、Tower、GitLens、Sublime Merge 时直接弹出 `bad object` 或非 Commit 引用错误，客户端直接崩溃闪退。
  * Windows 环境下因为嵌套目录过深直接触发文件路径超长报错。
  * 开发者不得不经常在终端狂敲 `git for-each-ref refs/codex | git update-ref --stdin` 帮它手动清理。

### 2. VS Code 侧边栏日常假死与 Reload Window 地狱
* **硬核真相**：官方插件基于 Webview 实现，但架构极其脆弱。
* **致命后果**：
  * 侧边栏动不动白屏，或者永远卡在“Loading”旋转圈。
  * 敲了三五百字的复杂 Prompt，按下回车毫无反应，或者刷新后历史记录凭空蒸发。
  * 开发者每天在 VS Code 里按 `Cmd+Shift+P` -> `Developer: Reload Window` 的次数，比敲回车还多。

### 3. 工具生态严重精神分裂（插件版卡成幻灯片，全员逃难去 CLI）
* **硬核真相**：官方在 VS Code 插件上的优化极度拉胯，而终端版 CLI 相对稳定很多。
* **致命后果**：
  * 插件端经常出现版本滞后、发热严重、风扇呼呼狂转。
  * 社区里大量资深开发者的统一共识是：“千万别用官方的 VS Code 插件，赶紧关掉，直接去终端跑 `codex` CLI，或者回退旧版本关掉自动更新”。

### 4. 牛皮癣式 CodeLens：误触灾难 `Implement with Codex`
* **硬核真相**：默认在所有 `// TODO` 注释上方强行注入 CodeLens 按钮。
* **致命后果**：
  * 代码里随手写个标记，头上立刻蹦出一个巨大的 `Implement with Codex` 按钮。
  * 鼠标手滑误触一下，整个编辑器直接被挂起抢占焦点，卡顿几秒等待响应，极其恶心，生怕别人不知道你装了 AI。

### 5. 云端委派（Cloud Tasks）的薛定谔黑盒与冲突地狱
* **硬核真相**：官方吹捧的“一键委派大任务给云端 Codex”。
* **致命后果**：
  * 任务扔上云端后进入黑盒排队，本地根本看不到实时日志和进度，经常卡死半小时没有任何动静。
  * 终于跑完同步回本地时，因为本地文件已经发生变动，直接产生满屏的 Git Merge 冲突，排查冲突的时间比手敲代码还要长。

### 6. 代理玄学断连与 Plus 歧视限流
* **硬核真相**：网络适应能力极差，且针对账号分级刀法精准。
* **致命后果**：
  * 只要开了系统代理，插件立刻疯狂报 `Reconnecting`，和本地内网服务打架，天天被迫跑 `codex doctor` 排错。
  * 号称 Plus 订阅可用，但跑两个多文件编辑任务就触顶 Rate Limit，窗口天天弹广告暗示你升级 $200/月的 Pro 订阅。
