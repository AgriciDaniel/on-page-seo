import type { DataForSEOResponse, DataForSEOPageItem } from '../types/index.js';
import { getSetting } from '../db/database.js';

const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3/on_page/instant_pages';

// Rate limit delay (1 second between requests)
const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

export async function analyzePage(url: string): Promise<{
  data: DataForSEOPageItem;
  cost: number;
  time: string;
}> {
  // First check database, then fall back to environment variables
  const username = getSetting('dataforseo_username') || process.env.DATAFORSEO_USERNAME;
  const password = getSetting('dataforseo_password') || process.env.DATAFORSEO_PASSWORD;

  if (!username || !password) {
    throw new Error('DataForSEO credentials are not configured. Please add them in Settings.');
  }

  // Apply rate limiting
  await rateLimitDelay();

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const response = await fetch(DATAFORSEO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify([
        {
          url,
          load_resources: true,
          enable_javascript: true,
          enable_browser_rendering: true,
          check_spell: true,
          disable_cookie_popup: true,
          return_despite_timeout: true,
          enable_xhr: false,
        },
      ]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DataForSEO API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as DataForSEOResponse;

    if (!data.tasks || data.tasks.length === 0) {
      throw new Error('DataForSEO returned no tasks');
    }

    const task = data.tasks[0];

    if (task.status_code !== 20000) {
      throw new Error(`DataForSEO task error: ${task.status_message}`);
    }

    if (!task.result || task.result.length === 0 || !task.result[0].items || task.result[0].items.length === 0) {
      throw new Error('DataForSEO returned no results');
    }

    return {
      data: task.result[0].items[0],
      cost: task.cost,
      time: task.time,
    };
  } catch (error) {
    console.error(`DataForSEO error for ${url}:`, error);
    throw error;
  }
}

// Retry wrapper with exponential backoff
export async function analyzePageWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<{
  data: DataForSEOPageItem;
  cost: number;
  time: string;
}> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await analyzePage(url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Retry ${attempt + 1}/${maxRetries} for ${url}`);

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError;
}
