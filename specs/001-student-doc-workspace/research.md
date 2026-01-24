# Research: Student Document Workspace

## Decisions

### 1. Generation Engine: Typst (Unified)

**Decision**: Use Typst as the core rendering engine for both General Documents and Resumes (via RenderCV).
**Rationale**:

- **RenderCV v2.6+** now defaults to Typst, unifying the pipeline.
- Typst is significantly faster than LaTeX.
- Supports WASM for client-side execution.

### 2. Live Preview Architecture: Client-Side (WASM)

**Decision**: Implement the Live Preview primarily on the client-side using WebAssembly.

- **General Docs**: `@myriaddreamin/typst.ts` (or official `@typst/renderer`) running in browser.
- **Resumes**: - **Option A (Preferred)**: Run `rendercv` logic in Pyodide to convert YAML -> Typst, then Typst WASM -> PDF. - **Option B (Fallback)**: Lightweight Hono API endpoint converts YAML -> Typst, returns Typst code to frontend for WASM rendering.
  **Rationale**:
- Zero server latency for "10x" feel.
- Reduces server CPU/Memory costs (user constraints).
- Enables offline capability.

### 3. Plotting Pipeline: In-Memory Bridge

**Decision**: Use Pyodide to generate SVG/PNG plots, pass binary data directly to Typst WASM virtual filesystem.
**Flow**:

1. User executes Python code in Browser (Pyodide).
2. Pyodide returns SVG string/bytes.
3. React app injects bytes into Typst Compiler's `vfs` (Virtual File System) at `images/plot.svg`.
4. Typst template references `#image("images/plot.svg")`.
   **Rationale**:

- Seamless integration.
- No upload/download roundtrip needed for preview.

### 4. Storage & Persistence: Cloudflare R2

**Decision**: Use R2 for storing user assets (images) and final PDF artifacts.
**Rationale**:

- S3 Compatible (easy to switch if needed).
- Zero egress fees (crucial for students downloading docs).
- User requirement compliant.

### 5. API Schema & Validation: Hono Zod OpenAPI

**Decision**: Use `@hono/zod-openapi` for backend route definitions.
**Rationale**:

- **Code-First Source of Truth**: Defines validation logic (Zod) and documentation (OpenAPI) in a single place.
- **Client Generation**: Enables auto-generating typesafe clients for the frontend, ensuring sync between UI and API.
- **User Request**: Explicitly requested by user.

## Unresolved / Risks

- **RenderCV in Pyodide**: Not verified if `rendercv` package has non-pure-Python dependencies (other than Typst binary) that block Pyodide support.
  - _Mitigation_: If Pyodide fails, use the Dockerized Hono API for the YAML->Typst conversion step (very lightweight).

## References

- RenderCV Docs: https://github.com/sinaatalay/rendercv
- Typst WASM: https://github.com/Myriad-Dreamin/typst.ts
