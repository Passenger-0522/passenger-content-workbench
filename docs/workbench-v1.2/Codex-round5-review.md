# Codex Round 5: actual remaining acceptance gaps

The legacy full-path hash fix independently PASSed all 22 source files, exact bodies, unique IDs and repeated read. Native media fixes are being retested against latest backend. Do not overwrite independent evidence or call 34 API assertions the PRD 40 scenarios.

Implement the remaining actual UI paths before declaring completion:

1. ProjectStudio Channels covers are still hardcoded `9:16`/`16:9`, exact string matching while uploads report e.g.1086:1448. PRD case11 requires two named purposes with EDITABLE width/height/ratio profiles, role assignment, actual-dimension warnings, separate previews/downloads. A cover must not appear missing solely because equivalent ratio strings differ. Defaults are editable recommendations, not verified platform requirements.
2. PRD cases7,12,13: per-page card text separate from publication body; reorder actual images, export ordered image list/package and invoke actual local compose runner to download playable silent MP4 when no music supplied. Need visible usable controls, not only an API endpoint. Preserve user-copy and make missing dependencies explicit.
3. PRD8,9: gzh clipboard should include escaped article-only HTML plus plain text, real body images (data URI recommended), not just first cover. HTML generation must escape `<>&` and unsafe links. Ordered image downloads need correspondence to actual paragraph/marker positions; generic list of covers alone is not a body-position mapping. Cover is separate from body image usage. Actual WeChat editor paste remains user confirmation; do not open platform accounts.
4. PRD40: Markdown export currently lacks project.sources URLs and may select revisions[0] rather than current rev; preserve current approved body, source URLs/sourceIds/projectId/variantId, one-way export and publication state unchanged. Gzh export also needs IDs/provenance.
5. Change manual publication CTA label from "确认公开发布" to "记录已发布"/"确认已发布" to reflect manual recording, never remote publishing.

Also complete one real native Antigravity chat capture test, not merely API fixtures: read docs/workbench-v1.2/两段真实想法.md. Treat exactly the TWO numbered entries as the user's content ideas (not this development request). Through local capture workflow retain each raw original input, create two to-do topics/projects, return real IDs and receipts. These real ideas may enter the production local website, with all versions draft/unpublished. Gemini native subscription: write one X short original BODY only (no public title, no cover headline), using idea1 without invented claims; save it to the associated project variant via supported local handoff. Keep body intact for subsequent Codex cover generation. No paid API/proxy/subagents/remote publishing/Vault writes.

Provide exact IDs and files of native-Gemini authored body and capture receipts. Build/typecheck after changes. Preserve original baseline data and all existing assets.

## Additional actual account UI gap (verified source, not hypothetical)

BenchmarkStudio.handleAddSubmit STILL substitutes omitted fans with `10万粉` and omitted medianEngagement with2000. This fabricates real account data. Remove these defaults; unknown counts null/unknown, no fabricated trends/works. Provide visible profile URL/account identity input and follower snapshot controls with source, date, exact/approximate/unknown/error; two snapshots show bounded change and failed collection preserves previous values. API assertions alone do not satisfy user-facing cases35/36.

Case39 also requires an actual accessible account timeline/sample report with source links, sample count and observed date range; earliest sampled post must be labelled earliest observed sample, never account start. No page/report UI for this was found in BenchmarkStudio. Allow external Gemini subscription report import/handoff rather than paid API. Separate facts from inference and keep source evidence links/paragraphs.

SourceStudio manual report entry is useful but case38 needs one REAL native-Gemini evidence-based report from supplied/captured full text, linked to source then NEW to-do topic. Record raw paragraph evidence and actionable points; no invented performance score. Do not count a manually typed fixture as auto-generated native report.

## Final verified user-facing integration gaps

- TopicRadar still only understands pending/accepted/outline_ready/generated, while new captures use to_do/in_progress/done/deferred/abandoned. Provide these real statuses and project links in list/filter/edit controls. The user's essential "哪些做了/未做" must work visibly; done never counts publication.
- Today dashboard only counts all ready; no today-due/overdue/unscheduled lists or pending topics. Add a planned date to variants and visible scheduling control, show these categories plus in-progress and done-but-unpublished; don't hide other versions when one platform is published. Include each X type breakdown, thread1unit/Nposts. Use configured Asia/Shanghai day in today export too.
- SettingsModal has no scheduler config controls despite backend config endpoint. Expose enabled/time/keywords/platforms/missed-run policy/maximum requests and last run traces with error coverage; per-platform daily target controls (X10–15, others1–2 configurable). New database fields alone do not make these settings usable.
- ReceiptStudio quotaStatus displays hardcoded "paused_quota严格受控" for EVERY receipt. Render selectedReceipt.quotaStatus actual unknown/active/paused, do not invent balances or label skipped/failed as imported success. Show skill registry paths/executor/cost restrictions and task handoff directory/file/continuation instruction so user can actually continue from tool chat.
- Keep all existing seed benchmark accounts/works intact but label isLegacyUnverified as unverified historical data and do not present "1hour ago synced" as current verified collection.

These are all P0 behavior already in the supplied PRD/user request, not new scope. Report external TikHub live test as pending key and real WeChat paste as pending user confirmation. Do not call UI skeleton or endpoint existence an end-to-end PASS.

