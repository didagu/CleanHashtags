# 02 — State and controlled inputs

Step 11 adds `HashtagForm` (`apps/web/src/components/HashtagForm.tsx`): a textarea that
parses hashtags as you type, shows them as a list, counts them against the 30-tag limit
and flags invalid ones.

## useState

```tsx
const [text, setText] = useState("");
```

(`HashtagForm.tsx:12`) `useState` gives a component memory between renders. It returns the
current value and a setter. Calling `setText(newValue)` does not change `text` in place; it
asks React to render the component again, and on that next render `useState` returns the new
value.

Hooks (functions starting with `use`) must be called at the top level of a component, in the
same order every render: never inside an `if`, a loop or a nested function. The
`react-hooks` ESLint plugin in this repo enforces that.

## Controlled inputs

```tsx
<textarea value={text} onChange={(event) => setText(event.target.value)} />
```

(`HashtagForm.tsx:35-43`) The textarea shows whatever `text` holds, and every keystroke
calls `onChange`, which stores the new value. React state is the single source of truth for
the input. That is what makes the rest of the form easy: anything that depends on the input
can read `text` directly.

Without `onChange`, the textarea would be read-only, because React would keep resetting it
to `text`.

## Derived state vs stored state

Only the raw text is stored. The parsed tags, the invalid tokens, the over-limit flag and
whether the button is enabled are all **computed from `text` during render**
(`HashtagForm.tsx:16-18`):

```tsx
const { tags, invalid } = parseHashtags(text);
const overLimit = tags.length > MAX_TAGS;
const canSubmit = tags.length > 0 && !overLimit;
```

A common beginner mistake is to keep `tags` in a second `useState` and update it in
`onChange` (or in a `useEffect`). Then there are two copies of the truth that can drift
apart. Rule of thumb: if you can calculate it from props or existing state, calculate it,
don't store it. `parseHashtags` is fast enough on 30 tags that there is no need to cache it
with `useMemo`.

`parseHashtags` and `MAX_TAGS` come from `packages/shared`, the same code the API uses, so
the preview and the server agree on what counts as a valid hashtag.

## Rendering lists

`tags.map((tag) => <li key={tag}>#{tag}</li>)` (`HashtagForm.tsx:56-58`) turns an array into
elements. React needs a `key` that is unique among siblings and stable between renders to
match old and new items. Tags are unique after parsing, so the tag itself works. Lists get
more attention in note 04.

## Forms and events

`handleSubmit` (`HashtagForm.tsx:25-29`) calls `event.preventDefault()` so the browser does
not reload the page, then passes the tags up through the `onSubmit` prop. The form does not
know what happens next; `App` decides (`App.tsx:9,18`). For now `App` stores the submitted
list and shows a placeholder message; step 12 replaces that with an API call.

## Accessibility

- `<label htmlFor={id}>` is tied to the textarea's `id`. `useId()` (`HashtagForm.tsx:21`)
  generates an id that is unique even if the form is rendered twice.
- `aria-describedby` points at the hint and the counter, so a screen reader reads them when
  the textarea gets focus. The counter has `aria-live="polite"` so changes are announced.
- The submit button uses the native `disabled` attribute rather than just looking greyed out.

## Tests

`HashtagForm.test.tsx` uses `@testing-library/user-event`, which simulates real typing,
clicking and pasting (with focus, key events, etc.) instead of setting values directly.
Queries use what a user sees: the label text, button names and list names.

## Try this

1. Add a "Clear" button that empties the textarea. It needs only one line in its `onClick`.
   Should it be `type="button"`? Try it without and see what happens.
2. Show the number of characters typed under the textarea. Store it in a new `useState`
   first and notice what you have to keep in sync, then rewrite it as derived state
   (`text.length`) and delete the extra state.
