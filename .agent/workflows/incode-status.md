# /incode-status - Project Health Dashboard

## Purpose
Get an overview of project progress, identify blockers, and see what needs attention.

## When to Use
- At the start of a session to understand project state
- After completing major components
- When planning next steps
- When user asks "what's the status?"

## Workflow

### Step 1: Overall Progress
```bash
incode scan --format json
```

Calculate:
- Total metadata blocks
- Holes (progress = 0)
- In progress (0 < progress < 95)
- Production-ready (progress >= 95)
- Complete (progress = 100)

### Step 2: Priority Breakdown
```bash
incode scan --group-by priority
```

Shows:
- High priority items and their progress
- Medium priority items and their progress
- Low priority items and their progress

### Step 3: Identify Blockers
```bash
incode scan --holes
```

For each hole, check if it's blocking others:
- Find components that depend on this hole
- Highlight critical path items

### Step 4: Find Ready Work
```bash
incode scan --ready
```

Shows holes that can be implemented right now (no blocking deps)

### Step 5: Validation Issues
```bash
incode scan --validate
```

Count and categorize warnings:
- Broken cross-references
- Invalid metadata
- Missing tests

## Example Output

```
📊 Incode Project Status
========================

Overall Progress:
  Total Components: 15
  🕳️  Holes (0%): 5
  🚧 In Progress (1-94%): 3
  ✅ Production Ready (95-99%): 4
  ✔️  Complete (100%): 3

Priority Breakdown:
  🔴 High Priority: 8 items
     - 2 holes
     - 3 in progress
     - 3 complete
  
  🟡 Medium Priority: 5 items
     - 2 holes
     - 1 in progress
     - 2 complete
  
  🟢 Low Priority: 2 items
     - 1 hole
     - 1 complete

Ready to Implement:
  ✅ token-validator (high priority, no deps)
  ✅ user-model (high priority, no deps)

Blocked Holes:
  ⛔ auth-service (waiting for: token-validator, user-model)
  ⛔ auth-repository (waiting for: user-model, database-connection)

Validation Issues:
  ⚠️  3 warnings found
     - 2 broken cross-references
     - 1 invalid ID format

Next Steps:
  1. Implement token-validator (ready, high priority)
  2. Implement user-model (ready, high priority)
  3. Fix validation warnings
```

## Metrics to Track

### Completion Rate
```
(Production Ready + Complete) / Total Components * 100
```

### Blocker Count
Number of holes with unmet dependencies

### Test Coverage
```
Components with tests / Components requiring tests * 100
```

### High Priority Progress
```
High priority complete / Total high priority * 100
```

## Important Rules

1. **Show honest metrics** - Don't inflate progress
2. **Highlight blockers** - Make critical path visible
3. **Prioritize ready work** - Show what can be done now
4. **Track validation issues** - Don't ignore warnings

## Status Indicators

### Health Indicators
- 🟢 **Healthy**: >70% production-ready, <3 blockers, no validation errors
- 🟡 **Needs Attention**: 40-70% production-ready, 3-5 blockers, <5 validation errors
- 🔴 **Critical**: <40% production-ready, >5 blockers, >5 validation errors

### Progress Symbols
- 🕳️ Hole (0%)
- 🚧 In Progress (1-94%)
- ✅ Production Ready (95-99%)
- ✔️ Complete (100%)

## Next Steps

Based on status:
- If holes are ready → Use `/incode-next` to start implementing
- If blockers exist → Implement dependencies first
- If validation issues → Fix warnings before continuing
- If mostly complete → Review and test remaining items
