# /incode-constitution - Establish the Law

## Purpose
Create or update the project's Supreme Law (`specs/constitution.md`).
This file defines the non-negotiable technical and process principles that every Agent must follow.

## Workflow

### 1. INTERVIEW (The Drafting)
The Agent must interview the User to establish the core laws.
**Key Questions:**
1.  **Tech Stack:** What languages, frameworks, and tools are mandatory? (e.g., "TypeScript, React, Bun")
2.  **Testing Strategy:** What is the testing philosophy? (e.g., "TDD", "Integration over Unit", "No mocks")
3.  **Architecture:** What are the architectural boundaries? (e.g., "Hexagonal", "Feature-First", "No circular deps")
4.  **Style:** What are the coding standards? (e.g., "Functional", "OOP", "Airbnb Style")

### 2. GENERATE (The Artifact)
Create `specs/constitution.md` using the collected answers.

**Template Structure:**
```markdown
# Project Constitution

## 1. Technical Stack
*   **Language:** ...
*   **Frameworks:** ...

## 2. Core Principles
*   **Principle A:** ...
*   **Principle B:** ...

## 3. The Incode Protocol
*   **Spec-First:** No code without a Spec (`specs/*.md`).
*   **Plan-In-Code:** No implementation without a Metadata Block.
*   **Verification:** No completion without Checklist verification.
```

### 3. RATIFY
Ask the user to review and confirm the Constitution.
Once ratified, this file becomes **Global Context** for all future operations.
