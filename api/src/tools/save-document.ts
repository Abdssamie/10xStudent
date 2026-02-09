import { z } from "zod";
import { db, schema, eq, and } from "@/database";

const { documents } = schema;

export const saveDocumentSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  typstContent: z.string().max(100000),
});

export async function saveDocumentTool(
  params: z.infer<typeof saveDocumentSchema>,
): Promise<{ success: boolean; documentId: string; updatedAt: Date }> {
  const [document] = await db
    .update(documents)
    .set({
      // typstContent: params.typstContent, // TODO: Implement R2 storage upload for content, column does not exist
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, params.documentId),
        eq(documents.userId, params.userId),
      ),
    )
    .returning();

  if (!document) {
    throw new Error("Document not found or access denied");
  }

  return {
    success: true,
    documentId: document.id,
    updatedAt: document.updatedAt,
  };
}
