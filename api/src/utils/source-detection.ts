import { type SourceType } from "@shared/src/source-type";

/**
 * Automatically detect source type from URL or file extension.
 * Defaults to 'website'.
 */
export function detectSourceType(url: string): SourceType {
  const lowercaseUrl = url.toLowerCase();

  if (lowercaseUrl.endsWith(".pdf")) {
    return "pdf";
  }

  if (lowercaseUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return "image";
  }

  if (lowercaseUrl.match(/\.(txt|md)$/)) {
    return "text";
  }

  if (lowercaseUrl.includes("arxiv.org") || lowercaseUrl.includes("researchgate")) {
    return "journal";
  }

  // Basic heuristics for blogs/articles could be added here
  // But for now, default to website
  return "website";
}
