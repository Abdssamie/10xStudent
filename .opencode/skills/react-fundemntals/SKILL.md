---
name: react-fundamentals
description: Core React concepts including Thinking in React, Rules of React, component patterns, and state management principles. Essential foundation for writing correct React applications.

---

# React Fundamentals

Essential React concepts and patterns based on official React documentation. This skill covers the thinking model, rules, and patterns that prevent bugs and enable React Compiler optimization.

## When to Use

- When building new React components or applications
- When refactoring existing React code
- When debugging React-related issues
- When reviewing code for React best practices
- Before implementing any React feature

## Thinking in React

React changes how you think about UI design. Follow this 5-step process:

### Step 1: Break UI into Component Hierarchy

- Draw boxes around every component in the mockup
- Use separation of concerns: one component = one thing
- Match component structure to data model structure
- Arrange components into parent-child hierarchy

### Step 2: Build Static Version

- Build version that renders UI without interactivity
- Use props to pass data (NO state yet)
- Build top-down (simple apps) or bottom-up (large apps)
- Components only return JSX at this stage

### Step 3: Find Minimal State

Identify what is state vs what is not:

NOT state if it:

- Remains unchanged over time
- Is passed from parent via props
- Can be computed from existing state or props

State is the minimal set of changing data your app needs.

### Step 4: Identify Where State Lives

For each piece of state:

1. Identify every component that renders based on that state
2. Find their closest common parent component
3. Decide where state should live (usually the common parent)

### Step 5: Add Inverse Data Flow

- Pass setter functions down as props
- Child components call these functions to update parent state
- Use onChange handlers to capture user input

## Rules of React

CRITICAL: These are rules, not guidelines. Breaking them causes bugs.

### Rule 1: Components and Hooks Must Be Pure

Components must be idempotent and have no side effects in render.

**Idempotent**: Always return same output for same inputs.

**No side effects in render**: Side effects must run outside render.

**Immutability**: Never mutate props, state, or values passed to Hooks.

Why purity matters: React can render components multiple times for optimization.

#### Side Effects Must Run Outside Render

Side effects belong in event handlers or Effects, never during render.

#### Props and State Are Immutable

Never mutate props or state directly. Use setter functions for state updates.

#### Local Mutation Is OK

Mutating locally created values during render is fine.

### Rule 2: React Calls Components and Hooks

Never call component functions directly. Components should only be used in JSX.

Never pass Hooks as regular values. Hooks should only be called, never passed around.

Why: React needs to orchestrate rendering for optimization and features like local state.

### Rule 3: Rules of Hooks

Only call Hooks at top level. Never inside loops, conditions, nested functions, or try/catch blocks.

Only call Hooks from React functions. Call from components or custom Hooks only.

## Component Patterns

### Props vs State

Props: Arguments passed from parent to child. Immutable from child perspective.

State: Component memory. Changes over time in response to interactions.

### One-Way Data Flow

Data flows down from parent to child via props. Children communicate up via callback props.

### Component Composition

Extract components when they:

- Do more than one thing
- Are used in multiple places
- Have complex logic that can be isolated

## State Management Principles

### DRY Principle

Figure out absolute minimal state representation. Compute everything else on-demand.

### Lifting State Up

When multiple components need to share state, move it to their closest common parent.

### State Structure Guidelines

- Group related state
- Avoid contradictions in state
- Avoid redundant state
- Avoid duplication in state
- Avoid deeply nested state

## Modern React: Use React Compiler

React Compiler automatically optimizes your components when you follow the Rules of React.

The compiler ONLY works when you follow the Rules of React. This is why following the rules is critical.

## Questions to Ask

- Does this component follow the Rules of React?
- Is this state minimal, or can it be computed?
- Where should this state live in the component tree?
- Am I calling Hooks at the top level?
- Am I mutating any props, state, or Hook values?
- Are there side effects running during render?

## Additional Resources

- Official React Docs: https://react.dev
- Thinking in React: https://react.dev/learn/thinking-in-react
- Rules of React: https://react.dev/reference/rules
- Keeping Components Pure: https://react.dev/learn/keeping-components-pure