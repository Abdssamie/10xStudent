import { z } from "zod";
import { db, schema, eq, sql } from "@10xstudent/database";

const { documents } = schema;

export const getNextCitationNumberSchema = z.object({
  documentId: z.string().uuid(),
});

export async function getNextCitationNumberTool(
  params: z.infer<typeof getNextCitationNumberSchema>,
): Promise<{ citationNumber: number }> {
  // Atomic increment of citation counter
  const [document] = await db
    .update(documents)
    .set({
      citationCount: sql`${documents.citationCount} + 1`,
    })
    .where(eq(documents.id, params.documentId))
    .returning({ citationNumber: documents.citationCount });

  if (!document) {
    throw new Error("Document not found");
  }

  return { citationNumber: document.citationNumber };
}
