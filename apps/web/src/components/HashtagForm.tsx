import { MAX_TAGS, parseHashtags } from "@cleanhashtags/shared";
import { useId, useState } from "react";
import type { FormEvent } from "react";

type HashtagFormProps = {
  onSubmit: (tags: string[]) => void;
  // True while a check is in flight: blocks double submissions.
  busy?: boolean;
};

export function HashtagForm({ onSubmit, busy = false }: HashtagFormProps) {
  // The only stored state is what the user typed. React re-renders this
  // component every time setText is called with a new value.
  const [text, setText] = useState("");

  // Everything below is derived from `text` on each render instead of being
  // kept in separate state, so it can never get out of sync with the textarea.
  const { tags, invalid } = parseHashtags(text);
  const overLimit = tags.length > MAX_TAGS;
  const canSubmit = tags.length > 0 && !overLimit && !busy;

  // useId gives stable unique ids to connect the label and hints to the textarea.
  const id = useId();
  const hintId = `${id}-hint`;
  const counterId = `${id}-counter`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from doing a full-page form submission.
    event.preventDefault();
    if (canSubmit) onSubmit(tags);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={id}>Hashtags</label>
      {/* Controlled input: React owns the value, onChange reports each edit. */}
      <textarea
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        placeholder="#travel #sunset #foodie"
        aria-describedby={`${hintId} ${counterId}`}
        aria-invalid={overLimit}
      />
      <p id={hintId}>
        Separate hashtags with spaces, commas or new lines. The # is optional.
      </p>

      <p id={counterId} aria-live="polite">
        {tags.length}/{MAX_TAGS} hashtags
        {overLimit && ` (remove ${tags.length - MAX_TAGS} to check)`}
      </p>

      {tags.length > 0 && (
        <ul aria-label="Hashtags to check">
          {/* Each tag is unique after parsing, so it works as a stable key. */}
          {tags.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      )}

      {invalid.length > 0 && (
        <div>
          <p>
            {invalid.length === 1
              ? "This is not a valid hashtag and will be skipped:"
              : "These are not valid hashtags and will be skipped:"}
          </p>
          <ul aria-label="Invalid hashtags">
            {invalid.map((token) => (
              <li key={token}>{token}</li>
            ))}
          </ul>
          <p>
            Hashtags use letters, numbers and _ only, and cannot be all numbers.
          </p>
        </div>
      )}

      <button type="submit" disabled={!canSubmit}>
        {busy ? "Checking…" : "Check hashtags"}
      </button>
    </form>
  );
}
