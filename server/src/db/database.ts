import Database, { type Statement } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path (in root data folder)
const dataDir = path.join(__dirname, '../../../data');
const dbPath = path.join(dataDir, 'seo-dashboard.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database instance
export const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Prepared statements (initialized after tables are created)
let _auditQueries: {
  create: Statement;
  getById: Statement;
  getAll: Statement;
  updateStatus: Statement;
  updateProgress: Statement;
  updateError: Statement;
  delete: Statement;
};

let _pageQueries: {
  insert: Statement;
  getByAuditId: Statement;
  getById: Statement;
  deleteByAuditId: Statement;
};

let _settingsQueries: {
  get: Statement;
  upsert: Statement;
  getAll: Statement;
};

// Initialize database schema
export function initializeDatabase(): void {
  // Create audits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      total_pages INTEGER DEFAULT 0,
      completed_pages INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  // Create page_results table with all 74 SEO fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_results (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,

      -- Basic Info
      url TEXT NOT NULL,
      status_code INTEGER,
      fetch_time TEXT,
      api_cost REAL,
      api_time TEXT,

      -- Score
      onpage_score REAL,
      overall_status TEXT,

      -- Meta Info
      meta_title TEXT,
      meta_title_length INTEGER,
      meta_description TEXT,
      meta_description_length INTEGER,
      canonical TEXT,

      -- Headings
      h1 TEXT,
      h1_count INTEGER DEFAULT 0,
      h2_count INTEGER DEFAULT 0,
      h3_count INTEGER DEFAULT 0,

      -- Content
      word_count INTEGER DEFAULT 0,
      content_rate REAL,
      readability_score REAL,

      -- Core Web Vitals
      lcp REAL,
      lcp_status TEXT,
      fid REAL,
      fid_status TEXT,
      cls REAL,
      cls_status TEXT,
      passes_core_web_vitals INTEGER DEFAULT 0,

      -- Performance
      time_to_interactive REAL,
      dom_complete REAL,
      page_size INTEGER,
      encoded_size INTEGER,

      -- Resources
      scripts_count INTEGER DEFAULT 0,
      scripts_size INTEGER DEFAULT 0,
      stylesheets_count INTEGER DEFAULT 0,
      stylesheets_size INTEGER DEFAULT 0,
      images_count INTEGER DEFAULT 0,
      images_size INTEGER DEFAULT 0,
      render_blocking_scripts INTEGER DEFAULT 0,
      render_blocking_stylesheets INTEGER DEFAULT 0,

      -- Links
      internal_links INTEGER DEFAULT 0,
      external_links INTEGER DEFAULT 0,
      broken_links INTEGER DEFAULT 0,
      broken_resources INTEGER DEFAULT 0,

      -- SEO Checks (stored as 0/1)
      has_h1 INTEGER DEFAULT 0,
      has_title INTEGER DEFAULT 0,
      has_description INTEGER DEFAULT 0,
      has_canonical INTEGER DEFAULT 0,
      is_https INTEGER DEFAULT 0,
      seo_friendly_url INTEGER DEFAULT 0,
      has_html_doctype INTEGER DEFAULT 0,
      low_content_rate INTEGER DEFAULT 0,
      no_image_alt INTEGER DEFAULT 0,
      no_image_title INTEGER DEFAULT 0,
      has_misspelling INTEGER DEFAULT 0,
      duplicate_title INTEGER DEFAULT 0,
      duplicate_description INTEGER DEFAULT 0,
      duplicate_content INTEGER DEFAULT 0,
      duplicate_meta_tags INTEGER DEFAULT 0,

      -- Spelling & Errors
      misspelled_count INTEGER DEFAULT 0,
      misspelled_words TEXT,
      html_errors_count INTEGER DEFAULT 0,
      html_warnings_count INTEGER DEFAULT 0,
      html_errors TEXT,
      html_warnings TEXT,

      -- Social Media
      og_title TEXT,
      og_description TEXT,
      og_image TEXT,
      og_url TEXT,
      twitter_card TEXT,

      -- Calculated
      issues_count INTEGER DEFAULT 0,
      priority_fix TEXT,

      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create settings table for API keys
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: Add new columns if they don't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(page_results)").all() as { name: string }[];
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('html_errors')) {
      db.exec('ALTER TABLE page_results ADD COLUMN html_errors TEXT');
      console.log('Added html_errors column to page_results table');
    }
    if (!columnNames.includes('html_warnings')) {
      db.exec('ALTER TABLE page_results ADD COLUMN html_warnings TEXT');
      console.log('Added html_warnings column to page_results table');
    }
    if (!columnNames.includes('misspelled_words')) {
      db.exec('ALTER TABLE page_results ADD COLUMN misspelled_words TEXT');
      console.log('Added misspelled_words column to page_results table');
    }
  } catch (e) {
    console.error('Migration error:', e);
  }

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_page_results_audit_id ON page_results(audit_id);
    CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
    CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
  `);

  // Initialize prepared statements after tables exist
  _auditQueries = {
    create: db.prepare(`
      INSERT INTO audits (id, url, status, total_pages, completed_pages)
      VALUES (?, ?, 'pending', 0, 0)
    `),
    getById: db.prepare(`
      SELECT * FROM audits WHERE id = ?
    `),
    getAll: db.prepare(`
      SELECT * FROM audits ORDER BY created_at DESC
    `),
    updateStatus: db.prepare(`
      UPDATE audits SET status = ?, completed_at = CASE WHEN ? IN ('completed', 'failed') THEN datetime('now') ELSE completed_at END
      WHERE id = ?
    `),
    updateProgress: db.prepare(`
      UPDATE audits SET total_pages = ?, completed_pages = ? WHERE id = ?
    `),
    updateError: db.prepare(`
      UPDATE audits SET status = 'failed', error_message = ?, completed_at = datetime('now') WHERE id = ?
    `),
    delete: db.prepare(`
      DELETE FROM audits WHERE id = ?
    `),
  };

  _pageQueries = {
    insert: db.prepare(`
      INSERT INTO page_results (
        id, audit_id, url, status_code, fetch_time, api_cost, api_time,
        onpage_score, overall_status,
        meta_title, meta_title_length, meta_description, meta_description_length, canonical,
        h1, h1_count, h2_count, h3_count,
        word_count, content_rate, readability_score,
        lcp, lcp_status, fid, fid_status, cls, cls_status, passes_core_web_vitals,
        time_to_interactive, dom_complete, page_size, encoded_size,
        scripts_count, scripts_size, stylesheets_count, stylesheets_size,
        images_count, images_size, render_blocking_scripts, render_blocking_stylesheets,
        internal_links, external_links, broken_links, broken_resources,
        has_h1, has_title, has_description, has_canonical,
        is_https, seo_friendly_url, has_html_doctype, low_content_rate,
        no_image_alt, no_image_title, has_misspelling,
        duplicate_title, duplicate_description, duplicate_content, duplicate_meta_tags,
        misspelled_count, misspelled_words, html_errors_count, html_warnings_count, html_errors, html_warnings,
        og_title, og_description, og_image, og_url, twitter_card,
        issues_count, priority_fix
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `),
    getByAuditId: db.prepare(`
      SELECT * FROM page_results WHERE audit_id = ? ORDER BY onpage_score DESC
    `),
    getById: db.prepare(`
      SELECT * FROM page_results WHERE id = ?
    `),
    deleteByAuditId: db.prepare(`
      DELETE FROM page_results WHERE audit_id = ?
    `),
  };

  _settingsQueries = {
    get: db.prepare(`SELECT value FROM settings WHERE key = ?`),
    upsert: db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `),
    getAll: db.prepare(`SELECT key, value FROM settings`),
  };

  console.log('Database initialized successfully');
}

// Getter functions for queries (ensures they're accessed after initialization)
export const auditQueries = {
  get create() { return _auditQueries.create; },
  get getById() { return _auditQueries.getById; },
  get getAll() { return _auditQueries.getAll; },
  get updateStatus() { return _auditQueries.updateStatus; },
  get updateProgress() { return _auditQueries.updateProgress; },
  get updateError() { return _auditQueries.updateError; },
  get delete() { return _auditQueries.delete; },
};

export const pageQueries = {
  get insert() { return _pageQueries.insert; },
  get getByAuditId() { return _pageQueries.getByAuditId; },
  get getById() { return _pageQueries.getById; },
  get deleteByAuditId() { return _pageQueries.deleteByAuditId; },
};

export const settingsQueries = {
  get get() { return _settingsQueries.get; },
  get upsert() { return _settingsQueries.upsert; },
  get getAll() { return _settingsQueries.getAll; },
};

// Helper functions for settings
export function getSetting(key: string): string | null {
  const result = settingsQueries.get.get(key) as { value: string } | undefined;
  return result?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  settingsQueries.upsert.run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = settingsQueries.getAll.all() as { key: string; value: string }[];
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

export default db;
