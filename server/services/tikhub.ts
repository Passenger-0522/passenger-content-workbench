import { db, getShanghaiDateKey } from '../db.js';
import fs from 'fs';
import path from 'path';

export interface TrendingItem {
  id: string;
  keyword: string;
  hotScore: number | string;
  platform: 'douyin' | 'xiaohongshu' | 'weibo' | 'tiktok' | 'x';
  category: string;
  url?: string;
  author?: string;
  contentTime?: string;
  capturedAt?: string;
  desc?: string;
}

export interface SearchTrace {
  query?: string;
  platform: string;
  requestedAt: string;
  statusCode: number;
  coverage: string;
  error?: string;
  endpoint?: string;
}

export interface SchedulerState {
  enabled: boolean;
  scheduledHour: number;
  scheduledMinute: number;
  keywords?: string[];
  platforms?: Array<'x' | 'douyin' | 'xiaohongshu'>;
  missedRunPolicy?: 'catch_up' | 'skip';
  maxDailyRequests?: number;
  lastRunDate?: string;
  lastRunAt?: string;
  lastStatus: 'success' | 'partial' | 'error' | 'unconfigured' | 'idle' | 'skipped' | 'exhausted';
  history: Array<{
    dateKey: string;
    executedAt: string;
    status: string;
    itemsCount: number;
    error?: string;
  }>;
}

function getSearchHistoryFile(): string {
  return path.join(db.getDataDir(), 'search_history.json');
}

function getSchedulerStateFile(): string {
  return path.join(db.getDataDir(), 'scheduler_state.json');
}

