-- Migration: Add R2 storage, assets, and chat messages
-- Replace typst_content with r2_key and bib_key
-- Add assets table for document images/files
-- Add chat_messages table for AI-assisted writing

-- Modify documents table
ALTER TABLE documents DROP COLUMN typst_content;
ALTER TABLE documents ADD COLUMN r2_key TEXT NOT NULL;
ALTER TABLE documents ADD COLUMN bib_key TEXT;

-- Create assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assets_document_id_idx ON assets(document_id);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_messages_document_id_idx ON chat_messages(document_id);
CREATE INDEX chat_messages_created_at_idx ON chat_messages(created_at);
