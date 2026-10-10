# 05 — Custom hooks and styling

Step 14 moves the request logic out of `App` into a custom hook, fixes the "late response"
problem from note 03, and gives the app a stylesheet with a responsive layout, dark mode and
a footer. Line numbers refer to the code as of this step's commit (`git show <sha>:<path>`
shows that version).

## Custom hooks

`useHashtagCheck` (`apps/web/src/hooks/useHashtagCheck.ts:18-56`) is a plain function whose
name starts with `use` and that calls other hooks. It returns `{ state, check, reset }`
(`useHashtagCheck.ts:55`), and `App` just uses it (`App.tsx:15`):

```tsx
const { state, check, reset } = useHashtagCheck();
```

What a custom hook gives you:

- **Separation**: `App` now describes the screen; the hook describes how a check works.
  Each can be read and tested on its own (`useHashtagCheck.test.ts` uses `renderHook`,
  no UI involved).
- **Reuse of logic, not state**: two components calling `useHashtagCheck()` each get their
  own independent state. Hooks share _behaviour_; to share _data_, lift state up (note 04)
  or use context.
- The usual hook rules apply inside it: call hooks at the top level, never conditionally.

`App` still owns the textarea `text`, so its `handleReset` (`App.tsx:17-20`) clears the
text and then calls the hook's `reset`.

## useRef: memory that does not re-render

`controllerRef` (`useHashtagCheck.ts:23`) holds the current `AbortController`. Changing
`controllerRef.current` does not re-render, which is right because nothing on screen
depends on it. Rule of thumb: if the UI shows it, `useState`; if it is bookkeeping for event
handlers or effects (timers, controllers, DOM nodes), `useRef`. Do not read or write refs
during rendering.

## Cancelling stale requests

`check` (`useHashtagCheck.ts:31-47`) aborts the previous request before starting a new one
(`:34`) and only sets state if its own request was not aborted (`:41,43`). So a slow first
response can no longer overwrite the results of a newer check, and a click on Reset while
loading (`:49-53`) really cancels. `checkHashtags` passes the `signal` to `fetch`
(`api/client.ts`), which rejects with an `AbortError` that the hook ignores.

## The first useEffect

```tsx
useEffect(() => () => controllerRef.current?.abort(), []);
```

(`useHashtagCheck.ts:27`) The effect itself does nothing; it returns a _cleanup_ function,
which React runs when the component unmounts. With `[]` as dependencies it runs once on
mount and cleans up once on unmount. This is a real "sync with something outside React"
case: a network request that should not outlive the component. In development
`StrictMode` mounts, unmounts and remounts once on purpose, to check that cleanups like
this one are correct.

## useCallback

`check` and `reset` are wrapped in `useCallback(fn, [])` (`useHashtagCheck.ts:31,49`) so
they are the same function on every render (tested in `useHashtagCheck.test.ts`). It
matters when a function is passed to a memoised child or used in another hook's dependency
list; for a hook meant to be reused it is a sensible default. Do not sprinkle it everywhere
in components: it adds noise without benefit when nothing compares the function.

## Styling

- One global stylesheet, `apps/web/src/styles.css`, imported once from `main.tsx:5`. Vite
  bundles it into `dist/assets/*.css`. In JSX the attribute is `className`, not `class`
  (`class` is a reserved word in JavaScript).
- Classes are composed with template strings, e.g. ``className={`badge badge-${status}`}``
  (`components/StatusBadge.tsx:9`), replacing the inline `style` objects from step 13.
- Colours are CSS custom properties on `:root` (`styles.css:4-29`). Dark mode is a
  `@media (prefers-color-scheme: dark)` block that only swaps those values
  (`styles.css:31-55`); `color-scheme: light dark` (`:5`) makes form controls and
  scrollbars match. No JavaScript needed.
- Responsive layout: a centred column with a max width (`.page`, `styles.css:80-84`),
  wrapping flex rows for chips, results and buttons, and one breakpoint that moves result
  details under the tag on narrow screens (`styles.css:261-265`).
- Status badges still show their label as text, so colour is never the only signal.

Alternatives you will meet: **CSS Modules** (`Button.module.css`, imported as an object, so
class names are scoped to one component and cannot clash), utility frameworks like
Tailwind, and CSS-in-JS. A single stylesheet is the simplest to learn on; switching one
component to a CSS Module is a good exercise (below).

## Footer

`Footer` (`components/Footer.tsx`) states where verdicts come from and that they can be out
of date, and that "Unknown" is not a guarantee. It renders a `<footer>`, which screen
readers expose as the page's "contentinfo" landmark (that is the role its test queries).

## Try this

1. Convert `StatusBadge` to a CSS Module: create `StatusBadge.module.css`, move the
   `.badge*` rules there, `import styles from "./StatusBadge.module.css"` and use
   `styles.badge`. Inspect the generated class name in the browser dev tools.
2. Add a theme toggle that overrides the system setting. Where does the choice live (state
   in `App`? a custom `useTheme` hook?), and how does it reach the CSS (hint: a
   `data-theme` attribute on `<html>` set in a `useEffect`)? Persisting it in
   `localStorage` is a second `useEffect`, or part of the same one.
