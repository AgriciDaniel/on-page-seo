import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { auditQueries, pageQueries } from '../db/database.js';
import { discoverPages } from '../services/firecrawl.service.js';
import { analyzePageWithRetry } from '../services/dataforseo.service.js';
import { transformSEOData } from '../services/seo-analyzer.service.js';
import type { Audit, PageResult, ProgressEvent, CreateAuditRequest } from '../types/index.js';

const router = Router();

// Store for SSE connections per audit
const sseConnections = new Map<string, Set<Response>>();

// Store for cancellation flags
const cancelledAudits = new Set<string>();

// Helper to send SSE event to all connections for an audit
function sendProgress(auditId: string, event: ProgressEvent): void {
  const connections = sseConnections.get(auditId);
  if (connections) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    connections.forEach((res) => {
      res.write(data);
    });
  }
}

// Process audit in background
async function processAudit(auditId: string, url: string, limit: number): Promise<void> {
  try {
    // Update status to processing
    auditQueries.updateStatus.run('processing', 'processing', auditId);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'processing',
      total_pages: 0,
      completed_pages: 0,
      current_url: 'Discovering pages...',
    });

    // Discover pages using Firecrawl
    const pages = await discoverPages(url, limit);

    if (pages.length === 0) {
      throw new Error('No pages found for this URL');
    }

    // Update total pages count
    auditQueries.updateProgress.run(pages.length, 0, auditId);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'processing',
      total_pages: pages.length,
      completed_pages: 0,
      current_url: pages[0],
    });

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      // Check if cancelled
      if (cancelledAudits.has(auditId)) {
        cancelledAudits.delete(auditId);
        auditQueries.updateStatus.run('failed', 'failed', auditId);
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'failed',
          total_pages: pages.length,
          completed_pages: i,
          error: 'Audit cancelled by user',
        });
        return;
      }

      const pageUrl = pages[i];

      try {
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'processing',
          total_pages: pages.length,
          completed_pages: i,
          current_url: pageUrl,
        });

        // Analyze page with DataForSEO
        const { data, cost, time } = await analyzePageWithRetry(pageUrl);

        // Transform and store result
        const pageResult = transformSEOData(auditId, data, cost, time);

        // Insert into database
        pageQueries.insert.run(
          pageResult.id,
          pageResult.audit_id,
          pageResult.url,
          pageResult.status_code,
          pageResult.fetch_time,
          pageResult.api_cost,
          pageResult.api_time,
          pageResult.onpage_score,
          pageResult.overall_status,
          pageResult.meta_title,
          pageResult.meta_title_length,
          pageResult.meta_description,
          pageResult.meta_description_length,
          pageResult.canonical,
          pageResult.h1,
          pageResult.h1_count,
          pageResult.h2_count,
          pageResult.h3_count,
          pageResult.word_count,
          pageResult.content_rate,
          pageResult.readability_score,
          pageResult.lcp,
          pageResult.lcp_status,
          pageResult.fid,
          pageResult.fid_status,
          pageResult.cls,
          pageResult.cls_status,
          pageResult.passes_core_web_vitals ? 1 : 0,
          pageResult.time_to_interactive,
          pageResult.dom_complete,
          pageResult.page_size,
          pageResult.encoded_size,
          pageResult.scripts_count,
          pageResult.scripts_size,
          pageResult.stylesheets_count,
          pageResult.stylesheets_size,
          pageResult.images_count,
          pageResult.images_size,
          pageResult.render_blocking_scripts,
          pageResult.render_blocking_stylesheets,
          pageResult.internal_links,
          pageResult.external_links,
          pageResult.broken_links ? 1 : 0,
          pageResult.broken_resources ? 1 : 0,
          pageResult.has_h1 ? 1 : 0,
          pageResult.has_title ? 1 : 0,
          pageResult.has_description ? 1 : 0,
          pageResult.has_canonical ? 1 : 0,
          pageResult.is_https ? 1 : 0,
          pageResult.seo_friendly_url ? 1 : 0,
          pageResult.has_html_doctype ? 1 : 0,
          pageResult.low_content_rate ? 1 : 0,
          pageResult.no_image_alt ? 1 : 0,
          pageResult.no_image_title ? 1 : 0,
          pageResult.has_misspelling ? 1 : 0,
          pageResult.duplicate_title ? 1 : 0,
          pageResult.duplicate_description ? 1 : 0,
          pageResult.duplicate_content ? 1 : 0,
          pageResult.duplicate_meta_tags ? 1 : 0,
          pageResult.misspelled_count,
          JSON.stringify(pageResult.misspelled_words || []),
          pageResult.html_errors_count,
          pageResult.html_warnings_count,
          JSON.stringify(pageResult.html_errors || []),
          JSON.stringify(pageResult.html_warnings || []),
          pageResult.og_title,
          pageResult.og_description,
          pageResult.og_image,
          pageResult.og_url,
          pageResult.twitter_card,
          pageResult.issues_count,
          pageResult.priority_fix
        );

        // Update progress
        auditQueries.updateProgress.run(pages.length, i + 1, auditId);
      } catch (error) {
        console.error(`Error processing page ${pageUrl}:`, error);
        // Continue with next page
      }
    }

    // Mark as completed
    auditQueries.updateStatus.run('completed', 'completed', auditId);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'completed',
      total_pages: pages.length,
      completed_pages: pages.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Audit ${auditId} failed:`, error);
    auditQueries.updateError.run(errorMessage, auditId);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'failed',
      total_pages: 0,
      completed_pages: 0,
      error: errorMessage,
    });
  }
}

// Process audit with pre-selected pages (no discovery needed)
async function processAuditWithPages(auditId: string, _url: string, pages: string[]): Promise<void> {
  try {
    // Update status to processing
    auditQueries.updateStatus.run('processing', 'processing', auditId);

    // Update total pages count
    auditQueries.updateProgress.run(pages.length, 0, auditId);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'processing',
      total_pages: pages.length,
      completed_pages: 0,
      current_url: pages[0],
    });

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      // Check if cancelled
      if (cancelledAudits.has(auditId)) {
        cancelledAudits.delete(auditId);
        auditQueries.updateStatus.run('failed', 'failed', auditId);
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'failed',
          total_pages: pages.length,
          completed_pages: i,
          error: 'Audit cancelled by user',
        });
        return;
      }

      const pageUrl = pages[i];

      try {
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'processing',
          total_pages: pages.length,
          completed_pages: i,
          current_url: pageUrl,
        });

        // Analyze page with DataForSEO
        const { data, cost, time } = await analyzePageWithRetry(pageUrl);

        // Transform and store result
        const pageResult = transformSEOData(auditId, data, cost, time);

        // Insert into database
        pageQueries.insert.run(
          pageResult.id,
          pageResult.audit_id,
          pageResult.url,
          pageResult.status_code,
          pageResult.fetch_time,
          pageResult.api_cost,
          pageResult.api_time,
          pageResult.onpage_score,
          pageResult.overall_status,
          pageResult.meta_title,
          pageResult.meta_title_length,
          pageResult.meta_description,
          pageResult.meta_description_length,
          pageResult.canonical,
          pageResult.h1,
          pageResult.h1_count,
          pageResult.h2_count,
          pageResult.h3_count,
          pageResult.word_count,
          pageResult.content_rate,
          pageResult.readability_score,
          pageResult.lcp,
          pageResult.lcp_status,
          pageResult.fid,
          pageResult.fid_status,
          pageResult.cls,
          pageResult.cls_status,
          pageResult.passes_core_web_vitals ? 1 : 0,
          pageResult.time_to_interactive,
          pageResult.dom_complete,
          pageResult.page_size,
          pageResult.encoded_size,
          pageResult.scripts_count,
          pageResult.scripts_size,
          pageResult.stylesheets_count,
          pageResult.stylesheets_size,
          pageResult.images_count,
          pageResult.images_size,
          pageResult.render_blocking_scripts,
          pageResult.render_blocking_stylesheets,
          pageResult.internal_links,
          pageResult.external_links,
          pageResult.broken_links ? 1 : 0,
          pageResult.broken_resources ? 1 : 0,
          pageResult.has_h1 ? 1 : 0,
          pageResult.has_title ? 1 : 0,
          pageResult.has_description ? 1 : 0,
          pageResult.has_canonical ? 1 : 0,
          pageResult.is_https ? 1 : 0,
          pageResult.seo_friendly_url ? 1 : 0,
          pageResult.has_html_doctype ? 1 : 0,
          pageResult.low_content_rate ? 1 : 0,
          pageResult.no_image_alt ? 1 : 0,
          pageResult.no_image_title ? 1 : 0,
          pageResult.has_misspelling ? 1 : 0,
          pageResult.duplicate_title ? 1 : 0,
          pageResult.duplicate_description ? 1 : 0,
          pageResult.duplicate_content ? 1 : 0,
          pageResult.duplicate_meta_tags ? 1 : 0,
          pageResult.misspelled_count,
          JSON.stringify(pageResult.misspelled_words || []),
          pageResult.html_errors_count,
          pageResult.html_warnings_count,
          JSON.stringify(pageResult.html_errors || []),
          JSON.stringify(pageResult.html_warnings || []),
          pageResult.og_title,
          pageResult.og_description,
          pageResult.og_image,
          pageResult.og_url,
          pageResult.twitter_card,
          pageResult.issues_count,
          pageResult.priority_fix
        );

        // Update progress
        auditQueries.updateProgress.run(pages.length, i + 1, auditId);
      } catch (error) {
        console.error(`Error processing page ${pageUrl}:`, error);
        // Continue with next page
      }
    }

    // Mark as completed
    auditQueries.updateStatus.run('completed', 'completed', auditId);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'completed',
      total_pages: pages.length,
      completed_pages: pages.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Audit ${auditId} failed:`, error);
    auditQueries.updateError.run(errorMessage, auditId);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'failed',
      total_pages: 0,
      completed_pages: 0,
      error: errorMessage,
    });
  }
}

