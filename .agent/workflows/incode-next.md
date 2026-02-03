---
description: Identify which hole should be implemented next based on dependencies and priorities.
---

## When to Use
- After creating architecture holes with `/incode-start`
- When you finish implementing a component
- When you're unsure what to work on next

## Workflow

### Step 1: Scan for Ready Holes
```bash
incode scan --ready --format table
```

This shows holes with:
- `@progress: 0` (unimplemented)
- No blocking dependencies (all deps are complete or don't exist)

### Step 2: Prioritize
If multiple holes are ready, choose based on:
1. **Priority** - High priority first
2. **Dependencies** - Components that others depend on
3. **Complexity** - Start with simpler components

### Step 3: Verify Dependencies
Before implementing, check that all `@deps` are at acceptable progress:
```bash
incode scan --format json | grep <dep-id>
```

Ensure dependencies are at `@progress: 90+` (acceptable/production-ready)

### Step 4: Check Skills
Verify you have the required skills in your toolkit:
- Read the `@skills` array
- Confirm each skill is available
- If missing, ask user or create the skill

## Example

```bash
# Find ready holes
$ incode scan --ready

## token-validator
**Priority:** 🔴 high
**Progress:** ░░░░░░░░░░ 0%
**Description:** JWT token validation and generation utility
**Skills:** typescript, jwt

## user-model
**Priority:** 🔴 high
**Progress:** ░░░░░░░░░░ 0%
**Description:** User data model
**Skills:** typescript
```

**Decision**: Implement `user-model` first because:
- High priority
- No dependencies
- Simple (just a type definition)
- Other components depend on it

## Important Rules

1. **Never implement blocked holes** - Always check `@deps` first
2. **Respect dependency order** - Implement dependencies before dependents
3. **Verify skills availability** - Don't start if you lack required skills
4. **Check progress confidence** - Dependencies should be at 90%+ before you start

## Next Steps

After identifying the next task:
- Use `/incode-implement <id>` to start implementation