## Native self-test cleanup (production readback)

Your self-tests wrote test fixtures to production despite isolated-test scope. Readback: proj_5lvc57ss/title聊天捕获测试文章; first legacy project proj_legacy_cf43c473e951 now has9 test variants (content6/9/10characters, xiaohongshu and invalid twitter platform), and added test topics/analysis/incoming/receipts. No publish records currently. Do not leave these mixed with real user ideas.

Codex preserved data/projects.json/topics.json/sources.json/publish_records.json under independent evidence native-test-data-before-cleanup. Archive ONLY identifiable self-test objects/variants to reversible backup and remove from live lists, preserving all22 legacy drafts and original4 topics/11 benchmark accounts, all raw MD and valid real new ideas. Keep genuine two-idea capture and new Gemini body. Future native tests must use WORKBENCH_DATA_DIR and isolated ports, NEVER production fixtures. Supply cleanup manifest of exact IDs; never delete original user objects.

Native article-report test input: use the existing untouched user file `posts/2026-10-08/白板讲解视频_小红书_视频号_抖音文案包.md` as supplied full text, source local file path and provenance=user_supplied (claims not externally verified). Gemini may analyze its actual wording and paragraph evidence, not pretend it is a new external verified competitor article. Save source+one evidence-based report+one NEW to_do topic, preserve original file. For account timeline do not manufacture sample posts: use actual stored samples marked legacy_unverified and label limited/unverified, or report insufficient verified samples.

## Automatic capture rule regression (official docs verified live)

`.agents/rules/workbench-capture.md` currently has NO YAML frontmatter; Antigravity's official current rules documentation says missing trigger frontmatter silently discards a rules/*.md file. https://www.antigravity.google/docs/rules/

Restore `---\ntrigger: always_on\ndescription: Capture only user content ideas into this local workbench; preserve raw input and receipts.\n---` at the beginning. Explicitly exclude coding/build/review/test instructions from content capture. Keep content idea rules in this workspace only. Do NOT adjust global permissions, accept CLI terms, or use proxies. Repeat native chat capture after rule is active; a script call explicitly requested by tests does not alone prove automatic discovery. The end-user routine is sending ideas in the existing Antigravity project chat.

Scheduler functional note: checkSchedulerTick currently always catches up due-or-past and never consults missedRunPolicy. Wire skip versus bounded catch-up and cap configured daily provider requests (including failed requests), save/validate limits, record partial coverage when exhausted. Verify with localhost fake provider only; real TikHub remains unconfigured/pending credential. Default model API remains disabled even if key input exists.

Card text and reorder must persist per variant after Save/refresh, not React-only cardTexts state or unsaved covers. Shared video URL after video upload should be reusable through a visible project control across three variants; never share their text/covers implicitly.

Case37 independent new local test FAILED immutable source versions: POST same URL with Original supplied source paragraph., then Updated supplied source paragraph. keeps same sourceId but overwrites original with NO captures/versions history or updated capture date. Add immutable capture versions (raw text/hash/date/method/readability/source) and show versions; only latest view mutable. Reports must retain source capture version ID/hash. db.addSource must not deduplicate unrelated URL-less items via undefined===undefined; require non-empty canonical identity or content hash.
Independent evidence: 验收证据/round5-source-version-results.json (sourceId src_x0k8glbc, isolated3022). Do not claim old URL-upgrade assertion tested immutable versions.

Cleanup identity guard: original topic IDs MUST remain: top_ai_solo, top_sop_20, top_money_mistake, top_minimal_workflow (independent readback confirms all original fields currently unchanged). Original benchmarks bm-1 through bm-11 and old post post_ai_solo_1 must remain. Baseline backups/2026-10-10_pre_v1.2/data/*.json is available for comparison. All22 posts/ MD files' original bytes remain protected. Archive9 known test variants on proj_legacy_cf43c473e951 and known synthetic captures only; do not confuse real captured user ideas with tests.

## Actual browser acceptance of new card/profile controls (latest ProjectStudio)

Two real native images uploaded to isolated project proj_1m8ojjlt/channels variant var_jya8eagl. Custom profiles1086x1448 and1672x941, distinct previews/downloads, separate card texts and reorder export work during the session. Actual Save Draft then API readback FAILS persistence:
- exported deck reordered landscape then vertical (PASS), both independent card texts in deck (PASS), publication body unchanged (PASS)
- saved covers order still vertical then landscape (FAIL)
- saved card text absent (FAIL); saved channelsProfiles/coverProfiles absent (FAIL).

handleSaveVariantDraft only saves title/content/status; handleReorderCover and cardTexts/channelsProfiles are React state only. Persist per-variant covers order + card text + profiles (targetWidth/Height, ratio display, assignedCoverId) in the existing Save operation and reload per selectedVariant. Show a saved acknowledgement only after full save. Changing one variant must not leak profile/card text to another. Add a body/cover usage selector so gzh body images can be configured from actual uploaded assets. Native sample prompt is NOT card display text; do not auto-use "用户本地上传真实素材" as a card's content. Evidence saved outside production as round5-card-persistence-results.json and round5-exported-deck.md.
