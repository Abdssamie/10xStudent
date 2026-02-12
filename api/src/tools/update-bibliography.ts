import { z } from "zod";
import { db, schema, eq, asc } from "@/database"; // Added asc for sorting

const { citations, sources } = schema;

export const updateBibliographySchema = z.object({
  documentId: z.uuid(), // Explicitly string.uuid()
  format: z.enum(["APA", "MLA", "Chicago"]),
});

export async function updateBibliographyTool(
  params: z.infer<typeof updateBibliographySchema>,
): Promise<{ bibliography: string; sourceCount: number }> {
  
  const citedSources = await db
    .select({
      citationNumber: citations.citationNumber,
      title: sources.title,
      author: sources.author,
      url: sources.url,
      publicationDate: sources.publicationDate,
    })
    .from(citations)
    .innerJoin(sources, eq(citations.sourceId, sources.id))
    .where(eq(citations.documentId, params.documentId));

  if (citedSources.length === 0) {
    return { bibliography: "\n\n= References\n\nNo sources cited.", sourceCount: 0 };
  }

  // APA and MLA require alphabetical sorting by author
  const sortedSources = [...citedSources].sort((a, b) => 
    (a.author || "Unknown").localeCompare(b.author || "Unknown")
  );

  let bibliography = "\n\n= References\n\n";

  for (const source of sortedSources) {
    const author = source.author || "Unknown";
    const title = source.title || "Untitled";
    const url = source.url || "";
    const year = source.publicationDate ? new Date(source.publicationDate).getFullYear() : "n.d.";

    switch (params.format) {
      case "APA":
        // APA: Author, A. A. (Year). Title. URL
        bibliography += `${author}. (${year}). *${title}*. ${url}\n\n`;
        break;
      case "MLA":
        // MLA: Author. "Title." Website/Publisher, URL.
        bibliography += `${author}. "${title}." ${url}\n\n`;
        break;
      case "Chicago":
        // Chicago: Author. "Title." Last modified/Published Year. URL.
        bibliography += `${author}. "${title}." ${year}. ${url}\n\n`;
        break;
    }
  }

  return { bibliography: bibliography.trimEnd(), sourceCount: citedSources.length };
}
