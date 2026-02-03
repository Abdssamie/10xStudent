# Incode OpenCode Commands

This directory contains OpenCode command templates for the Incode workflow. These commands guide AI agents through holes-driven development.

> **Important:** Incode is **language-agnostic**. While examples may show specific languages for illustration, Incode works with any programming language (JavaScript, TypeScript, Python, C#, Java, Go, Rust, PHP, Ruby, etc.). The metadata format remains consistent across all languages.

## Available Commands

### 1. `/incode-start` - Create Architecture Holes
**Purpose:** Guide agents to create architecture holes (interfaces, types, function signatures) before implementation.

**When to use:**
- Starting a new feature from scratch
- User requests: "implement X", "add Y feature", "build Z"

**Key principles:**
- Always create holes first (architecture-first approach)
- Use kebab-case IDs
- Reference existing IDs in `@deps` and `@tests`
- Only use skills from available toolkit

---

### 2. `/incode-next` - Find Next Task
**Purpose:** Identify which hole should be implemented next based on dependencies and priorities.

**When to use:**
- After creating architecture holes
- When you finish implementing a component
- When unsure what to work on next

**Key principles:**
- Only implement ready holes (no blocking deps)
- Prioritize by: priority → dependencies → complexity
- Verify all deps are at 90%+ progress

---

### 3. `/incode-implement` - Implement a Hole
**Purpose:** Guide agents through implementing a specific hole.

**When to use:**
- After identifying a ready hole with `/incode-next`
- When explicitly asked to implement a specific component

**Key principles:**
- Follow the architecture defined in the hole
- Use skills specified in `@skills` array
- Update `@progress` honestly based on confidence
- Implement tests if `@tests` is specified

**Progress guidelines:**
- `0` = Hole (not started)
- `50` = Basic implementation, incomplete
- `90` = Acceptable, main functionality works
- `95` = Production-ready, handles edge cases
- `100` = Complete with tests (if applicable)

---

### 4. `/incode-validate` - Validate Implementation
**Purpose:** Verify that implementation matches specification and is truly complete.

**When to use:**
- After implementing a component
- Before marking `@progress: 100`
- When reviewing code quality
- When user reports a bug

**Key principles:**
- Run `incode scan --validate` first
- Verify all spec requirements are met
- Check tests exist and pass (if applicable)
- Lower progress if issues found

---

### 5. `/incode-status` - Project Health Dashboard
**Purpose:** Get overview of project progress, identify blockers, and see what needs attention.

**When to use:**
- At the start of a session
- After completing major components
- When planning next steps
- When user asks "what's the status?"

**Key principles:**
- Show honest metrics
- Highlight blockers and critical path
- Identify ready work
- Track validation issues

---

## Workflow Overview

```
User Request: "Add user authentication"
              ↓
    [/incode-start]
    Create architecture holes:
    - user-model (progress: 0)
    - auth-service (progress: 0)
    - token-validator (progress: 0)
    - auth-repository (progress: 0)
    - *-tests holes
              ↓
    [/incode-next]
    Find ready holes:
    - user-model (no deps)
    - token-validator (no deps)
              ↓
    [/incode-implement user-model]
    Implement user-model
    Update progress: 0 → 100
              ↓
    [/incode-next]
    Find next ready hole:
    - token-validator (no deps)
    - auth-repository (user-model complete)
              ↓
    [/incode-implement token-validator]
    Implement token-validator
    Update progress: 0 → 95
              ↓
    [/incode-validate token-validator]
    Verify implementation
    Implement tests
    Update progress: 95 → 100
              ↓
    [/incode-status]
    Check project health
    Identify remaining work
              ↓
    Repeat until all holes filled
```

## Core Principles

### 1. Architecture First
Always create holes (interfaces, types, signatures) before implementation. Never implement directly.

### 2. Holes-Driven Development
- `@progress: 0` = Hole (unimplemented)
- `@progress: 90` = Acceptable
- `@progress: 95` = Production-ready
- `@progress: 100` = Complete with tests

### 3. Dependency Management
- Always implement dependencies before dependents
- Use `@deps` to track blockers
- Verify deps are at 90%+ before starting

### 4. Skills-Based Implementation
- Declare skills in `@skills` array
- Only use skills from available toolkit
- Follow patterns specified by skills

### 5. Test Coverage
- Business logic requires tests
- Data models/interfaces don't need tests
- Reference test blocks by ID in `@tests`

### 6. Honest Progress Tracking
- Update `@progress` based on confidence, not wishful thinking
- Lower progress if issues are found
- Don't mark 100 without tests (if applicable)

## Validation Rules

### ID Format
- Must be kebab-case: `user-service`, `api-v2`
- Not camelCase, snake_case, or spaces

### Cross-References
- All `@deps` must reference existing IDs
- All `@tests` must reference existing IDs
- Incode validates and warns about broken references

### Progress Values
- Must be integer 0-100
- Reflects confidence in completeness
- Can go down if issues are found

## Common Mistakes to Avoid

❌ **Don't implement without creating holes first**
❌ **Don't mark progress too optimistically**
❌ **Don't leave stub implementations and mark high progress** - Stubs are only for holes at `@progress: 0`
❌ **Don't implement only happy paths**
❌ **Don't forget to implement tests (if applicable)**
❌ **Don't use skills not in your toolkit**
❌ **Don't implement blocked holes (check deps first)**
❌ **Don't worry about LSP/compiler errors in holes** - They're expected and will resolve when implemented

## Integration with OpenCode

These commands are designed to be used with OpenCode's skill system:

1. **Add commands to your OpenCode config**
2. **Agents can invoke commands when needed**
3. **Commands guide agents through the workflow**
4. **Agents follow the prompts step-by-step**

## Example Session

```
User: "Add user authentication to the app"

Agent: I'll use /incode-start to create the architecture first.

[Creates holes for user-model, auth-service, token-validator, etc.]

Agent: Architecture created. Let me check what's ready to implement.

[Uses /incode-next, finds user-model and token-validator are ready]

Agent: I'll start with user-model since other components depend on it.

[Uses /incode-implement user-model, creates the type, marks progress: 100]

Agent: user-model complete. Next is token-validator.

[Uses /incode-implement token-validator, implements the class, marks progress: 95]

Agent: Let me validate the implementation.

[Uses /incode-validate token-validator, implements tests, marks progress: 100]

Agent: token-validator complete. Let me check project status.

[Uses /incode-status, sees auth-repository is now ready]

Agent: Continuing with auth-repository...

[Repeats until all holes are filled]
```

## Success Criteria

An agent successfully uses Incode when:
- ✅ Creates architecture holes before implementing
- ✅ Implements dependencies before dependents
- ✅ Updates progress honestly
- ✅ Writes tests for business logic
- ✅ Validates implementations before marking complete
- ✅ Uses only available skills
- ✅ Follows kebab-case naming
- ✅ Maintains valid cross-references

---

**Built for reliable AI-driven development** 🤖✨