export function saveSearchTrace(trace: SearchTrace) {
  try {
    const file = getSearchHistoryFile();
    let history: SearchTrace[] = [];
    if (fs.existsSync(file)) {
      history = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
    history.unshift(trace);
    if (history.length > 50) history = history.slice(0, 50);
    fs.writeFileSync(file, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save search trace:', e);
  }
}

export function getSearchTraces(): SearchTrace[] {
  try {
    const file = getSearchHistoryFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

export function getSchedulerState(): SchedulerState {
  try {
    const file = getSchedulerStateFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (_) {}
  return {
    enabled: true,
    scheduledHour: 9,
    scheduledMinute: 30,
    keywords: ['AI', '效率工具', '个人IP'],
    platforms: ['x', 'douyin'],
    missedRunPolicy: 'catch_up',
    lastStatus: 'idle',
    history: []
  };
}

export function saveSchedulerState(state: SchedulerState): void {
  try {
    const file = getSchedulerStateFile();
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save scheduler state:', e);
  }
}

/**
 * Fetch search results / trends via TikHub API (PRD 7.3 & UC-18/19/20)
 * Uses verified routes:
 * X: GET /api/v1/twitter/web/fetch_search_timeline
 * Douyin: POST /api/v1/douyin/search/fetch_general_search_v1
 * Xiaohongshu: GET /api/v1/xiaohongshu/app_v2/search_notes
 * TikTok: GET /api/v1/tiktok/app/v3/fetch_general_search_result
 */
export async function fetchTikHubTrends(
  platform: 'douyin' | 'xiaohongshu' | 'weibo' | 'tiktok' | 'x' = 'douyin',
  query?: string
): Promise<{
  configured: boolean;
  status: 'unconfigured' | 'live_tikhub' | 'error';
  message?: string;
  data: TrendingItem[];
  trace?: SearchTrace;
}> {
  const settings = db.getSettings();
  const apiKey = settings.tikhubApiKey;
  const baseUrl = (settings.tikhubBaseUrl || 'https://api.tikhub.io').replace(/\/+$/, '');
  const now = new Date().toISOString();

  // PRD 7.3 & UC-18: When unconfigured, accurately report unconfigured, NEVER fake mock data
  if (!apiKey || !apiKey.trim()) {
    const trace: SearchTrace = {
      query,
      platform,
      requestedAt: now,
      statusCode: 0,
      coverage: '未配置凭据',
      error: 'TikHub API Key 待配置'
    };
    saveSearchTrace(trace);
    return {
      configured: false,
      status: 'unconfigured',
      message: 'TikHub API Key 待配置。请在系统设置中填入有效凭据，或使用手动链接/文件导入。',
      data: [],
      trace
    };
  }

  try {
    let endpoint = '';
    let method = 'GET';
    let bodyPayload: any = undefined;

    const searchTerm = query && query.trim() ? query.trim() : 'AI';

    if (platform === 'douyin') {
      endpoint = `${baseUrl}/api/v1/douyin/search/fetch_general_search_v1`;
      method = 'POST';
      bodyPayload = JSON.stringify({
        keyword: searchTerm,
        cursor: 0,
        count: 10
      });
    } else if (platform === 'x') {
      endpoint = `${baseUrl}/api/v1/twitter/web/fetch_search_timeline?keyword=${encodeURIComponent(searchTerm)}`;
      method = 'GET';
    } else if (platform === 'xiaohongshu') {
      endpoint = `${baseUrl}/api/v1/xiaohongshu/app_v2/search_notes?keyword=${encodeURIComponent(searchTerm)}`;
      method = 'GET';
    } else if (platform === 'tiktok') {
      endpoint = `${baseUrl}/api/v1/tiktok/app/v3/fetch_general_search_result?keyword=${encodeURIComponent(searchTerm)}`;
      method = 'GET';
    } else {
      endpoint = `${baseUrl}/api/v1/douyin/search/fetch_general_search_v1`;
      method = 'POST';
      bodyPayload = JSON.stringify({ keyword: searchTerm, cursor: 0, count: 10 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };
    if (bodyPayload) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
      method,
      headers,
      body: bodyPayload,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const trace: SearchTrace = {
      query: searchTerm,
      platform,
      endpoint,
      requestedAt: now,
      statusCode: response.status,
      coverage: response.ok ? '全量返回' : `HTTP ${response.status}`
    };

    if (!response.ok) {
      trace.error = `TikHub 返回 HTTP ${response.status}: ${response.statusText}`;
      saveSearchTrace(trace);
      return {
        configured: true,
        status: 'error',
        message: trace.error,
        data: [],
        trace
      };
    }

    const json = (await response.json()) as any;
    const items: TrendingItem[] = [];

    // Parse verified responses platform-specifically:
    if (platform === 'x') {
      const xList = json?.data?.timeline || json?.data?.tweets || json?.data?.data || [];
      if (Array.isArray(xList)) {
        xList.forEach((tweet: any, idx: number) => {
          const text = tweet.full_text || tweet.text || tweet.legacy?.full_text || `推文 ${idx + 1}`;
          const author = tweet.user?.name || tweet.legacy?.user?.name || 'X 用户';
          const tweetId = tweet.id_str || tweet.id;
          const url = tweetId ? `https://x.com/i/status/${tweetId}` : undefined;
          const contentTime = tweet.created_at || tweet.legacy?.created_at || undefined;
          items.push({
            id: `tikhub-x-${idx}-${Date.now()}`,
            keyword: text.slice(0, 30),
            desc: text,
            hotScore: tweet.favorite_count || tweet.legacy?.favorite_count || '精选',
            platform: 'x',
            category: 'X 动态',
            url,
            author,
            contentTime,
            capturedAt: now
          });
        });
      }
    } else if (platform === 'douyin') {
      const douyinList = json?.data?.aweme_list || json?.data?.data || json?.data?.word_list || [];
      if (Array.isArray(douyinList)) {
        douyinList.forEach((item: any, idx: number) => {
          const aweme = item.aweme_info || item;
          const text = aweme.desc || aweme.word || item.title || `抖音搜索结果 ${idx + 1}`;
          const author = aweme.author?.nickname || aweme.author_user_id || '抖音创作者';
          const url = aweme.share_url || (aweme.aweme_id ? `https://www.douyin.com/video/${aweme.aweme_id}` : undefined);
          const contentTime = aweme.create_time ? new Date(aweme.create_time * 1000).toISOString() : undefined;
          items.push({
            id: `tikhub-dy-${idx}-${Date.now()}`,
            keyword: text.slice(0, 30),
            desc: text,
            hotScore: aweme.statistics?.digg_count || aweme.hot_value || '热门',
            platform: 'douyin',
            category: '综合热搜',
            url,
            author,
            contentTime,
            capturedAt: now
          });
        });
      }
    }

    saveSearchTrace(trace);
    return {
      configured: true,
      status: 'live_tikhub',
      data: items,
      trace
    };
  } catch (err: any) {
    const trace: SearchTrace = {
      query,
      platform,
      requestedAt: now,
      statusCode: 500,
      coverage: '网络连接超时或错误',
      error: err.message || '网络错误'
    };
    saveSearchTrace(trace);
    return {
      configured: true,
      status: 'error',
      message: `TikHub 搜索失败: ${err.message}`,
      data: [],
      trace
    };
  }
}

/**
 * Daily Background Scheduler & Missed Catch-up (PRD 7.4 & UC-21)
 * Runs once per day at configured time; catches up missed execution if server was offline/sleeping
 */
export async function runDailyScheduledSearch(force = false): Promise<{
  executed: boolean;
  status: string;
  itemsCount: number;
  message?: string;
}> {
  const state = getSchedulerState();
  const todayKey = getShanghaiDateKey();

  if (!force && state.lastRunDate === todayKey) {
    return {
      executed: false,
      status: 'already_run_today',
      itemsCount: 0,
      message: `今日 (${todayKey}) 检索已于 ${state.lastRunAt} 完成，避免重复消耗配额`
    };
  }

  const settings = db.getSettings();
  if (!settings.tikhubApiKey) {
    state.lastStatus = 'unconfigured';
    state.lastRunDate = todayKey;
    state.lastRunAt = new Date().toISOString();
    saveSchedulerState(state);
    return {
      executed: false,
      status: 'unconfigured',
      itemsCount: 0,
      message: 'TikHub API Key 待配置，跳过调度执行'
    };
  }

  // Execute search for configured platforms and keywords
  let totalItems = 0;
  let hasError = false;
  let lastErr = '';
  const maxRequests = state.maxDailyRequests && state.maxDailyRequests > 0 ? state.maxDailyRequests : 10;
  let requestsCount = 0;
  let quotaExhausted = false;

  const searchPlatforms = state.platforms && state.platforms.length > 0 ? state.platforms : ['x', 'douyin'];
  const searchKeywords = state.keywords && state.keywords.length > 0 ? state.keywords : ['AI'];

  for (const plat of searchPlatforms) {
    if (quotaExhausted) break;
    for (const kw of searchKeywords) {
      if (requestsCount >= maxRequests) {
        quotaExhausted = true;
        console.warn(`[Scheduler] Daily provider request limit (${maxRequests}) reached. Halting further queries.`);
        break;
      }
      requestsCount++;
      try {
        const res = await fetchTikHubTrends(plat as any, kw);
        if (res.status === 'live_tikhub') {
          totalItems += res.data.length;
          res.data.forEach(item => {
            if (item.url) {
              db.addSource({
                url: item.url,
                canonicalId: item.url,
                title: item.keyword || item.desc,
                author: item.author || '未知作者',
                publishTime: item.contentTime,
                rawMarkdown: item.desc || '',
                readabilityStatus: item.desc ? 'partial' : 'link_only',
                bookmarkReason: `TikHub 每日检索自动收录 (${plat} - ${kw})`,
                isBenchmarkArticle: false
              });
            }
          });
        } else if (res.status === 'error') {
          hasError = true;
          lastErr = res.message || '请求失败';
        }
      } catch (e: any) {
        hasError = true;
        lastErr = e.message;
      }
    }
  }

  const finalStatus = quotaExhausted ? 'partial' : (hasError ? (totalItems > 0 ? 'partial' : 'error') : 'success');
  state.lastRunDate = todayKey;
  state.lastRunAt = new Date().toISOString();
  state.lastStatus = finalStatus;
  state.history.unshift({
    dateKey: todayKey,
    executedAt: state.lastRunAt,
    status: finalStatus,
    itemsCount: totalItems,
    error: quotaExhausted ? `达到每日最大请求限额 (${maxRequests}次)，停止后续请求` : (lastErr || undefined)
  });
  if (state.history.length > 30) state.history = state.history.slice(0, 30);
  saveSchedulerState(state);

  return {
    executed: true,
    status: finalStatus,
    itemsCount: totalItems,
    message: quotaExhausted
      ? `每日检索执行完毕 (已达到每日上限 ${maxRequests} 次，收集素材: ${totalItems}条)`
      : `每日检索执行完毕 (状态: ${finalStatus}, 收集素材: ${totalItems}条)`
  };
}

/**
 * Check and trigger catch-up or scheduled search
 */
export function checkSchedulerTick(): void {
  const state = getSchedulerState();
  if (!state.enabled) return;

  const now = new Date();
  const shanghaiHourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hour12: false
  }).format(now);
  const shanghaiMinuteStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    minute: '2-digit',
    hour12: false
  }).format(now);

  const currentHour = parseInt(shanghaiHourStr, 10);
  const currentMinute = parseInt(shanghaiMinuteStr, 10);
  const todayKey = getShanghaiDateKey(now);

  const isDueOrPast =
    currentHour > state.scheduledHour ||
    (currentHour === state.scheduledHour && currentMinute >= state.scheduledMinute);

  const isExactScheduledWindow =
    currentHour === state.scheduledHour && Math.abs(currentMinute - state.scheduledMinute) <= 2;

  if (isDueOrPast && state.lastRunDate !== todayKey) {
    if (state.missedRunPolicy === 'skip' && !isExactScheduledWindow) {
      console.log(`[Scheduler] Missed scheduled window for ${todayKey} and missedRunPolicy='skip'. Skipping.`);
      state.lastRunDate = todayKey;
      state.lastRunAt = now.toISOString();
      state.lastStatus = 'skipped';
      state.history.unshift({
        dateKey: todayKey,
        executedAt: state.lastRunAt,
        status: 'skipped',
        itemsCount: 0,
        error: '错峰漏跑策略设置为跳过 (skip)，已放弃补跑'
      });
      if (state.history.length > 30) state.history = state.history.slice(0, 30);
      saveSchedulerState(state);
      return;
    }

    console.log(`[Scheduler] Triggering scheduled / catch-up daily search for ${todayKey}...`);
    runDailyScheduledSearch(false).catch(err => {
      console.error('[Scheduler] Scheduled execution error:', err);
    });
  }
}
