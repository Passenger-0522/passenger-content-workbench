# Codex Round 4 Independent Review - full user workflows still required

Core 13/13, extended 12/12, deeper asset/auth/export 9/9 PASS using isolated backend 3022. This is 34 API checks, NOT all PRD 40 acceptance workflows. Source provenance: actual native Codex imagegen artifacts are already under acceptance-fixtures; body must remain unchanged.

One additional API FAIL: POST /api/projects/:id/variants accepts image_text status=ready with zero covers (PATCH now rejects it). ProjectStudio.handleSaveVariant creates exactly this invalid new-ready version. Validate BOTH creation and update. Use draft/in_progress saves and an explicit completeness-gated Ready action.

Actual frontend observations at 5174 (isolated data), not guesses:
- Today sidebar says 达标 while dashboard says 0/20 and 差20. App reads the wrong KPI shape. Use confirmed publications + per-platform configurable targets.
- ProjectStudio currentVariants.find(platform) makes multiple formats on the SAME platform inaccessible. Add platform AND format/variant selection (X short/quote/repost/thread/article; XHS image_text/video; GZH article/mini-image; Douyin/Channels image-combo/video).
- There is no real file upload interface, no videos in handoff import, no shared video reference, no ordered body/card images or text separated from post copy. Implement upload+integrity validation+serve/download with IDs; import our actual fixture-video.mp4 and native images. Video variants require cover; combo has no separate cover requirement.
- No editable cover profiles for two Channels purposes. Add dimensions/ratio per purpose with preview/crop warnings and separate downloads. Do not claim one platform ratio is mandatory everywhere.
- GZH only has plain copy, no formatted preview and dual MIME HTML+plain clipboard, no ordered image fallback/position mapping or real package export.
- SourceStudio requires manual filling analysis; it inserts fabricated fallback hook/structure/evidence/rhythm/visual/end. Add actual external-task handoff and result import; analysis must quote/point to actual source paragraphs and keep unknown blank. Provide readable URL capture with immutable captured versions or an explicit external capture task; link-only truth must stay intact. convert-to-topic writes estimatedViralScore=92 without evidence and lacks stable source/deconstruction linkage; remove that fake score.
- Account finite-sample deconstruction/time line still needs observed sample range, earliestObserved vs actual start distinction; no invented publication date.
- ReceiptStudio loads receipts only for PENDING packages; after import pending list is empty so all actual history disappears. Add list endpoint for stored receipts/tasks and paused_quota state, never paid fallback. UI must expose actual executor, actual skill, cost path, unknown subscription balance, TikHub separate billing, local layout free.
- Search now saves sources but still hardcodes keyword AI and platforms X/Douyin. Expose keywords/platforms/time/enabled/missed-run policy and keep date/URL/author/request/capture metadata, partial-source errors and once/day dedupe. Real TikHub acceptance is pending credentials; use fake local provider for structural tests only.
- Scheduling needs due/overdue/unscheduled/doing/ready states and linked topic done-vs-published distinction. Current production has 0 projects although 22 legacy Markdown posts exist. Preserve and expose all original drafts read-only or migrate idempotently with provenance, without confirming any publication.
- Actual Antigravity chat->capture automatic rule requires live test with TWO original inputs and true IDs/receipts. HTTP endpoint alone is NOT case31. Offline capture metadata title/sourceUrl/platform must survive resume exactly once.

Please implement full local PRD V1.2, not just API test matches. No paid APIs, no reverse proxy, no remote publication/draft writes, no real Vault writes, no Amazon/紫鸟 operations, no unrelated agents. Show external dependencies separately. Do not overwrite independent evidence statuses or mark all 40 pass using weak endpoint checks. Rebuild and typecheck final source, then Codex will independently inspect actual page operations.

## Latest independent offline resume failure (after Round 4 review)

Codex-offline-final-results.json: offlineQueued=true, manifestPreservesFields=true, rawPreserved=true, restartImportsOnce=true BUT titlePreserved=false, sourceUrlPreserved=false, platformPreserved=false. The shell manifest is correct; importPackage() offline creation ignores title/sourceUrl/platform and manufactures defaults. Preserve manifest metadata on both project and topic and captured source record. The human authorized CLI repair of this in an isolated copy; apply only a reviewed diff if supplied. Do NOT mark offline metadata as passed yet.

## Offline metadata resolved by desktop implementation

Codex-offline-final-v2-results.json now has ALL checks true (title/source URL/platform/raw preserved, imports once across restart). Official CLI initial setup was stopped before accepting terms because the desktop implementation resolved this fix; no CLI changes were merged. Continue completing the actual page workflows and verify final source.

## New migration regression - must fix before finalizing

Actual isolated API GET /api/projects after copying all original 22 Markdown files indexes ONLY 1/22. Codex-legacy-index-results.json preserves proof. syncLegacyPosts() uses Buffer.from(relPath).toString('hex').slice(0,10): every path begins with posts, so ALL IDs collide. Use a stable hash of the ENTIRE relative path (and keep sourceFile as the idempotent identity), preserve any already-indexed item, and independently assert exactly 22 unique sourceFile/IDs and exact original bodies across repeated reads/restarts. This is not file loss, but 21 drafts are invisible.

Also current incoming video importer only validates exists/nonempty. Make real decode required for a video success and reject nonempty text disguised as MP4. Model quotaStatus should be unknown unless observed; incoming quota-limited tasks need paused state, retained handoff, and no paid fallback. Do not claim a stored generic source handoff as completed evidence-based analysis.

## Actual media regression after new upload endpoint

Codex-media-final-results.json: uploaded invalid MP4 is rejected; POST ready image_text without assets is now correctly rejected; 3 video variants share a real video and retain independent copy. HOWEVER real native-cover.png (SHA256 d73521f6..., 2612640 bytes, 1086x1448) and real fixture-video.mp4 (98597 bytes, decodes successfully) are BOTH rejected by /api/media/upload as corrupt. Inspect decoder timeout/error handling; fixed 5-second full-decode limit may reject valid files under load. Do not label timeout as corrupt. Incoming nonempty text disguised as MP4 is wrongly imported with status imported and assetsAdded=1; apply real video integrity validation to BOTH upload and incoming paths. Use execFile/execFileSync argument arrays, not a shell command containing user-controlled filenames. Please run real upload via UI and prove correct uploaded byte hash, preview metadata, and real download.

Actual independent direct Node execFileSync decoding succeeded for the SAME image and video (2661ms and 2209ms respectively). No artifact corruption. Upload limits and full-decode timeout/catch paths need retesting via actual UI under load; do not mislabel a timeout as damaged file.
