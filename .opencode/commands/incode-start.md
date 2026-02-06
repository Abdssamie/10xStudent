# /incode-start - Plan & Scaffold (The Skeleton)

## Purpose
Translate a high-level Design (Markdown) into actionable Codebase Skeleton (Metadata Blocks).

## The Prime Directive
**PLAN = CODE.**
Do not create external task lists.
The "Plan" consists of file stubs containing **Metadata Blocks** (Holes).

## Workflow

### 1. READ (The Design)
Before running this command, ensure a Design Specification exists in `specs/*.md`.
*   Read the relevant spec file.
*   **CRITICAL:** Read `specs/constitution.md` to ensure architectural compliance.
*   Identify all logical units (components, classes, functions) needed.

### 2. DECOMPOSE (The Breakdown)
Break down the High-Level User Stories into Atomic Technical Units.
*   *Example:* Spec says "User Login".
*   *Breakdown:* `AuthService`, `UserEntity`, `LoginController`, `JwtProvider`.

### 3. SCAFFOLD (The Holes)
For each identified unit, create the file (if it doesn't exist) and add a **Metadata Block**.

**Syntax:**
```typescript
/**
 * @id: <kebab-case-id>
 * @priority: <high|medium|low>
 * @progress: 0
 * @directive: <imperative command to implement this unit>
 * @context: <path/to/spec.md#section-anchor>
 * @checklist: [
 *   "Requirement A from spec met",
 *   "Edge case B handled",
 *   "Unit tests pass"
 * ]
 * @deps: ["<dependency-id>"]
 * @skills: ["<required-skill>"]
 */
export const _hole = null; // Placeholder to make file valid
```

**Checklist Rule:** The `@checklist` must be **Specific to this Unit**. Do not copy the entire spec checklist. Filter for relevance.

### 4. VERIFY
Run `incode scan --holes` to confirm your plan is registered.

## Rules of Engagement
1.  **Granularity:** One Metadata Block per logical unit (File or Major Component).
2.  **Traceability:** `@context` MUST point to a specific section in the Spec.
3.  **Definition of Done:** Populate `@checklist` with explicit acceptance criteria from the Spec.
4.  **Dependencies:** Accurately list `@deps`. This defines the Execution Order.
