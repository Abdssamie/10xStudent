/**
 * @id: citations-formatting
 * @priority: high
 * @progress: 100
 * @directive: Implement citation formatting logic for APA, MLA, and Chicago styles
 * @context: specs/04-source-management-rag.md#citation-formatting
 * @checklist: [
 *   "✅ Define CitationFormat type (APA, MLA, Chicago)",
 *   "✅ Define Source interface with metadata fields",
 *   "✅ Implement formatCitation function with switch for each style",
 *   "✅ Implement formatAPA with author, year, title, URL, accessDate",
 *   "✅ Implement formatMLA with author, title, URL, accessDate",
 *   "✅ Implement formatChicago with author, title, URL, accessDate",
 *   "✅ Implement generateBibliography function (sorts by author, formats all sources)",
 *   "✅ Implement generateBibliographyTypst function (Typst format with #pagebreak)",
 *   "✅ Handle missing metadata gracefully (Unknown Author, n.d., Untitled)"
 * ]
 * @deps: []
 * @skills: ["typescript"]
 */

// Import CitationFormat from document schemas to avoid duplication
import type { CitationFormat } from "./document";

// Source metadata interface
export interface SourceMetadata {
  title?: string | null;
  author?: string | null;
  publicationDate?: Date | string | null;
  url: string;
  accessDate?: Date | string | null;
}

// Format a single citation based on style
export function formatCitation(
  source: SourceMetadata,
  format: CitationFormat,
): string {
  switch (format) {
    case "APA":
      return formatAPA(source);
    case "MLA":
      return formatMLA(source);
    case "Chicago":
      return formatChicago(source);
    default:
      return formatAPA(source);
  }
}

// APA format: Author, A. A. (Year). Title. Retrieved from URL
function formatAPA(source: SourceMetadata): string {
  const author = source.author || "Unknown Author";
  const year = extractYear(source.publicationDate) || "n.d.";
  const title = source.title || "Untitled";
  const url = source.url;
  const accessDate = formatDate(source.accessDate);

  return `${author}. (${year}). ${title}. Retrieved ${accessDate} from ${url}`;
}

// MLA format: Author. "Title." Website, Access Date, URL.
function formatMLA(source: SourceMetadata): string {
  const author = source.author || "Unknown Author";
  const title = source.title || "Untitled";
  const url = source.url;
  const accessDate = formatDate(source.accessDate);

  return `${author}. "${title}." Web. ${accessDate}. <${url}>.`;
}

// Chicago format: Author. "Title." Accessed Date. URL.
function formatChicago(source: SourceMetadata): string {
  const author = source.author || "Unknown Author";
  const title = source.title || "Untitled";
  const url = source.url;
  const accessDate = formatDate(source.accessDate);

  return `${author}. "${title}." Accessed ${accessDate}. ${url}.`;
}

// Helper: Extract year from date
function extractYear(date?: Date | string | null): string | null {
  if (!date) return null;

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return null;

  return dateObj.getFullYear().toString();
}

// Helper: Format date as "Month Day, Year"
function formatDate(date?: Date | string | null): string {
  if (!date) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Generate bibliography from multiple sources
export function generateBibliography(
  sources: SourceMetadata[],
  format: CitationFormat,
): string[] {
  // Sort by author name
  const sortedSources = [...sources].sort((a, b) => {
    const authorA = a.author || "Unknown Author";
    const authorB = b.author || "Unknown Author";
    return authorA.localeCompare(authorB);
  });

  // Format each citation
  return sortedSources.map((source) => formatCitation(source, format));
}

// Generate bibliography in Typst format
export function generateBibliographyTypst(
  sources: SourceMetadata[],
  format: CitationFormat,
): string {
  const citations = generateBibliography(sources, format);

  const typstBibliography = [
    "#pagebreak()",
    "",
    "= References",
    "",
    ...citations.map((citation, index) => `${index + 1}. ${citation}`),
  ];

  return typstBibliography.join("\n");
}
