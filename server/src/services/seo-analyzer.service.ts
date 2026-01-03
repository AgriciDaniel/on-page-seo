import { v4 as uuidv4 } from 'uuid';
import type {
  DataForSEOPageItem,
  PageResult,
  OverallStatus,
  CWVStatus,
  ResourceError,
} from '../types/index.js';

// Calculate overall status based on score
function getOverallStatus(score: number): OverallStatus {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'needs_improvement';
  return 'poor';
}

// Calculate Core Web Vitals status
function getLCPStatus(lcp: number): CWVStatus {
  if (lcp <= 2500) return 'good';
  if (lcp <= 4000) return 'needs_improvement';
  return 'poor';
}

function getFIDStatus(fid: number): CWVStatus {
  if (fid <= 100) return 'good';
  if (fid <= 300) return 'needs_improvement';
  return 'poor';
}

function getCLSStatus(cls: number): CWVStatus {
  if (cls <= 0.1) return 'good';
  if (cls <= 0.25) return 'needs_improvement';
  return 'poor';
}

// Calculate priority fix
function getPriorityFix(data: Partial<PageResult>): string {
  if (!data.has_title) return 'Add meta title';
  if (!data.has_description) return 'Add meta description';
  if (!data.has_h1) return 'Add H1 heading';
  if (data.broken_links) return 'Fix broken links';
  if (data.broken_resources) return 'Fix broken resources';
  if (data.low_content_rate) return 'Add more content';
  if (!data.passes_core_web_vitals) return 'Improve Core Web Vitals';
  if ((data.misspelled_count || 0) > 10) return 'Fix spelling errors';
  if (data.no_image_alt) return 'Add ALT tags to images';
  if ((data.page_size || 0) > 3 * 1024 * 1024) return 'Reduce page size';
  if (!data.has_canonical) return 'Add canonical URL';
  return 'All good';
}

// Calculate issues count
function getIssuesCount(data: Partial<PageResult>): number {
  const issues = [
    data.low_content_rate,
    data.no_image_alt,
    data.broken_links,
    data.broken_resources,
    !data.has_h1,
    !data.has_title,
    !data.has_description,
    !data.has_canonical,
    !data.passes_core_web_vitals,
    (data.page_size || 0) > 3 * 1024 * 1024,
    (data.misspelled_count || 0) > 10,
  ];

  return issues.filter(Boolean).length;
}

// Transform DataForSEO response to our PageResult format
export function transformSEOData(
  auditId: string,
  apiData: DataForSEOPageItem,
  apiCost: number,
  apiTime: string
): PageResult {
  const lcp = apiData.page_timing?.largest_contentful_paint || 0;
  const fid = apiData.page_timing?.first_input_delay || 0;
  const cls = apiData.meta?.cumulative_layout_shift || 0;

  const lcpStatus = getLCPStatus(lcp);
  const fidStatus = getFIDStatus(fid);
  const clsStatus = getCLSStatus(cls);
  const passesCWV = lcp <= 2500 && fid <= 100 && cls <= 0.1;

  const checks = apiData.checks || {};
  const meta = apiData.meta || {};
  const htags = meta.htags || { h1: [], h2: [], h3: [] };
  const content = meta.content || {};
  const socialTags = meta.social_media_tags || {};
  const resourceErrors = apiData.resource_errors || { errors: [], warnings: [] };

  const partialResult: Partial<PageResult> = {
    // Basic Info
    url: apiData.url,
    status_code: apiData.status_code,
    fetch_time: apiData.fetch_time,
    api_cost: apiCost,
    api_time: apiTime,

    // Score
    onpage_score: apiData.onpage_score || 0,
    overall_status: getOverallStatus(apiData.onpage_score || 0),

    // Meta Info
    meta_title: meta.title || null,
    meta_title_length: meta.title_length || 0,
    meta_description: meta.description || null,
    meta_description_length: meta.description_length || 0,
    canonical: meta.canonical || null,

    // Headings
    h1: htags.h1?.[0] || null,
    h1_count: htags.h1?.length || 0,
    h2_count: htags.h2?.length || 0,
    h3_count: htags.h3?.length || 0,

    // Content
    word_count: content.plain_text_word_count || 0,
    content_rate: content.plain_text_rate || 0,
    readability_score: content.flesch_kincaid_readability_index || 0,

    // Core Web Vitals
    lcp,
    lcp_status: lcpStatus,
    fid,
    fid_status: fidStatus,
    cls,
    cls_status: clsStatus,
    passes_core_web_vitals: passesCWV,

    // Performance
    time_to_interactive: apiData.page_timing?.time_to_interactive || 0,
    dom_complete: apiData.page_timing?.dom_complete || 0,
    page_size: apiData.size || 0,
    encoded_size: apiData.encoded_size || 0,

    // Resources
    scripts_count: meta.scripts_count || 0,
    scripts_size: meta.scripts_size || 0,
    stylesheets_count: meta.stylesheets_count || 0,
    stylesheets_size: meta.stylesheets_size || 0,
    images_count: meta.images_count || 0,
    images_size: meta.images_size || 0,
    render_blocking_scripts: meta.render_blocking_scripts_count || 0,
    render_blocking_stylesheets: meta.render_blocking_stylesheets_count || 0,

    // Links
    internal_links: meta.internal_links_count || 0,
    external_links: meta.external_links_count || 0,
    broken_links: apiData.broken_links || false,
    broken_resources: apiData.broken_resources || false,

    // SEO Checks (invert no_* checks)
    has_h1: !checks.no_h1_tag,
    has_title: !checks.no_title,
    has_description: !checks.no_description,
    has_canonical: checks.canonical || false,
    is_https: checks.is_https || false,
    seo_friendly_url: checks.seo_friendly_url || false,
    has_html_doctype: checks.has_html_doctype || false,
    low_content_rate: checks.low_content_rate || false,
    no_image_alt: checks.no_image_alt || false,
    no_image_title: checks.no_image_title || false,
    has_misspelling: checks.has_misspelling || false,
    duplicate_title: apiData.duplicate_title || false,
    duplicate_description: apiData.duplicate_description || false,
    duplicate_content: apiData.duplicate_content || false,
    duplicate_meta_tags: checks.duplicate_meta_tags || false,

    // Spelling & Errors
    misspelled_count: meta.spell?.misspelled?.length || 0,
    misspelled_words: meta.spell?.misspelled || [],
    html_errors_count: resourceErrors.errors?.length || 0,
    html_warnings_count: resourceErrors.warnings?.length || 0,
    html_errors: (resourceErrors.errors || []) as ResourceError[],
    html_warnings: (resourceErrors.warnings || []) as ResourceError[],

    // Social Media
    og_title: socialTags['og:title'] || null,
    og_description: socialTags['og:description'] || null,
    og_image: socialTags['og:image'] || null,
    og_url: socialTags['og:url'] || null,
    twitter_card: socialTags['twitter:card'] || null,
  };

  // Calculate derived fields
  partialResult.issues_count = getIssuesCount(partialResult);
  partialResult.priority_fix = getPriorityFix(partialResult);

  return {
    id: uuidv4(),
    audit_id: auditId,
    created_at: new Date().toISOString(),
    ...partialResult,
  } as PageResult;
}
