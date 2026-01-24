# Workflow Guide: Working with Speckit & Beads

This guide simplifies your development workflow into a repeatable, context-safe cycle. You don't need to memorize the project state—the tools do that for you.

## The Core Loop

Every time you sit down to work (or restart a session), follow this exact loop:

### 1. Start Session (Recover Context)

_Goal: Figure out what to do without reading 50 files._

1.  **Check Available Work**:
    ```bash
    bd ready
    ```

    - This lists unblocked issues.
2.  **Pick a Task**:
    - Select an ID from the list (e.g., `10xStudent-s4r`).
    - **Shortcut**: Just tell the AI "Start the Hono task" - it will find the ID for you.
3.  **Claim It**:
    ```bash
    bd update <ID> --status in_progress
    ```
4.  **Review the Plan** (If you forgot the tech details):
    - Ask the AI: _"Read the implementation plan for the current feature."_

### 2. Execute Work (Code)

_Goal: Write code for ONE task._

1.  **Do the Work**:
    - Run tests, write code, verify.
2.  **Verify Quality**:
    - Run linting/tests locally.

### 3. End Task (Save State)

_Goal: Update the "Project Manager" so the next session knows what happened._

1.  **Commit Code**:
    ```bash
    git add .
    git commit -m "feat: description of work"
    ```
2.  **Close Issue**:
    ```bash
    bd close <ID>
    ```
3.  **Sync**:
    ```bash
    bd sync
    git push
    ```

---

## "How Do I...?" (Cheat Sheet)

### ...Refer to a task without the complex ID?

**Just describe it.**

- _You:_ "Start working on the database schema task."
- _AI:_ "Found task `10xStudent-abc`: 'Initialize Schema'. Updating status to in_progress..."

### ...Change the requirements?

**The Spec is a living document.**

- _Small Tweak:_ "Update `spec.md` to change the debounce time to 500ms."
- _New Feature:_ "I want to add Google Login. Update the spec and create a new task for it."

### ...Know what beads commands to run?

**You usually don't need to.**

- **`bd ready`**: Run this to see your menu.
- **`bd sync`**: Run this to save your progress.
- _Everything else:_ Tell the AI "Close the current task" or "Create a bug ticket".

### ...Understand "Blockers"?

**Red Light / Green Light.**

- Beads hides future tasks (Phase 3) until prerequisites (Phase 1) are done.
- If `bd ready` looks empty, check `bd blocked` to see what is waiting.

---

## The "New Feature" Workflow

When you want to build something brand new (like we just did), follow this linear path:

1.  **Specify**: Tell the AI what you want.
    - Command: `/speckit.specify`
    - _Result_: Creates `spec.md`.
2.  **Clarify**: Answer the AI's questions to fix ambiguities.
    - Command: `/speckit.clarify`
    - _Result_: Updates `spec.md`.
3.  **Plan**: Let the AI design the architecture.
    - Command: `/speckit.plan`
    - _Result_: Creates `plan.md` and `research.md`.
4.  **Decompose**: Break the plan into small tasks.
    - Command: `/speckit.tasks`
    - _Result_: Creates `tasks.md`.
5.  **Bridge**: Move tasks to the "Job Board" (Beads).
    - _Action_: Ask AI: "Create bd issues for Phase 1".

---

## Your Safety Net

- **Beads (`bd`)** holds the **Status** (What is done, what is next).
- **Git** holds the **Code**.
- **Speckit (`specs/`)** holds the **Architecture**.

**You are safe.** If you lose connection, crash, or take a vacation, just type `bd ready` when you return.
