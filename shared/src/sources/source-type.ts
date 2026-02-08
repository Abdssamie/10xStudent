export type SourceType =
  | "journal"
  | "book"
  | "conference"
  | "report"
  | "thesis"
  | "website"
  | "blog";

// Journal domain patterns (academic publishers and repositories)
const JOURNAL_DOMAINS = [
  "arxiv.org",
  "doi.org",
  "pubmed.ncbi.nlm.nih.gov",
  "ieeexplore.ieee.org",
  "sciencedirect.com",
  "springer.com",
  "jstor.org",
  "nature.com",
  "science.org",
  "wiley.com",
  "acm.org",
] as const;

// Blog domain patterns
const BLOG_DOMAINS = ["medium.com", "dev.to", "hashnode.dev"] as const;

/**
 * Detect the source type from a URL using pattern matching.
 * Falls back to "website" for unknown patterns.
 */
export function detectSourceType(url: string): SourceType {
  const lowered = url.toLowerCase();

  // Parse URL to extract hostname
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // If URL parsing fails, use simple string matching
    hostname = lowered;
  }

  // Check journal domains
  for (const domain of JOURNAL_DOMAINS) {
    if (hostname.includes(domain)) {
      return "journal";
    }
  }

  // Check blog domains or blog. subdomain
  for (const domain of BLOG_DOMAINS) {
    if (hostname.includes(domain)) {
      return "blog";
    }
  }
  if (hostname.startsWith("blog.") || hostname.includes(".blog.")) {
    return "blog";
  }

  // Check path patterns for thesis/dissertation
  if (lowered.includes("thesis") || lowered.includes("dissertation")) {
    return "thesis";
  }

  // Check path patterns for conference proceedings
  if (
    lowered.includes("conference") ||
    lowered.includes("proceedings") ||
    lowered.includes("/conf/") ||
    lowered.includes("/conf.")
  ) {
    return "conference";
  }

  // Default to website
  return "website";
}
