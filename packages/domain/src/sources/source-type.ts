export type SourceType =
  | "journal"
  | "book"
  | "conference"
  | "report"
  | "thesis"
  | "website"
  | "blog";

/**
 * Detect source type from URL
 * Uses heuristics to classify sources based on URL patterns
 */
export function detectSourceType(url: string): SourceType {
  const lowered = url.toLowerCase();

  // Academic journals and papers
  if (lowered.includes("arxiv.org") || lowered.includes("doi.org")) {
    return "journal";
  }

  // Theses and dissertations
  if (lowered.includes("thesis") || lowered.includes("dissertation")) {
    return "thesis";
  }

  // Conference proceedings
  if (lowered.includes("conference") || lowered.includes("proceedings")) {
    return "conference";
  }

  // Reports
  if (lowered.includes("report")) {
    return "report";
  }

  // Books
  if (lowered.includes("book")) {
    return "book";
  }

  // Blogs
  if (lowered.includes("blog") || lowered.includes("medium.com")) {
    return "blog";
  }

  // Default to website
  return "website";
}
