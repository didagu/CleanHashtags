# 03 — Events, async state and effects

Step 12 connects the form to the API. Submitting now sends `POST /api/check`, shows a
loading message, then either the results or an error. Line numbers refer to the code as of
this step's commit (`git show <sha>:<path>` shows that version).

## A typed API client

`apps/web/src/api/client.ts` wraps `fetch` so components never deal with HTTP details:

- `checkHashtags(tags)` (`client.ts:67-102`) posts the tags and returns a `CheckResponse`.
- Every failure becomes an `ApiRequestError` (`client.ts:8-18`) with a `kind` and a message
  that is safe to show: network down, 429 rate limit (using the `Retry-After` header,
  `client.ts:37-43`), 4xx with the server's message, 5xx with a generic message.
- The response body is checked with the shared Zod schema (`client.ts:93`).
  `response.json()` is typed `any` by TypeScript: it trusts whatever arrives. `safeParse`
  turns "the server sent something odd" into a clear error at the edge instead of a crash
  deep inside a component. The same `CheckResponse` schema is what the API builds its
  responses from, so client and server cannot silently disagree.

## Event handlers can be async

```tsx
async function runCheck(tags: string[]) {
  setCheck({ status: "loading", count: tags.length });
  try {
    const response = await checkHashtags(tags);
    setCheck({ status: "success", response });
  } catch (error) {
    setCheck({ status: "error", message: errorMessage(error) });
  }
}
```

(`App.tsx:22-30`) React re-renders after each `setCheck`, so the user sees "Checking…"
straight away and the results when the promise settles. The handler is passed as
`onSubmit={(tags) => void runCheck(tags)}` (`App.tsx:42`): `void` tells the linter we are
deliberately not awaiting the promise, which is fine because `runCheck` catches its own
errors.

## Modelling async state

Instead of three separate states (`isLoading`, `error`, `data`) that can contradict each
other (loading _and_ error?), `App` keeps one value with a `status` tag
(`App.tsx:9-13,18`):

```tsx
type CheckState =
  | { status: "idle" }
  | { status: "loading"; count: number }
  | { status: "success"; response: CheckResponse }
  | { status: "error"; message: string };
```

This is a TypeScript _discriminated union_. Inside `check.status === "success" && ...`
(`App.tsx:54-62`) TypeScript knows `check.response` exists; outside it, reading it is a
compile error. Impossible states cannot be represented.

While loading, `busy` is passed down to the form (`App.tsx:43`, `HashtagForm.tsx:8,20,83`)
to disable the button and stop double submissions.

## Why there is no useEffect here

`useEffect` runs code _after_ React renders, to keep something outside React in sync with
the current props/state: a subscription, a timer, a third-party widget, the document title.

Fetching here is caused by a specific user action (submitting), so it belongs in the event
handler. Writing it as "store the tags in state, then a `useEffect` watching the tags
fetches" adds an extra render, makes the request depend on rendering instead of on the
click, and breaks if the user submits the same tags twice (the dependency did not change,
so the effect does not re-run).

You _would_ reach for `useEffect` (or a data library such as TanStack Query) when data
must load because something is on screen, e.g. a page that fetches a profile from the URL
as soon as it opens. The React docs page "You Might Not Need an Effect" is worth reading.

One thing this step does not handle: if a slow request finishes after a newer one, it could
overwrite the newer results. The disabled button makes that unlikely here; step 14 handles
it properly with `AbortController`.

## Accessibility of async feedback

- The loading message has `role="status"` (`App.tsx:47`): screen readers announce it
  politely.
- The error has `role="alert"` (`App.tsx:52`): announced immediately.

## Tests

`App.test.tsx` and `api/client.test.ts` replace the global `fetch` with a Vitest mock
(`src/test/fetch.ts`, `vi.stubGlobal`), so tests never hit a server. The loading test hands
`fetch` a promise it resolves by hand, to assert what is on screen _while_ the request is
pending. `findByRole` waits for the UI to update after the promise settles; `getByRole`
does not wait.

## Try this

1. Add a "Try again" button to the error message that re-runs the last check. Where do you
   need to remember the last tags? Store them in state or pass them through the error?
2. Rewrite `runCheck` the "wrong" way: store `tags` in state and fetch in a `useEffect`
   with `[tags]` as dependencies. Submit the same tags twice and watch what happens (and
   notice the double request in development caused by `StrictMode`). Then revert.
