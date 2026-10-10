# 01 — Components, JSX and how Vite boots React

Step 10 adds `apps/web`, a React + Vite app with one component and a smoke test. Line
numbers refer to the code as of this step's commit (`28ad26d`; `git show 28ad26d:<path>`
shows that version). Later steps change some of these files.

## How the page starts

1. The browser loads `apps/web/index.html`. It has an empty `<div id="root">` and one
   `<script type="module" src="/src/main.tsx">`.
2. In development Vite serves `main.tsx` on demand, compiling TypeScript and JSX on the fly.
   For production, `pnpm --filter @hashdetector/web build` bundles everything into `apps/web/dist`.
3. `main.tsx` finds the root element and calls `createRoot(...).render(<App />)`
   (`apps/web/src/main.tsx:7-18`). From then on React owns everything inside `#root`.

In production the Worker in `apps/api` serves `dist` as static assets
(`apps/api/wrangler.jsonc`, `assets` block). Requests to `/api/*` go to the Worker code; any
other unknown path gets `index.html` (the "single-page application" fallback), so React
can decide what to show.

In development, `pnpm dev` at the root starts both `wrangler dev` (port 8787) and Vite
(port 5173). Vite forwards `/api` to the Worker (`apps/web/vite.config.ts`, `server.proxy`), so
the browser only ever talks to one origin.

## Components

A component is a plain function that returns JSX (`apps/web/src/App.tsx:5`). React calls it
whenever it needs to know what the UI should look like. Names start with a capital letter:
`<Header />` is a component, `<header>` is an HTML tag.

## JSX

JSX looks like HTML but is JavaScript. A few differences that matter right away:

- `{ ... }` embeds any JavaScript expression: `<h1>{title}</h1>` (`Header.tsx:11`).
- A component returns one root element. `<>...</>` (a Fragment, `App.tsx:7`) groups siblings
  without adding a wrapper `<div>` to the page.
- `className` instead of `class`, `htmlFor` instead of `for`.
- Conditional rendering is just JavaScript: `{tagline && <p>{tagline}</p>}` (`Header.tsx:13`)
  renders nothing when `tagline` is undefined.

## Props

Props are a component's inputs, passed like HTML attributes: `<Header title="..." />`
(`App.tsx:8-11`). The component receives them as one object, usually destructured
(`Header.tsx:8`). The `HeaderProps` type (`Header.tsx:3-6`) makes `title` required and
`tagline` optional, so TypeScript catches a missing or misspelt prop. Props are read-only:
a component never changes its own props.

## StrictMode

`<StrictMode>` (`main.tsx:15`) only does something in development. It renders components
twice to expose code that is not pure (for example, code that changes something outside the
component while rendering). If you see a `console.log` print twice, this is why.

## Tests

`apps/web/src/App.test.tsx` renders `<App />` into a fake DOM (jsdom) with React Testing
Library and finds the heading by its role, the way a screen reader would. Run them with
`pnpm --filter @hashdetector/web test`.

## Try this

1. Add a `Footer` component in `src/components/Footer.tsx` that takes a `year: number` prop and
   renders "© {year} HashDetector". Use it in `App` below `<main>`. Remove the prop from the
   call site and read the TypeScript error.
2. In `App.tsx`, remove the `tagline` prop from `<Header />`. Which test still passes, and why
   does `Header.test.tsx` cover the case?
