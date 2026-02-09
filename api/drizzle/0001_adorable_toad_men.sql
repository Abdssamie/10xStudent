ALTER TABLE "sources" ADD COLUMN "citation_key" text;--> statement-breakpoint
CREATE INDEX "sources_citation_key_idx" ON "sources" USING btree ("document_id","citation_key");