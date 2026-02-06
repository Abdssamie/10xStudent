# Typst WASM + CodeMirror Skill Verification Test

This is a test application to verify the patterns documented in the `typst-wasm-codemirror` skill.

## Patterns Tested

### ✅ Pattern 1: Basic Typst WASM Initialization (All-in-One Lite Bundle)

- **Skill Reference:** Lines 27-82
- **Implementation:** `index.html` (script tag) + `main.ts` (initialization)
- **Tests:** Loading CDN bundle, configuring compiler/renderer modules

### ✅ Pattern 2: CodeMirror 6 Editor Setup

- **Skill Reference:** Lines 282-303
- **Implementation:** `main.ts` (`initializeEditor` function)
- **Tests:** Editor creation, theme customization, update listeners

### ✅ Pattern 3: Debounced Live Preview

- **Skill Reference:** Lines 99-129
- **Implementation:** `main.ts` (`debouncedCompile` function)
- **Tests:** 300ms debounce, live compilation, error handling

### ✅ Pattern 4: Multi-Format Export

- **Skill Reference:** Lines 191-227
- **Implementation:** `main.ts` (`exportDocument` function)
- **Tests:** SVG export (download), PDF export (new tab)

### ✅ Pattern 5: Error Handling

- **Skill Reference:** Lines 344-368
- **Implementation:** `main.ts` (`safeCompile` function)
- **Tests:** Error parsing, line/column extraction, user feedback

### ⚠️ Pattern 6: Web Worker Compilation (Conceptual Test)

- **Skill Reference:** Lines 133-187
- **Implementation:** `main.ts` (`testWorkerPattern` function)
- **Tests:** Pattern structure verification (full implementation requires separate worker file)

## Installation & Running

```bash
# Install dependencies
npm install
# or
bun install

# Run development server
npm run dev
# or
bun run dev

# Build for production
npm run build
```

## Usage

1. **Edit the document** in the left panel (CodeMirror editor)
2. **See live preview** in the right panel (updates after 300ms)
3. **Export SVG** - Downloads SVG file
4. **Export PDF** - Opens PDF in new tab
5. **Test Worker** - Shows Web Worker pattern info

## Expected Behavior

- ✅ Editor loads with syntax highlighting
- ✅ Preview updates automatically while typing
- ✅ Compilation is debounced (300ms delay)
- ✅ SVG export downloads file
- ✅ PDF export opens in new tab
- ✅ Errors are displayed in preview panel
- ✅ Status updates show current state

## Verification Checklist

- [ ] Dependencies install without errors
- [ ] Application builds successfully
- [ ] Editor renders correctly
- [ ] Live preview works
- [ ] Debouncing prevents excessive compilation
- [ ] SVG export works
- [ ] PDF export works
- [ ] Error handling displays messages
- [ ] Console shows no critical errors
- [ ] All patterns match skill documentation

## Files

- `package.json` - Dependencies from skill
- `index.html` - HTML structure with CDN script
- `main.ts` - Main application implementing all patterns
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript configuration
- `README.md` - This file

## Notes

- Uses **All-in-One Lite Bundle** strategy (CDN resources)
- Follows **exact patterns** from skill documentation
- Includes **comments** linking to skill line numbers
- Tests **core functionality** without external dependencies
