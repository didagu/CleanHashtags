# 04 — Lists, keys and lifting state up

Step 13 replaces the plain results list with `ResultsList`: a status badge per hashtag,
source and freshness, a summary, "Copy safe hashtags" and Reset. Line numbers refer to the
code as of this step's commit (`d2dfe3a`; `git show d2dfe3a:<path>` shows that version).

## Rendering lists

`results.map(...)` (`components/ResultsList.tsx:59-69`) turns the array from the API into
`<li>` elements, keeping the API's order (the same order the user typed).

The `key` (`ResultsList.tsx:62`) tells React which item is which between renders, so it can
update, add or remove only what changed. Rules:

- Unique among siblings, and stable: the same item gets the same key every render.
- Prefer an id from the data. Here `result.hashtag` is unique in a response.
- Avoid the array index when items can be reordered, inserted or removed: React would match
  the wrong items and any state inside them (an open menu, typed text) would jump rows.

Data shaping happens in plain JavaScript before the JSX: `filter` + `map` build the safe
tags (`ResultsList.tsx:30-32`), and the summary counts come from mapping over a fixed
status order (`ResultsList.tsx:34-37`, `lib/status.ts:39`). All of it is derived from the
`response` prop, not stored.

## Keys can also reset a component

`App` renders `<ResultsList key={check.response.checkedAt} ... />` (`App.tsx:69-73`). When
the key changes, React treats it as a different component: it throws away the old one and
its state and mounts a fresh one. That is how the "Copied 2 hashtags." message
(`copyState`, `ResultsList.tsx:26`) disappears when a new check comes back, without any
code to clear it.

## Lifting state up

Reset lives in `ResultsList` but has to empty the textarea, whose text was state inside
`HashtagForm`. Siblings cannot reach into each other's state. The fix is to move ("lift")
the state to their closest common parent, `App`, and pass it down:

- `App` owns `text` (`App.tsx:22`) and the reset logic (`App.tsx:37-40`).
- `HashtagForm` now receives `text` and `onTextChange` as props
  (`HashtagForm.tsx:5-20,45`). It is controlled by its parent, just as the `<textarea>` is
  controlled by it.
- `ResultsList` receives `onReset` (`ResultsList.tsx:10`, wired at `App.tsx:72`).

Data flows down through props; changes flow up through callback props. The rule of thumb:
put state in the lowest component that every user of it sits under. `copyState` stays
inside `ResultsList` because nothing else needs it.

The cost: `HashtagForm`'s tests now need a small parent that holds the text
(`HashtagForm.test.tsx`, `Harness`).

## Small components and lookup tables

- `StatusBadge` (`components/StatusBadge.tsx`) is tiny but used once per row. It shows the
  status label as text and adds colour on top, so the information never relies on colour
  alone (colour-blind users, screen readers, printing in black and white).
- Colours use the `style` prop, which takes an object (`StatusBadge.tsx:7-13,21-26`).
  Step 14 replaces this with a stylesheet.
- `STATUS_INFO` (`lib/status.ts:10`) maps every status to its label, description and
  whether it is "safe". Typing it as `Record<HashtagStatus, ...>` means adding a new status
  to the shared schema is a compile error here until it gets a label.

## Non-React helpers

Code that does not need React lives in `lib/` and is tested without rendering anything:

- `daysAgo` (`lib/time.ts:5`) uses `Intl.RelativeTimeFormat` ("today", "yesterday",
  "3 days ago"). Freshness is measured from the response's `checkedAt`, which keeps the
  output deterministic in tests.
- `copyText` (`lib/clipboard.ts:2`) tries `navigator.clipboard.writeText` and falls back to
  the old `document.execCommand("copy")`. If both fail, the UI shows the text in a read-only
  box to copy by hand (`ResultsList.tsx:90-96`).

## Try this

1. Change the `key` in `ResultsList` to the array index (`results.map((result, index) =>`).
   Nothing visibly breaks here. Why not? What would have to be inside each row for it to
   matter?
2. Add a "Show only problems" checkbox to `ResultsList` that hides Clear and Unknown rows.
   Should its state live in `ResultsList` or `App`? Keep the summary counting all results.
