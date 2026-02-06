# /incode-design - Blueprint the Feature

## Purpose
Translate a raw idea into a rigorous, testable Feature Specification (`specs/<feature>.md`).

## Workflow

### 1. ANALYZE
Read the User's input (natural language description).
*   Identify: **Actors**, **Actions**, **Data**, **Constraints**.
*   **Self-Correction:** If the user is vague (e.g., "make it secure"), assume standard industry best practices (e.g., "Use HTTPS/TLS, sanitize inputs") rather than asking trivial questions.

### 2. DRAFT
Create a file `specs/<kebab-feature-name>.md`.

**Structure:**
```markdown
# Feature: [Name]

## 1. Context
*   **Goal:** ...
*   **User Value:** ...

## 2. User Stories (Prioritized)
*   **P1:** As a [User], I want to [Action], so that [Benefit].
*   **P2:** ...

## 3. Functional Requirements (Testable)
*   **FR-01:** System MUST ...
*   **FR-02:** System MUST ...

## 4. Success Criteria (Measurable)
*   **SC-01:** Response time < 200ms.
*   **SC-02:** 0 Critical Bugs.

## 5. Edge Cases
*   What if network fails?
*   What if input is empty?
```

### 3. CLARIFY (The 3 Question Limit)
If critical information is missing, ask **Max 3** targeted questions.
*   *Bad Question:* "What color should the button be?" (Decide yourself or use defaults).
*   *Good Question:* "Should this support offline mode?" (Architectural impact).

### 4. FINALIZE
Update the spec with answers.
Ask user for final approval.
**Next Step:** Suggest running `/incode-start` to scaffold this spec.
