# /incode-validate - QA (The Gatekeeper)

## Purpose
Verify that the codebase matches the Plan and the Spec.

## Workflow

### 1. SYNTAX CHECK
Run `incode scan --validate`.
*   Checks for broken `@deps`.
*   Checks for invalid IDs.
*   Checks for missing fields (`@directive`, `@context`).

### 2. LOGIC CHECK
For a specific component:
1.  Read the `@checklist`.
2.  Read the implementation.
3.  **Verify:** strictly check if every checklist item is handled.

### 3. CONTEXT CHECK
1.  Read the `@context` link.
2.  **Verify:** Does the code actually implement the design described in the doc?

## When to Run
*   Before marking a task as **100% Done**.
*   When "The 80% Wall" is hit.
*   If the User suspects a regression.
