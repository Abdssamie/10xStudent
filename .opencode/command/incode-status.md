# /incode-status - Dashboard (The Pulse)

## Purpose
Visual overview of project health and progress.

## Workflow

### 1. OVERVIEW
Run `incode scan --format table`.
See the full list of active tasks.

### 2. BLOCKERS
Run `incode scan --holes`.
Identify which high-priority items are stalled at 0%.

### 3. REVIEW QUEUE
Look for items at `@progress: 95`.
These are waiting for User Approval or Final QA.

## Legend
*   **0%**: Plan Only (Hole).
*   **50%**: In Progress.
*   **80%**: Feature Complete (Unverified).
*   **95%**: Verified (Ready for Review).
*   **100%**: Done.
