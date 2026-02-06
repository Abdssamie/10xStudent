import { z } from "zod";
import { db, schema, eq } from "@10xstudent/database";

const { citations, sources } = schema;

export const updateBibliographySchema = z.object({
  documentId: z.string().uuid(),
  format: z.enum(["APA", "MLA", "Chicago"]),
});

export async function updateBibliographyTool(
  params: z.infer<typeof updateBibliographySchema>,
): Promise<{ bibliography: string; sourceCount: number }> {
  // Get all cited sources
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
    .where(eq(citations.documentId, params.documentId))
    .orderBy(citations.citationNumber);

  // Format bibliography based on citation style
  let bibliography = "\n\n= References\n\n";

  for (const source of citedSources) {
    if (params.format === "APA") {
      // APA format: Author. (Year). Title. URL
      const year = source.publicationDate
        ? new Date(source.publicationDate).getFullYear()
        : "n.d.";
      bibliography += `${source.citationNumber}. ${source.author || "Unknown"}. (${year}). ${source.title}. ${source.url}\n\n`;
    } else if (params.format === "MLA") {
      // MLA format: Author. "Title." Website, URL.
      bibliography += `${source.citationNumber}. ${source.author || "Unknown"}. "${source.title}." ${source.url}\n\n`;
    } else if (params.format === "Chicago") {
      // Chicago format: Author. "Title." Accessed date. URL.
      bibliography += `${source.citationNumber}. ${source.author || "Unknown"}. "${source.title}." ${source.url}\n\n`;
    }
  }

  return { bibliography, sourceCount: citedSources.length };
}
