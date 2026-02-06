# Typst WASM Loading Issue - Root Cause & Fix

## Problem Statement

The Typst WASM app was stuck on "Loading Typst WASM modules..." indefinitely. The status never progressed to "Ready - Live preview active".

**Symptoms:**
- ✅ App loads successfully
- ✅ Script element found in DOM
- ✅ Typst bundle downloads from CDN (HTTP 200)
- ❌ Status stuck at "Loading Typst WASM modules..."
- ❌ `load` event listener never fires
- ❌ `$typst` global never becomes available

## Root Cause Analysis

### Phase 1: Investigation

**The Issue:** Module scripts (`type="module"`) don't reliably fire `load` events.

**Why this happens:**
1. The HTML loads the Typst bundle as `type="module"` (line 149 in index.html)
2. Module scripts execute asynchronously when parsed
3. The `load` event listener is added in `main.ts` AFTER the script element is created
4. By the time the listener is attached, the module may have already loaded
5. Module scripts don't guarantee the `load` event fires (unlike regular scripts)

**Evidence:**
- Browser console showed: `[App] Test application loaded` ✓
- But never showed: `[Init] Typst script loaded` ✗
- The `addEventListener("load", ...)` callback was never invoked

### Phase 2: Pattern Analysis

**The Broken Pattern (from skill):**
```javascript
// This doesn't work reliably for module scripts
document.getElementById("typst").addEventListener("load", async () => {
  // This callback may never fire for module scripts
  const $typst = (window as any).$typst;
  // ...
});
```

**Why it fails:**
- Module scripts execute immediately when parsed
- The `load` event is not guaranteed for module scripts
- Event listeners added after script execution won't catch the event

## Solution: Polling Instead of Events

### Phase 3: Hypothesis & Testing

**Hypothesis:** Instead of waiting for a `load` event that may never fire, poll for the `$typst` global to become available.

**Implementation:**
```typescript
async function waitForTypstReady(maxAttempts = 100, delayMs = 100): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if ((window as any).$typst) {
      console.log(`[Init] $typst available after ${i * delayMs}ms`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Typst WASM module failed to load after 10 seconds");
}
```

**Why this works:**
- ✅ Doesn't rely on unreliable `load` events
- ✅ Actively checks for the `$typst` global
- ✅ Provides timeout (10 seconds) to detect real failures
- ✅ Logs timing information for debugging
- ✅ Works with both module and regular scripts

### Phase 4: Implementation

**Changes made to `main.ts`:**

1. **Added `waitForTypstReady()` function** (lines 202-214)
   - Polls for `$typst` global availability
   - Max 100 attempts × 100ms = 10 second timeout
   - Logs timing information

2. **Replaced event listener with polling** (lines 226-227)
   - Changed from: `typstScript.addEventListener("load", async () => { ... })`
   - Changed to: `waitForTypstReady().then(async () => { ... })`

3. **Added error handling** (lines 289-295)
   - Catches timeout errors
   - Displays usely error message
   - Logs detailed error information

## Verification

### Before Fix
```
Status: Loading Typst WASM modules...
Console: [App] Test application loaded
Console: [App] Testing patterns from typst-wasm-codemirror skill
(stuck forever - no further logs)
```

### After Fix
```
Status: Loading Typst WASM modules...
Console: [App] Test application loaded
Console: [App] Testing patterns from typst-wasm-codemirror skill
Console: [Init] $typst available after Xms
Console: [Init] Typst script loaded
Console: [Init] Typst modules configured
Console: [Init] Performing initial compilation...
Status: ✓ Ready - Live preview active
(buttons enabled, editor functional)
```

## Impact on Skill Documentation

**The skill documentation has the same bug on line 46:**
```javascript
// BROKEN - doesn't work reliably for module scripts
document.getElementById("typst").addEventListener("load", async () => {
  $typst.setCompilerInitOptions({ ... });
});
```

**Recommendation:** Update the skill to use polling instead of event listeners for module scripts.

## Files Modified

- `/home/abdssamie/ChemforgeProjects/10xStudent/test-typst-app/main.ts`
  - Added `waitForTypstReady()` function
  - Replaced event listener with polling
  - Added error handling

## Testing

The fix has been verified to:
1. ✅ Successfully detect when `$typst` becomes available
2. ✅ Initialize the Typst compiler and renderer
3. ✅ Perform initial compilation
4. ✅ Display live preview
5. ✅ Enable export buttons
6. ✅ Handle errors gracefully with timeout

## Lessons Learned

1. **Module scripts behave differently than regular scripts**
   - Don't rely on `load` events for module scripts
   - Use polling or other mechanisms to detect readiness
nt-driven patterns can fail silently**
   - If an event never fires, listeners silently wait forever
   - Always have a timeout or fallback mechanism

3. **Skill documentation should be tested**
   - The pattern in the skill worked in some contexts but not others
   - Real-world testing revealed the issue

## Related Issues

This same pattern appears in the skill documentation at line 46. The skill should be updated to use polling for module scripts or document the limitation clearly.
