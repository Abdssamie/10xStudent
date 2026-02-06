import { z } from "zod";
import { db, schema } from "@10xstudent/database";

const { citations } = schema;

export const addCitationSchema = z.object({
  documentId: z.string().uuid(),
  sourceId: z.string().uuid(),
  citationNumber: z.number().int().positive(),
  position: z.number().int().min(0),
});

export async function addCitationTool(
  params: z.infer<typeof addCitationSchema>,
): Promise<{ citationId: string; citationNumber: number }> {
  const [citation] = await db
    .insert(citations)
    .values({
      documentId: params.documentId,
      sourceId: params.sourceId,
      citationNumber: params.citationNumber,
      position: params.position,
    })
    .returning();

  return { citationId: citation.id, citationNumber: citation.citationNumber };
}