// DISCOVER - Get pages for a URL without starting audit
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { url, limit = 100 } = req.body as CreateAuditRequest;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const pages = await discoverPages(url, limit);
    res.json({ url, pages, total: pages.length });
  } catch (error) {
    console.error('Error discovering pages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to discover pages';
    res.status(500).json({ error: errorMessage });
  }
});

// CREATE - Start new audit (can accept specific pages to process)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, limit = 100, pages: selectedPages } = req.body as CreateAuditRequest & { pages?: string[] };

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const auditId = uuidv4();
    auditQueries.create.run(auditId, url);

    // Start processing in background - use selected pages if provided
    if (selectedPages && selectedPages.length > 0) {
      processAuditWithPages(auditId, url, selectedPages).catch(console.error);
    } else {
      processAudit(auditId, url, limit).catch(console.error);
    }

    const audit = auditQueries.getById.get(auditId) as Audit;
    res.status(201).json(audit);
  } catch (error) {
    console.error('Error creating audit:', error);
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// CANCEL - Cancel a running audit
router.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const auditId = req.params.id;
    const audit = auditQueries.getById.get(auditId) as Audit | undefined;

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    if (audit.status !== 'processing') {
      res.status(400).json({ error: 'Audit is not processing' });
      return;
    }

    cancelledAudits.add(auditId);
    res.json({ success: true, message: 'Cancellation requested' });
  } catch (error) {
    console.error('Error cancelling audit:', error);
    res.status(500).json({ error: 'Failed to cancel audit' });
  }
});

