/**
 * TanStack AI Tool Definitions for 10xStudent
 *
 * IMPORTANT: These are SCHEMA DEFINITIONS ONLY.
 * Implementations are in:
 * - Server tools: apps/web/app/api/chat/route.ts
 * - Client tools: apps/web/components/editor/TypstEditor.tsx
 *
 * Architecture:
 * - toolDefinition() creates the schema
 * - .server() adds server implementation (in /api/chat)
 * - .client() adds client implementation (in React components)
 */

// Client tools (browser-side, CodeMirror integration)
export * from "./document";

// Server tools (API-side, database/external APIs)
export * from "./research";
export * from "./persistence";
