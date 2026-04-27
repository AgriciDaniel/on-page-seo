import { v4 as uuidv4 } from 'uuid';
import { getSetting } from '../db/database.js';
import { rankedKeywordQueries, db } from '../db/database.js';
import type {
  RankedKeyword,
  RankedKeywordsSummary,
  PositionTrend,
  SearchIntent,
  DataForSEOLabsRankedKeywordItem,
  DataForSEOLabsRankedKeywordsResponse,
} from '../types/index.js';

const DATAFORSEO_LABS_URL = 'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live';

// Default settings
const DEFAULT_LOCATION_CODE = 2076; // Brazil
const DEFAULT_LANGUAGE_CODE = 'pt';
const DEFAULT_KEYWORD_LIMIT = 1000;

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function getAuth(): string {
  const username = getSetting('dataforseo_username') || process.env.DATAFORSEO_USERNAME;
  const password = getSetting('dataforseo_password') || process.env.DATAFORSEO_PASSWORD;

  if (!username || !password) {
    throw new Error('DataForSEO credentials are not configured.');
  }

  return Buffer.from(`${username}:${password}`).toString('base64');
}

function determineTrend(item: DataForSEOLabsRankedKeywordItem): PositionTrend {
  const serpItem = item.ranked_serp_element.serp_item;
  if (serpItem.is_new) return 'new';
  if (serpItem.is_lost) return 'lost';
  // DataForSEO doesn't provide previous rank directly in ranked_keywords endpoint
  // We use is_new/is_lost flags, otherwise stable
  return 'stable';
}

function transformKeywordItem(
  auditId: string,
  item: DataForSEOLabsRankedKeywordItem
): RankedKeyword {
  const keywordInfo = item.keyword_data.keyword_info;
  const serpItem = item.ranked_serp_element.serp_item;
  const intentInfo = item.keyword_data.search_intent_info;

  return {
    id: uuidv4(),
    audit_id: auditId,
    keyword: item.keyword_data.keyword,
    position: serpItem.rank_group,
    position_absolute: serpItem.rank_absolute,
    previous_position: null,
    search_volume: keywordInfo.search_volume || 0,
    cpc: keywordInfo.cpc || 0,
    competition: keywordInfo.competition || 0,
    competition_level: keywordInfo.competition_level || 'LOW',
    url: serpItem.url || '',
    etv: serpItem.etv || 0,
    estimated_paid_traffic_cost: serpItem.estimated_paid_traffic_cost || 0,
    search_intent: (intentInfo?.main_intent as SearchIntent) || null,
    trend: determineTrend(item),
    created_at: new Date().toISOString(),
  };
}

function computeSummary(
  keywords: RankedKeyword[],
  apiCost: number,
  locationCode: number,
  languageCode: string,
  metrics?: DataForSEOLabsRankedKeywordsResponse['tasks'][0]['result'][0]['metrics']
): RankedKeywordsSummary {
  const organic = metrics?.organic;

  return {
    total_keywords: keywords.length,
    estimated_traffic: keywords.reduce((sum, k) => sum + k.etv, 0),
    traffic_value: keywords.reduce((sum, k) => sum + k.estimated_paid_traffic_cost, 0),
    pos_1_3: organic
      ? organic.pos_1 + organic.pos_2_3
      : keywords.filter((k) => k.position <= 3).length,
    pos_4_10: organic
      ? organic.pos_4_10
      : keywords.filter((k) => k.position >= 4 && k.position <= 10).length,
    pos_11_20: organic
      ? organic.pos_11_20
      : keywords.filter((k) => k.position >= 11 && k.position <= 20).length,
    pos_21_50: organic
      ? organic.pos_21_30 + organic.pos_31_40 + organic.pos_41_50
      : keywords.filter((k) => k.position >= 21 && k.position <= 50).length,
    pos_51_100: organic
      ? organic.pos_51_60 + organic.pos_61_70 + organic.pos_71_80 + organic.pos_81_90 + organic.pos_91_100
      : keywords.filter((k) => k.position >= 51 && k.position <= 100).length,
    new_keywords: organic
      ? organic.is_new
      : keywords.filter((k) => k.trend === 'new').length,
    improved: organic ? organic.is_up : 0,
    declined: organic ? organic.is_down : 0,
    lost: organic
      ? organic.is_lost
      : keywords.filter((k) => k.trend === 'lost').length,
    api_cost: apiCost,
    location_code: locationCode,
    language_code: languageCode,
  };
}