// REGENERATE - Re-run an existing audit
router.post('/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const originalAuditId = req.params.id;
    const originalAudit = auditQueries.getById.get(originalAuditId) as Audit | undefined;

    if (!originalAudit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    // Get the pages from the original audit
    const originalPages = pageQueries.getByAuditId.all(originalAuditId) as PageResult[];
    const pageUrls = originalPages.map((p) => p.url);

    // Create a new audit with the same URL
    const newAuditId = uuidv4();
    auditQueries.create.run(newAuditId, originalAudit.url);

    // Start processing with the same pages
    if (pageUrls.length > 0) {
      processAuditWithPages(newAuditId, originalAudit.url, pageUrls).catch(console.error);
    } else {
      // If no pages found, run discovery again
      processAudit(newAuditId, originalAudit.url, 100).catch(console.error);
    }

    const newAudit = auditQueries.getById.get(newAuditId) as Audit;
    res.status(201).json(newAudit);
  } catch (error) {
    console.error('Error regenerating audit:', error);
    res.status(500).json({ error: 'Failed to regenerate audit' });
  }
});

// READ - Get all audits
router.get('/', (_req: Request, res: Response) => {
  try {
    const audits = auditQueries.getAll.all() as Audit[];
    res.json(audits);
  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// READ - Get single audit with results
router.get('/:id', (req: Request, res: Response) => {
  try {
    const audit = auditQueries.getById.get(req.params.id) as Audit | undefined;

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const pages = pageQueries.getByAuditId.all(req.params.id) as PageResult[];

    // Convert boolean fields from 0/1 to true/false and parse JSON fields
    const convertedPages = pages.map((page) => ({
      ...page,
      passes_core_web_vitals: Boolean(page.passes_core_web_vitals),
      broken_links: Boolean(page.broken_links),
      broken_resources: Boolean(page.broken_resources),
      has_h1: Boolean(page.has_h1),
      has_title: Boolean(page.has_title),
      has_description: Boolean(page.has_description),
      has_canonical: Boolean(page.has_canonical),
      is_https: Boolean(page.is_https),
      seo_friendly_url: Boolean(page.seo_friendly_url),
      has_html_doctype: Boolean(page.has_html_doctype),
      low_content_rate: Boolean(page.low_content_rate),
      no_image_alt: Boolean(page.no_image_alt),
      no_image_title: Boolean(page.no_image_title),
      has_misspelling: Boolean(page.has_misspelling),
      duplicate_title: Boolean(page.duplicate_title),
      duplicate_description: Boolean(page.duplicate_description),
      duplicate_content: Boolean(page.duplicate_content),
      duplicate_meta_tags: Boolean(page.duplicate_meta_tags),
      misspelled_words: typeof page.misspelled_words === 'string' ? JSON.parse(page.misspelled_words || '[]') : (page.misspelled_words || []),
      html_errors: typeof page.html_errors === 'string' ? JSON.parse(page.html_errors || '[]') : (page.html_errors || []),
      html_warnings: typeof page.html_warnings === 'string' ? JSON.parse(page.html_warnings || '[]') : (page.html_warnings || []),
    }));

    // Calculate summary
    const summary = {
      average_score:
        convertedPages.length > 0
          ? convertedPages.reduce((sum, p) => sum + (p.onpage_score || 0), 0) /
            convertedPages.length
          : 0,
      pages_with_issues: convertedPages.filter((p) => p.issues_count > 0).length,
      passing_core_web_vitals: convertedPages.filter((p) => p.passes_core_web_vitals)
        .length,
    };

    res.json({
      ...audit,
      pages: convertedPages,
      summary,
    });
  } catch (error) {
    console.error('Error fetching audit:', error);
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

// SSE - Progress updates
router.get('/:id/progress', (req: Request, res: Response) => {
  const auditId = req.params.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Add connection to map
  if (!sseConnections.has(auditId)) {
    sseConnections.set(auditId, new Set());
  }
  sseConnections.get(auditId)!.add(res);

  // Send initial status
  const audit = auditQueries.getById.get(auditId) as Audit | undefined;
  if (audit) {
    const event: ProgressEvent = {
      audit_id: auditId,
      status: audit.status as ProgressEvent['status'],
      total_pages: audit.total_pages,
      completed_pages: audit.completed_pages,
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Clean up on close
  req.on('close', () => {
    sseConnections.get(auditId)?.delete(res);
    if (sseConnections.get(auditId)?.size === 0) {
      sseConnections.delete(auditId);
    }
  });
});

// EXPORT - Export audit results
router.get('/:id/export', (req: Request, res: Response) => {
  try {
    const format = req.query.format as string || 'csv';
    const audit = auditQueries.getById.get(req.params.id) as Audit | undefined;

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const pages = pageQueries.getByAuditId.all(req.params.id) as PageResult[];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="seo-audit-${audit.id}.json"`
      );
      res.json({ audit, pages });
    } else {
      // CSV export
      const headers = [
        'Date',
        'URL',
        'On Page Score',
        'Status',
        'Meta Title',
        'Meta Description',
        'Readability Score',
        'Page Size (MB)',
        'Load Time (sec)',
        'Word Count',
        'Misspelling',
        'ALT Missing',
        'Broken Links',
        'Broken Resources',
        'Has H1',
        'Has Title',
        'Has Description',
        'Has Canonical',
        'SEO Friendly URL',
        'Issues',
        'Priority Fix',
        'Passes Core Web Vitals',
      ];

      const rows = pages.map((page) => [
        page.created_at,
        page.url,
        page.onpage_score?.toFixed(2) || '0',
        page.overall_status,
        `"${(page.meta_title || '').replace(/"/g, '""')}"`,
        `"${(page.meta_description || 'null').replace(/"/g, '""')}"`,
        page.readability_score?.toFixed(2) || '0',
        ((page.page_size || 0) / 1024 / 1024).toFixed(2),
        ((page.time_to_interactive || 0) / 1000).toFixed(2),
        page.word_count || 0,
        page.misspelled_count || 0,
        page.no_image_alt ? 'Yes' : 'No',
        page.broken_links ? 'Yes' : 'No',
        page.broken_resources ? 'Yes' : 'No',
        page.has_h1 ? 'Yes' : 'No',
        page.has_title ? 'Yes' : 'No',
        page.has_description ? 'Yes' : 'No',
        page.has_canonical ? 'Yes' : 'No',
        page.seo_friendly_url ? 'Yes' : 'No',
        page.issues_count || 0,
        `"${(page.priority_fix || '').replace(/"/g, '""')}"`,
        page.passes_core_web_vitals ? 'Yes' : 'No',
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
        '\n'
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="seo-audit-${audit.id}.csv"`
      );
      res.send(csv);
    }
  } catch (error) {
    console.error('Error exporting audit:', error);
    res.status(500).json({ error: 'Failed to export audit' });
  }
});

// DELETE - Delete audit
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const audit = auditQueries.getById.get(req.params.id) as Audit | undefined;

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    // Delete page results first (foreign key)
    pageQueries.deleteByAuditId.run(req.params.id);
    auditQueries.delete.run(req.params.id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting audit:', error);
    res.status(500).json({ error: 'Failed to delete audit' });
  }
});

// GET single page report
router.get('/report/:reportId', (req: Request, res: Response) => {
  try {
    const page = pageQueries.getById.get(req.params.reportId) as PageResult | undefined;

    if (!page) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Convert boolean fields and parse JSON fields
    const convertedPage = {
      ...page,
      passes_core_web_vitals: Boolean(page.passes_core_web_vitals),
      broken_links: Boolean(page.broken_links),
      broken_resources: Boolean(page.broken_resources),
      has_h1: Boolean(page.has_h1),
      has_title: Boolean(page.has_title),
      has_description: Boolean(page.has_description),
      has_canonical: Boolean(page.has_canonical),
      is_https: Boolean(page.is_https),
      seo_friendly_url: Boolean(page.seo_friendly_url),
      has_html_doctype: Boolean(page.has_html_doctype),
      low_content_rate: Boolean(page.low_content_rate),
      no_image_alt: Boolean(page.no_image_alt),
      no_image_title: Boolean(page.no_image_title),
      has_misspelling: Boolean(page.has_misspelling),
      duplicate_title: Boolean(page.duplicate_title),
      duplicate_description: Boolean(page.duplicate_description),
      duplicate_content: Boolean(page.duplicate_content),
      duplicate_meta_tags: Boolean(page.duplicate_meta_tags),
      misspelled_words: typeof page.misspelled_words === 'string' ? JSON.parse(page.misspelled_words || '[]') : (page.misspelled_words || []),
      html_errors: typeof page.html_errors === 'string' ? JSON.parse(page.html_errors || '[]') : (page.html_errors || []),
      html_warnings: typeof page.html_warnings === 'string' ? JSON.parse(page.html_warnings || '[]') : (page.html_warnings || []),
    };

    res.json(convertedPage);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

export default router;
