export interface CitationKeyInput {
  author?: string | null;
  year?: number | null;
  title?: string | null;
}

function normalizeAuthor(author?: string | null): string {
  if (!author) return "unknown";
  const last = author.split(/\s+/).slice(-1)[0] ?? "unknown";
  return last.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function generateCitationKey(
  input: CitationKeyInput,
  existing: Set<string>,
): string {
  const baseAuthor = normalizeAuthor(input.author);
  const baseYear = input.year ? String(input.year) : "n.d";
  const base = `${baseAuthor}${baseYear}`;
  if (!existing.has(base)) return base;
  let suffixCode = "a";
  let candidate = `${base}${suffixCode}`;
  while (existing.has(candidate)) {
    suffixCode = String.fromCharCode(suffixCode.charCodeAt(0) + 1);
    candidate = `${base}${suffixCode}`;
  }
  return candidate;
}
