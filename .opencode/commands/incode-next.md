# /incode-next - Orchestrate (The Brain)

## Purpose
Find the next optimal task to execute based on the Dependency Graph.

## Workflow

### 1. SCAN
Run `incode scan --ready --format table`.
This filters for:
*   Holes (`@progress < 100`).
*   Unblocked (`@deps` are all >90%).

### 2. PRIORITIZE
Select the next task based on:
1.  **Priority:** High > Medium > Low.
2.  **Dependencies:** Items that block many other items.
3.  **Skills:** Do you have the required `@skills` loaded?

### 3. EXECUTE
Call `/incode-implement <id>` on the selected task.

## Troubleshooting
*   **No Ready Tasks?**
    *   Check `incode scan --holes`.
    *   Are you blocked by a dependency? -> Implement the dependency.
    *   Are circular dependencies present? -> Refactor the plan.
