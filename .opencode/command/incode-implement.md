# /incode-implement - Execute & Verify (The Flesh)

## Purpose
Implement a single "Hole" (Metadata Block) following the Hybrid Protocol.

## The Prime Directive
**THE 80% WALL.**
You cannot progress past 80% without self-verifying against the `@checklist`.

## Workflow

### 1. SELECT
Run `/incode-next` or `incode scan --ready` to find a valid target.
*   Target MUST have `@progress: 0` (or <100).
*   Target MUST have satisfied `@deps` (>90%).

### 2. PREPARE
*   **Read Directive:** Understand the `@directive`.
*   **Load Context:** Read the linked Spec file in `@context`.
*   **Global Context:** **ALWAYS** read `specs/constitution.md`. Your code MUST adhere to the Constitution.
*   **Load Skills:** Activate tools listed in `@skills`.

### 3. IMPLEMENT (0% -> 80%)
Write the code to satisfy the `@directive`.
*   **Update Progress:** Set `@progress: 50` when basic logic is done.
*   **Stop:** Pause at `@progress: 80`. Implementation is "Feature Complete" but unverified.

### 4. VERIFY (80% -> 95%)
Review your code against the `@checklist`.
*   **Check:** "Does my code satisfy checklist item X?"
*   **Fix:** If No, fix the code.
*   **Advance:**
    *   **85%**: Self-review passed.
    *   **90%**: Linter/Types pass.
    *   **95%**: Tests pass (if applicable).

### 5. FINALIZE (100%)
*   Only set `@progress: 100` if the User approves or CI/CD tests pass.

## Example Update
```typescript
/**
 * @id: auth-service
 * ...
 * @progress: 95
 * @checklist: [ ... ]
 */
```
