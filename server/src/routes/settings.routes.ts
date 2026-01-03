import { Router, Request, Response } from 'express';
import { getSetting, setSetting, getAllSettings } from '../db/database.js';

const router = Router();

// Setting keys for API configuration
const API_SETTINGS_KEYS = [
  'firecrawl_api_key',
  'dataforseo_username',
  'dataforseo_password',
] as const;

type ApiSettingsKey = typeof API_SETTINGS_KEYS[number];

interface ApiSettings {
  firecrawl_api_key: string;
  dataforseo_username: string;
  dataforseo_password: string;
}

// GET /api/settings - Get all API settings
router.get('/', (_req: Request, res: Response) => {
  try {
    const allSettings = getAllSettings();

    // Only return API-related settings, mask sensitive values
    const apiSettings: Record<string, string> = {};
    for (const key of API_SETTINGS_KEYS) {
      const value = allSettings[key] || '';
      // Mask the value for display (show last 4 chars only)
      if (value && value.length > 4) {
        apiSettings[key] = '•'.repeat(value.length - 4) + value.slice(-4);
      } else {
        apiSettings[key] = value ? '••••' : '';
      }
      // Also include a flag indicating if the setting is configured
      apiSettings[`${key}_configured`] = value ? 'true' : 'false';
    }

    res.json(apiSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/status - Check if all required settings are configured
router.get('/status', (_req: Request, res: Response) => {
  try {
    const allSettings = getAllSettings();

    const status = {
      firecrawl_configured: !!allSettings['firecrawl_api_key'],
      dataforseo_configured: !!(allSettings['dataforseo_username'] && allSettings['dataforseo_password']),
      all_configured: false,
    };

    status.all_configured = status.firecrawl_configured && status.dataforseo_configured;

    res.json(status);
  } catch (error) {
    console.error('Error checking settings status:', error);
    res.status(500).json({ error: 'Failed to check settings status' });
  }
});

// PUT /api/settings - Update API settings
router.put('/', (req: Request, res: Response) => {
  try {
    const updates = req.body as Partial<ApiSettings>;

    // Validate and save each setting
    for (const key of API_SETTINGS_KEYS) {
      if (key in updates && updates[key] !== undefined) {
        const value = updates[key] as string;
        // Don't update if the value is masked (starts with •)
        if (!value.startsWith('•')) {
          setSetting(key, value);
        }
      }
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// DELETE /api/settings/:key - Clear a specific setting
router.delete('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!API_SETTINGS_KEYS.includes(key as ApiSettingsKey)) {
      res.status(400).json({ error: 'Invalid setting key' });
      return;
    }

    setSetting(key, '');
    res.json({ success: true, message: `Setting ${key} cleared` });
  } catch (error) {
    console.error('Error clearing setting:', error);
    res.status(500).json({ error: 'Failed to clear setting' });
  }
});

// POST /api/settings/test/firecrawl - Test Firecrawl API connection
router.post('/test/firecrawl', async (_req: Request, res: Response) => {
  try {
    const apiKey = getSetting('firecrawl_api_key') || process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      res.status(400).json({ success: false, error: 'Firecrawl API key not configured' });
      return;
    }

    // Test the API with a simple request
    const response = await fetch('https://api.firecrawl.dev/v2/map', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        limit: 1,
      }),
    });

    if (response.ok) {
      res.json({ success: true, message: 'Firecrawl API connection successful' });
    } else {
      const errorText = await response.text();
      res.status(400).json({ success: false, error: `API returned ${response.status}: ${errorText}` });
    }
  } catch (error) {
    console.error('Error testing Firecrawl API:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Connection failed' });
  }
});

// POST /api/settings/test/dataforseo - Test DataForSEO API connection
router.post('/test/dataforseo', async (_req: Request, res: Response) => {
  try {
    const username = getSetting('dataforseo_username') || process.env.DATAFORSEO_USERNAME;
    const password = getSetting('dataforseo_password') || process.env.DATAFORSEO_PASSWORD;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'DataForSEO credentials not configured' });
      return;
    }

    // Test the API with a simple request
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const response = await fetch('https://api.dataforseo.com/v3/on_page/id_list', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      res.json({ success: true, message: 'DataForSEO API connection successful' });
    } else {
      const errorText = await response.text();
      res.status(400).json({ success: false, error: `API returned ${response.status}: ${errorText}` });
    }
  } catch (error) {
    console.error('Error testing DataForSEO API:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Connection failed' });
  }
});

export default router;
