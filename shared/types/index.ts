// Shared types for On-Page SEO tool
// Used by both client and server

// Audit status types
export type AuditStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type OverallStatus = 'excellent' | 'good' | 'needs_improvement' | 'poor';
export type CWVStatus = 'good' | 'needs_improvement' | 'poor';

// Resource error/warning type from DataForSEO
export interface ResourceError {
  line?: number;
  column?: number;
  message?: string;
  status_code?: number;
  resource?: string;
}

// Main Audit interface
export interface Audit {
  id: string;
  url: string;
  status: AuditStatus;
  total_pages: number;
  completed_pages: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// Page Result interface (74 SEO fields)
export interface PageResult {
  id: string;
  audit_id: string;

  // Basic Info
  url: string;
  status_code: number;
  fetch_time: string;
  api_cost: number;
  api_time: string;

  // Score
  onpage_score: number;
  overall_status: OverallStatus;

  // Meta Info
  meta_title: string | null;
  meta_title_length: number;
  meta_description: string | null;
  meta_description_length: number;
  canonical: string | null;

  // Headings
  h1: string | null;
  h1_count: number;
  h2_count: number;
  h3_count: number;

  // Content
  word_count: number;
  content_rate: number;
  readability_score: number;

  // Core Web Vitals
  lcp: number;
  lcp_status: CWVStatus;
  fid: number;
  fid_status: CWVStatus;
  cls: number;
  cls_status: CWVStatus;
  passes_core_web_vitals: boolean;

  // Performance
  time_to_interactive: number;
  dom_complete: number;
  page_size: number;
  encoded_size: number;

  // Resources
  scripts_count: number;
  scripts_size: number;
  stylesheets_count: number;
  stylesheets_size: number;
  images_count: number;
  images_size: number;
  render_blocking_scripts: number;
  render_blocking_stylesheets: number;

  // Links
  internal_links: number;
  external_links: number;
  broken_links: boolean;
  broken_resources: boolean;

  // SEO Checks
  has_h1: boolean;
  has_title: boolean;
  has_description: boolean;
  has_canonical: boolean;
  is_https: boolean;
  seo_friendly_url: boolean;
  has_html_doctype: boolean;
  low_content_rate: boolean;
  no_image_alt: boolean;
  no_image_title: boolean;
  has_misspelling: boolean;
  duplicate_title: boolean;
  duplicate_description: boolean;
  duplicate_content: boolean;
  duplicate_meta_tags: boolean;

  // Spelling & Errors
  misspelled_count: number;
  misspelled_words: string[];
  html_errors_count: number;
  html_warnings_count: number;
  html_errors: ResourceError[];
  html_warnings: ResourceError[];

  // Social Media
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_url: string | null;
  twitter_card: string | null;

  // Calculated
  issues_count: number;
  priority_fix: string;

  created_at: string;
}

// API Request/Response types
export interface CreateAuditRequest {
  url: string;
  limit?: number;
  pages?: string[];
}

export interface AuditWithResults extends Audit {
  pages: PageResult[];
  summary?: {
    average_score: number;
    pages_with_issues: number;
    passing_core_web_vitals: number;
  };
}

// Progress event for SSE
export interface ProgressEvent {
  audit_id: string;
  status: AuditStatus;
  total_pages: number;
  completed_pages: number;
  current_url?: string;
  error?: string;
}

// Firecrawl API types
export interface FirecrawlLink {
  url: string;
  title?: string;
  description?: string;
}

export interface FirecrawlMapResponse {
  success: boolean;
  links: (FirecrawlLink | string)[];
}

// DataForSEO API types
export interface DataForSEORequest {
  url: string;
  load_resources: boolean;
  enable_javascript: boolean;
  enable_browser_rendering: boolean;
  check_spell: boolean;
  disable_cookie_popup: boolean;
  return_despite_timeout: boolean;
  enable_xhr: boolean;
}

export interface DataForSEOResponse {
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: {
      url: string;
    };
    result: Array<{
      crawl_progress: string;
      items_count: number;
      items: Array<DataForSEOPageItem>;
    }>;
  }>;
}

export interface DataForSEOPageItem {
  url: string;
  status_code: number;
  fetch_time: string;
  onpage_score: number;
  size: number;
  encoded_size: number;
  broken_links: boolean;
  broken_resources: boolean;
  duplicate_title: boolean;
  duplicate_description: boolean;
  duplicate_content: boolean;
  checks: {
    no_h1_tag: boolean;
    no_title: boolean;
    no_description: boolean;
    canonical: boolean;
    is_https: boolean;
    seo_friendly_url: boolean;
    has_html_doctype: boolean;
    low_content_rate: boolean;
    no_image_alt: boolean;
    no_image_title: boolean;
    has_misspelling: boolean;
    duplicate_meta_tags: boolean;
    has_render_blocking_resources: boolean;
  };
  page_timing: {
    time_to_interactive: number;
    dom_complete: number;
    largest_contentful_paint: number;
    first_input_delay: number;
  };
  meta: {
    title: string;
    title_length: number;
    description: string;
    description_length: number;
    canonical: string;
    cumulative_layout_shift: number;
    scripts_count: number;
    scripts_size: number;
    stylesheets_count: number;
    stylesheets_size: number;
    images_count: number;
    images_size: number;
    render_blocking_scripts_count: number;
    render_blocking_stylesheets_count: number;
    internal_links_count: number;
    external_links_count: number;
    htags: {
      h1: string[];
      h2: string[];
      h3: string[];
    };
    content: {
      plain_text_word_count: number;
      plain_text_rate: number;
      flesch_kincaid_readability_index: number;
    };
    spell?: {
      misspelled: string[];
    };
    social_media_tags?: {
      'og:title'?: string;
      'og:description'?: string;
      'og:image'?: string;
      'og:url'?: string;
      'twitter:card'?: string;
    };
  };
  resource_errors?: {
    errors: unknown[];
    warnings: unknown[];
  };
}
