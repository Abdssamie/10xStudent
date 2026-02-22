import { z } from "zod";
import { createSourceSchema, updateSourceSchema } from "../source";

export const sourceResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string().nullable(),
  author: z.string().nullable(),
  sourceType: z.string(),
  publicationDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export { createSourceSchema, updateSourceSchema };
