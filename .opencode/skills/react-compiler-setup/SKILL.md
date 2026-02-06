---
name: react-compiler-setup
description: Installation and configuration guide for React Compiler including Babel, bundler setups, and ESLint integration. Use when setting up new React projects or adding the compiler to existing ones.

---

# React Compiler Setup

Complete guide for installing and configuring React Compiler in your project. The compiler automatically optimizes React components by memoizing them when you follow the Rules of React.

## When to Use

- When setting up a new React project
- When adding React Compiler to an existing project
- When configuring build tools (Vite, Next.js, Webpack, etc.)
- When setting up ESLint for React development
- When troubleshooting compiler installation issues

## Prerequisites

**Recommended**: React 19 and React DOM 19

**Supported**: React 17, 18, or 19 (with react-compiler-runtime)

The compiler works with any React version 17+, but React 19 provides the best experience.

## Installation

### Step 1: Install Compiler Package

```bash
# npm
npm install -D babel-plugin-react-compiler

# yarn
yarn add -D babel-plugin-react-compiler

# pnpm
pnpm add -D babel-plugin-react-compiler
```

### Step 2: Install ESLint Plugin (REQUIRED)

The ESLint plugin catches violations of the Rules of React that would break the compiler:

```bash
# npm
npm install -D eslint-plugin-react-compiler

# yarn
yarn add -D eslint-plugin-react-compiler

# pnpm
pnpm add -D eslint-plugin-react-compiler
```

## ESLint Configuration

Add the React Compiler plugin to your ESLint config:

```javascript
// eslint.config.js
import reactCompiler from 'eslint-plugin-react-compiler'

export default [
  {
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
]
```

**What the ESLint plugin catches:**

- Violations of Rules of Hooks (calling Hooks conditionally, in loops, etc.)
- Mutations of props, state, or Hook values
- Side effects during render
- Breaking the Rules of React that prevent compiler optimization

This plugin is ESSENTIAL. It prevents bugs and ensures the compiler can optimize your code.

## Babel Configuration

**CRITICAL**: The React Compiler plugin must run FIRST in your Babel plugin chain.

```javascript
// babel.config.js
const ReactCompilerConfig = { /* ... */ };

module.exports = function () {
  return {
    plugins: [
      ['babel-plugin-react-compiler', ReactCompilerConfig], // MUST be first!
      // Other plugins...
    ],
  };
};
```

## Bundler-Specific Setup

### Vite

```javascript
// vite.config.js
import react from '@vitejs/plugin-react'

export default gins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
  ],
}
```

### Next.js

Next.js 15+ has built-in support:

```javascript
// next.config.js
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

module.exports = nextConfig;
```

### Remix (Vite)

```javascript
// vite.config.js
import { vitePlugin as remix } from "@remix-run/dev";

export default defineConfig({
  plugins: [
    remix({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
  ],
});
```

### Webpack

```javascript
// webpack.config.js
const ReactCompilerConfig = { /* ... */ };

module.exports = {
  module: {
    rules: [
      {
        test: /\.[mc]?[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              ['babel-plugin-react-compiler', ReactCompilerConfig],
            ],
          },
        },
      },
    ],
  },
};
```

### Expo (Metro)

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-babel-transformer');

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Add React Compiler
config.transformer.babelTransformerPath = require.resolve('./customBabelTransformer.js');

module.exports = config;
```

```javascript
// customBabelTransformer.js
const upstreamTransformer = require('metro-react-native-babel-transformer');

module.exports.transform = function ({ src, filename, options }) {
  return upstreamTransformer.transform({
    src,
    filename,
    options: {
      ...options,
      plugins: [
        ['babel-plugin-react-compiler', {}],
        ...(options.plugins || []),
      ],
    },
  });
};
```

### Rspack

```javascript
// rspack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        loader: 'swc-loader',
        options: {
          jsc: {
            experimental: {
              plugins: [
                ['babel-plugin-react-compiler', {}],
              ],
            },
          },
        },
      },
    ],
  },
};
```

### Rsbuild

```javascript
// rsbuild.config.js
export default {
  tools: {
    swc: {
      jsc: {
        experimental: {
          plugins: [
            ['babel-plugin-react-compiler', {}],
          ],
        },
      },
    },
  },
};
```

## Verification

### Check React DevTools

After setup, verify the compiler is working:

1. Open React DevTools in your browser
2. Look for components with a "Memo ✨" badge
3. This badge indicates the component was optimized by React Compiler

### Check Build Output

Look for the compiler runtime in your build output:

```
react-compiler-runtime
```

 see this, the compiler is active.

## Opting Out

To opt out specific components or files from compilation:

```javascript
// Opt out a single component
function MyComponent() {
  'use no memo';
  // Component code...
}

// Opt out a custom Hook
function useMyHook() {
  'use no memo';
  // Hook code...
}
```

Use this sparingly, only when the compiler causes issues with specific code.

## Compiler Configuration Options

```javascript
const ReactCompilerConfig = {
  // Compile only specific directories
  sources: (filename) => {
    return filename.indexOf('src/path/to/dir') !  },
  
  // Compilation mode
  compilationMode: "annotation", // or "all" (default)
  
  // Enable/disable optimization
  panicThreshold: "all_errors", // or "none", "all_warnings"
};
```

**compilationMode options:**

- `"all"` (default): Compile all components and Hooks
- `"annotation"`: Only compile components/Hooks with `"use memo"` directive

## Common Issues

**Compiler not running:**

- Verify Babel plugin is FIRST in plugin chain
- Check ESLint for Rules of React violations
- Ensure React version is 17+

**No "Memo ✨" badge:**

- Component may violate Rules of React
- Check ESLint output for errors
- Try adding `"use memo"` directive to test

**Build errors:**

- Update to latest babel-plugin-react-compiler
- Check Babel configuration syntax
- Verify bundler-specific setup is correct

## Questions to Ask

- What bundler are you using (Vite, Next.js, Webpack, etc.)?
- What React version is your project using?
- Have you installed and configured the ESLint plugin?
- Are you seeing the "Memo ✨" badge in React DevTools?
- Are there any ESLint errors related to Rules of React?

## Additional Resources

- Installation Guide: https://react.dev/learn/react-compiler#installation
- ESLint Plugin: https://www.npmjs.com/package/eslint-plugin-react-compiler
- React Compiler Playground: https://playground.react.dev/