export interface KeywordProgressCallback {
  (status: 'fetching' | 'completed' | 'failed', message: string): void;
}

async function fetchRankedKeywords(
  domain: string,
  locationCode: number,
  languageCode: string,
  limit: number,
  onProgress?: KeywordProgressCallback
): Promise<{
  items: DataForSEOLabsRankedKeywordItem[];
  metrics: DataForSEOLabsRankedKeywordsResponse['tasks'][0]['result'][0]['metrics'] | undefined;
  totalCost: number;
}> {
  const auth = getAuth();
  const allItems: DataForSEOLabsRankedKeywordItem[] = [];
  let totalCost = 0;
  let metrics: DataForSEOLabsRankedKeywordsResponse['tasks'][0]['result'][0]['metrics'] | undefined;
  let offset = 0;
  const pageSize = Math.min(limit, 1000); // API max per request is 1000

  while (allItems.length < limit) {
    const currentLimit = Math.min(pageSize, limit - allItems.length);

    onProgress?.('fetching', `Fetching keywords ${offset + 1}-${offset + currentLimit}...`);

    const response = await fetch(DATAFORSEO_LABS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify([
        {
          target: domain,
          location_code: locationCode,
          language_code: languageCode,
          limit: currentLimit,
          offset,
          order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
        },
      ]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DataForSEO Labs API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as DataForSEOLabsRankedKeywordsResponse;

    if (!data.tasks || data.tasks.length === 0) {
      throw new Error('DataForSEO Labs returned no tasks');
    }

    const task = data.tasks[0];
    totalCost += task.cost;

    if (task.status_code !== 20000) {
      throw new Error(`DataForSEO Labs task error: ${task.status_message}`);
    }

    if (!task.result || task.result.length === 0) {
      break;
    }

    const result = task.result[0];
    if (!metrics) {
      metrics = result.metrics;
    }

    if (!result.items || result.items.length === 0) {
      break;
    }

    allItems.push(...result.items);
    offset += result.items.length;

    // If we got fewer items than requested, we've exhausted the results
    if (result.items.length < currentLimit) {
      break;
    }
  }

  return { items: allItems, metrics, totalCost };
}

export async function analyzeRankedKeywords(
  auditId: string,
  url: string,
  locationCode: number = DEFAULT_LOCATION_CODE,
  languageCode: string = DEFAULT_LANGUAGE_CODE,
  limit: number = DEFAULT_KEYWORD_LIMIT,
  onProgress?: KeywordProgressCallback
): Promise<{ keywords: RankedKeyword[]; summary: RankedKeywordsSummary }> {
  const domain = extractDomain(url);

  onProgress?.('fetching', `Analyzing ranked keywords for ${domain}...`);

  const { items, metrics, totalCost } = await fetchRankedKeywords(
    domain,
    locationCode,
    languageCode,
    limit,
    onProgress
  );

  onProgress?.('fetching', `Processing ${items.length} keywords...`);

  const keywords = items.map((item) => transformKeywordItem(auditId, item));
  const summary = computeSummary(keywords, totalCost, locationCode, languageCode, metrics);

  // Store in database using a transaction
  const insertAll = db.transaction(() => {
    for (const kw of keywords) {
      rankedKeywordQueries.insert.run(
        kw.id,
        kw.audit_id,
        kw.keyword,
        kw.position,
        kw.position_absolute,
        kw.previous_position,
        kw.search_volume,
        kw.cpc,
        kw.competition,
        kw.competition_level,
        kw.url,
        kw.etv,
        kw.estimated_paid_traffic_cost,
        kw.search_intent,
        kw.trend
      );
    }

    rankedKeywordQueries.insertSummary.run(
      auditId,
      summary.total_keywords,
      summary.estimated_traffic,
      summary.traffic_value,
      summary.pos_1_3,
      summary.pos_4_10,
      summary.pos_11_20,
      summary.pos_21_50,
      summary.pos_51_100,
      summary.new_keywords,
      summary.improved,
      summary.declined,
      summary.lost,
      summary.api_cost,
      summary.location_code,
      summary.language_code
    );
  });

  insertAll();

  onProgress?.('completed', `Found ${keywords.length} ranked keywords`);

  return { keywords, summary };
}

export { extractDomain, DEFAULT_LOCATION_CODE, DEFAULT_LANGUAGE_CODE, DEFAULT_KEYWORD_LIMIT };
