# Skill Fixes Required

## Critical Typos to Fix in typst-wasm-codemirror/SKILL.md

### Fix 1: Line 142 - Web Worker Initialization

**Current:**

```typescript
if (type === 'init') {ompiler = createTypstCompiler();
```

**Fixed:**

```typescript
if (type === 'init') {
  compiler = createTypstCompiler();
```

---

### Fix 2: Line 172 - Web Worker Message Handler

**Current:**

```typescript
worker.onmessageasync (e) => {
```

**Fixed:**

```typescript
worker.onmessage = async (e) => {
```

---

### Fix 3: Line 339 - Event Listener Typo

**Current:**

```typescript
.addEventLtener("focus", loadTypst, { once: true });
```

**Fixed:**

```typescript
.addEventListener("focus", loadTypst, { once: true });
```

---

### Fix 4: Line 93 - Documentation Typo

**Current:**

```
| **$typst Snippet**    | High-level convenienck prototypes, simple use cases  |
```

**Fixed:**

```
| **$typst Snippet**    | High-level convenience API for quick prototypes, simple use cases  |
```

---

### Fix 5: Line 377 - Table Entry Typo

**Current:**

```
| Noctor data                       | Recompiling for each format            |
```

**Fixed:**

```
| Not caching vector data           | Recompiling for each format            |
```

---

### Fix 6: Line 271 - Variable Name

**Current:**

```typescript
await $typst.addSource("/template.typ", tContent);
```

**Fixed:**

```typescript
await $typst.addSource("/template.typ", templateContent);
```

---

## How to Apply Fixes

1. Open `/home/abdssamie/ChemforgeProjects/10xStudent/.opencode/skills/typst-wasm-codemirror/SKILL.md`
2. Apply each fix at the specified line number
3. Save the file
4. Re-run verification to confirm fixes

## Impact Summary

- **3 Critical Syntax Errors** - Would prevent code from running
- **2 Documentation Typos** - Reduce clarity
- **1 Variable Name Issue** - Minor confusion

All fixes are simple text corrections that will make the skill production-ready.
