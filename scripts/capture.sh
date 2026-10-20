#!/usr/bin/env bash
# ==============================================================================
# scripts/capture.sh - Antigravity 对话捕获入库与离线就绪包写入脚本
# 符合 PRD v1.2 规范与 Codex Round 2 审计要求：
# 1. 服务在线时：通过 127.0.0.1:${PORT:-3001}/api/capture 提交，使用 curl --fail-with-body 检查 HTTP 状态码与回执 status；
# 2. 服务离线时：安全写入 ${WORKBENCH_DATA_DIR:-data}/incoming/<importId>/ 并放置 READY 文件，
#    离线清单完整保存 title/sourceUrl/platform/rawInput，报告“待导入”，服务启动自动扫入。
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKBENCH_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="${WORKBENCH_DATA_DIR:-$WORKBENCH_ROOT/data}"
PORT="${PORT:-3001}"
HOST="127.0.0.1"
API_URL="http://${HOST}:${PORT}/api"

# 读取输入
RAW_INPUT="${1:-}"
TITLE="${2:-}"
SOURCE_URL="${3:-}"
PLATFORM="${4:-custom}"

if [[ -z "$RAW_INPUT" ]]; then
  if [ ! -t 0 ]; then
    RAW_INPUT="$(cat)"
  fi
fi

if [[ -z "$RAW_INPUT" ]]; then
  echo "❌ 错误: 捕获内容不能为空"
  echo "用法: $0 \"原始想法或对话内容\" [标题] [来源链接] [平台]"
  exit 1
fi

if [[ -z "$TITLE" ]]; then
  TITLE="$(echo "$RAW_INPUT" | head -n 1 | sed -e 's/^[#[:space:]]*//' | cut -c 1-40)"
  if [[ -z "$TITLE" ]]; then
    TITLE="灵感捕获 $(date '+%Y%m%d%H%M')"
  fi
fi

# 检查服务是否在线
IS_ONLINE=0
if curl -s --max-time 2 "${API_URL}/health" >/dev/null 2>&1; then
  IS_ONLINE=1
fi

if [[ "$IS_ONLINE" -eq 1 ]]; then
  # 1. 在线提交
  PAYLOAD="$(node -e "
    const input = process.argv[1];
    const title = process.argv[2];
    const sourceUrl = process.argv[3];
    const platform = process.argv[4];
    console.log(JSON.stringify({ rawInput: input, title, sourceUrl: sourceUrl || undefined, platform }));
  " "$RAW_INPUT" "$TITLE" "$SOURCE_URL" "$PLATFORM")"

  # 获取本地握手鉴权 Token
  TOKEN="${WORKBENCH_SESSION_TOKEN:-}"
  if [[ -z "$TOKEN" ]]; then
    TOKEN="$(curl -s "${API_URL}/auth/token" | node -e '
      try {
        const d = JSON.parse(require("fs").readFileSync(0, "utf-8"));
        process.stdout.write(d.token || "");
      } catch(_) { process.stdout.write(""); }
    ' 2>/dev/null || true)"
  fi

  # 使用 curl --fail-with-body 与状态码提取
  CURL_OUT="$(curl -s --fail-with-body -w "\n%{http_code}" -X POST "${API_URL}/capture" \
    -H "Content-Type: application/json" \
    -H "Origin: http://127.0.0.1:${PORT}" \
    -H "x-workbench-token: ${TOKEN}" \
    -d "$PAYLOAD" || true)"

  STATUS_CODE="$(echo "$CURL_OUT" | tail -n 1)"
  RESPONSE_BODY="$(echo "$CURL_OUT" | sed '$d')"

  if [[ "$STATUS_CODE" -ge 200 && "$STATUS_CODE" -lt 300 ]]; then
    RECEIPT_STATUS="$(node -e "
      try {
        const j = JSON.parse(process.argv[1]);
        console.log(j.receipt?.status || 'imported');
      } catch(e) {
        console.log('parse_error');
      }
    " "$RESPONSE_BODY")"

    if [[ "$RECEIPT_STATUS" == "imported" ]]; then
      echo "✅ 对话捕获已成功入库！"
      echo "$RESPONSE_BODY"
      exit 0
    else
      echo "⚠️ 捕获提交成功但回执状态异常: $RECEIPT_STATUS"
      echo "$RESPONSE_BODY"
      exit 1
    fi
  else
    echo "❌ 捕获入库失败 (HTTP $STATUS_CODE):"
    echo "$RESPONSE_BODY"
    exit 1
  fi
else
  # 2. 离线降级：写入 incoming READY 包，清单完整保留输入字段
  IMPORT_ID="cap_offline_$(date +%s)_$RANDOM"
  PACKAGE_DIR="$DATA_DIR/incoming/$IMPORT_ID"
  mkdir -p "$PACKAGE_DIR/copy"

  echo "$RAW_INPUT" > "$PACKAGE_DIR/copy/master.md"
  echo -e "# 来源事实源 (Offline Capture)\n- 标题: $TITLE\n- 来源: $SOURCE_URL\n- 平台: $PLATFORM\n\n$RAW_INPUT" > "$PACKAGE_DIR/sources.md"

  node -e "
    const fs = require('fs');
    const path = process.argv[1];
    const importId = process.argv[2];
    const title = process.argv[3];
    const sourceUrl = process.argv[4];
    const platform = process.argv[5];
    const rawInput = process.argv[6];

    const manifest = {
      schemaVersion: '1.2',
      operation: 'capture',
      importId: importId,
      executionParty: 'antigravity',
      title: title,
      sourceUrl: sourceUrl || undefined,
      platform: platform,
      rawInput: rawInput,
      files: {
        copy: 'copy/master.md'
      },
      reviewNotes: 'Antigravity 离线捕获灵感，等待服务启动自动入库'
    };
    fs.writeFileSync(path, JSON.stringify(manifest, null, 2), 'utf-8');
  " "$PACKAGE_DIR/manifest.json" "$IMPORT_ID" "$TITLE" "$SOURCE_URL" "$PLATFORM" "$RAW_INPUT"

  # 写入 READY 标记
  echo "READY" > "$PACKAGE_DIR/READY"

  echo "⚠️ 工作台服务未运行 (离线状态)"
  echo "📦 已写入离线待导入包: $PACKAGE_DIR"
  echo "回执状态: 待导入 (就绪标记 READY 已写入，工作台启动后将自动扫入并生成选题与项目)"
  exit 0
fi
