import type { FirecrawlMapResponse, FirecrawlLink } from '../types/index.js';
import { getSetting } from '../db/database.js';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/map';

export async function discoverPages(
  url: string,
  limit: number = 100
): Promise<string[]> {
  // First check database, then fall back to environment variable
  const apiKey = getSetting('firecrawl_api_key') || process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('Firecrawl API key is not configured. Please add it in Settings.');
  }

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        limit,
        includeSubdomains: false,
        sitemap: 'include',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as FirecrawlMapResponse;

    // Debug: log the response structure
    console.log('Firecrawl response:', JSON.stringify(data, null, 2).slice(0, 500));

    if (!data.success) {
      throw new Error(`Firecrawl returned error: ${JSON.stringify(data)}`);
    }

    if (!data.links || !Array.isArray(data.links)) {
      throw new Error('Firecrawl returned no links');
    }

    // Extract URLs from links (handles both string and object formats)
    const extractedUrls = data.links.map((link) => {
      if (typeof link === 'string') {
        return link;
      }
      if (link && typeof link === 'object' && 'url' in link) {
        return (link as FirecrawlLink).url;
      }
      return null;
    });

    // Filter and deduplicate links
    const uniqueLinks = [...new Set(extractedUrls)]
      .filter((link): link is string => {
        // Ensure link is a valid string
        if (typeof link !== 'string' || !link) {
          return false;
        }
        // Filter out common non-page URLs
        const lowercaseLink = link.toLowerCase();
        return (
          !lowercaseLink.endsWith('.pdf') &&
          !lowercaseLink.endsWith('.jpg') &&
          !lowercaseLink.endsWith('.jpeg') &&
          !lowercaseLink.endsWith('.png') &&
          !lowercaseLink.endsWith('.gif') &&
          !lowercaseLink.endsWith('.svg') &&
          !lowercaseLink.endsWith('.webp') &&
          !lowercaseLink.endsWith('.css') &&
          !lowercaseLink.endsWith('.js') &&
          !lowercaseLink.endsWith('.xml') &&
          !lowercaseLink.includes('/wp-json/') &&
          !lowercaseLink.includes('/feed/')
        );
      })
      .slice(0, limit);

    console.log(`Discovered ${uniqueLinks.length} pages for ${normalizedUrl}`);
    return uniqueLinks;
  } catch (error) {
    console.error('Firecrawl service error:', error);
    throw error;
  }
}
