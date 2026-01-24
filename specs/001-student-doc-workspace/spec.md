# Feature Specification: Student Document Workspace & Builders

**Feature Branch**: `001-student-doc-workspace`
**Created**: Sat Jan 24 2026
**Status**: Draft
**Input**: User description provided in prompt.

## Clarifications

### Session 2026-01-24

- Q: How should user API keys be stored? → A: Encrypted in database (server-side).
- Q: Where should user uploaded resources be stored? → A: Cloudflare R2 (S3 compatible).
- Q: How should the document preview update? → A: Automatic live preview with debouncing (~1s delay).
- Q: How should Python plotting code be executed? → A: Client-side using Pyodide (WebAssembly).
- Q: Which AI providers must be supported? → A: OpenAI-compatible APIs, with Gemini as a first-class supported provider.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create & Edit Resumes (Priority: P1)

As a student, I want to create a professional resume using a simple YAML-based editor so that I can focus on content rather than formatting.

**Why this priority**: Core value proposition for "10x students" to quickly generate high-quality CVs.

**Independent Test**: Can be tested by creating a new resume, entering valid YAML data, and verifying the PDF preview updates correctly.

**Acceptance Scenarios**:

1. **Given** a logged-in student on the Resume page, **When** they enter valid YAML data describing their experience, **Then** the right-hand preview pane updates to show the rendered PDF.
2. **Given** a student editing a resume, **When** they make a syntax error in YAML, **Then** the system provides a helpful error message without crashing.
3. **Given** a completed resume, **When** the student clicks "Download", **Then** a PDF file is downloaded to their device.

---

### User Story 2 - General Document Creation with AI (Priority: P1)

As a student, I want to generate academic documents (reports, homework) by combining text and images using AI or manual Typst input.

**Why this priority**: Enables the broad range of academic deliverables beyond resumes.

**Independent Test**: Create a general document, add text/images, and verify final output generation.

**Acceptance Scenarios**:

1. **Given** the General Documents page, **When** I input text and upload images with descriptions, **Then** the AI assistant organizes them into a structured document.
2. **Given** an uploaded image, **When** I provide a name and description, **Then** the AI places it relevantly within the generated text context.
3. **Given** manual mode, **When** I type Typst code, **Then** the preview renders the formatted document.
4. **Given** data requiring visualization, **When** I request a plot, **Then** the system generates a chart (via Python/Typst) and embeds it.

---

### User Story 3 - Workspace Management (Priority: P2)

As a student, I want a central workspace to manage all my documents and resources so that I can stay organized.

**Why this priority**: Essential for managing multiple projects/assignments over time.

**Independent Test**: Create, rename, delete, and list multiple documents in the workspace.

**Acceptance Scenarios**:

1. **Given** the Workspace dashboard, **When** I log in, **Then** I see a list of my saved resumes and general documents.
2. **Given** the resource manager, **When** I upload an image or asset, **Then** it is stored and available for use in any document.
3. **Given** the settings, **When** I enter my personal AI API key, **Then** it is securely saved for future generation tasks.

### Edge Cases

- What happens when the user's AI API Key is invalid or runs out of credits? (System should handle error gracefully and prompt user).
- What happens when a generated PDF is too large for the previewer?
- What happens if the Pyodide environment fails to load or crashes the browser tab?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to authenticate (Sign Up, Sign In, Sign Out).
- **FR-002**: System MUST provide a dedicated "Resume Builder" page with a split-view (YAML Editor left, PDF Preview right).
- **FR-003**: System MUST transform YAML resume data into PDF using a resume rendering engine with debounced live preview (updates automatically after typing stops).
- **FR-004**: System MUST provide a "General Document" page with a split-view (Editor left, Preview right) using Typst.
- **FR-005**: System MUST support "AI Assistant" mode where users provide unstructured text/images and the system generates structured Typst code.
- **FR-006**: System MUST provide templates for different document use cases (e.g., reports, homework).
- **FR-007**: System MUST allow users to upload images with metadata (name, description) for AI context awareness.
- **FR-008**: System MUST generate charts and plots from data provided in the document using client-side Python execution (Pyodide/WASM).
- **FR-009**: Users MUST be able to input and manage their own AI Provider API Keys (OpenAI-compatible) to cover generation costs. System MUST support Google Gemini as a first-class provider. Keys MUST be stored encrypted at rest.
- **FR-010**: System MUST persist user documents and resources to Cloudflare R2 (S3 compatible) storage.

### Key Entities

- **Student**: Authenticated user.
- **Document**: Base entity for any work item (Resume or General).
- **Resource**: Uploaded files (images, data files) associated with a student/document.
- **API Key**: User-provided credential for AI services.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Resume preview updates within 3 seconds of valid YAML change (including debounce time).
- **SC-002**: AI generates a first-draft document from inputs (approx. 500 words) in under 15 seconds.
- **SC-003**: System supports simultaneous storage of at least 1GB of resources per student (or reasonable quota) using secure file storage.
- **SC-004**: 100% of generated documents are downloadable as standard PDF files.
