import type { CheckResponse, CheckResult } from "@cleanhashtags/shared";
import { useState } from "react";
import { copyText } from "../lib/clipboard";
import { STATUS_INFO, STATUS_ORDER } from "../lib/status";
import { daysAgo } from "../lib/time";
import { StatusBadge } from "./StatusBadge";

type ResultsListProps = {
  response: CheckResponse;
  onReset: () => void;
};

type CopyState = "idle" | "copied" | "failed";

function freshness(result: CheckResult, checkedAt: Date): string | null {
  if (result.lastVerifiedAt) {
    return `Verified ${daysAgo(result.lastVerifiedAt, checkedAt)}`;
  }
  // Unknown tags are not in the list at all, so there is nothing to date.
  return result.status === "unknown" ? null : "Not verified yet";
}

export function ResultsList({ response, onReset }: ResultsListProps) {
  // Local state: only this component cares whether the copy worked. It resets
  // on a new check because App gives each response a new `key`.
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const { results } = response;
  const checkedAt = new Date(response.checkedAt);
  const safeTags = results
    .filter((result) => STATUS_INFO[result.status].safe)
    .map((result) => `#${result.hashtag}`);

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: results.filter((result) => result.status === status).length,
  })).filter(({ count }) => count > 0);

  async function handleCopy() {
    const ok = await copyText(safeTags.join(" "));
    setCopyState(ok ? "copied" : "failed");
  }

  return (
    <section className="card stack" aria-labelledby="results-heading">
      <h2 id="results-heading">Results</h2>

      <p className="summary">
        Checked {results.length} {results.length === 1 ? "hashtag" : "hashtags"}
        :{" "}
        {counts
          .map(({ status, count }) => `${count} ${STATUS_INFO[status].label}`)
          .join(", ")}
        .
      </p>

      <ul className="results" aria-label="Results">
        {/* key: the hashtag is unique within one response and stable. */}
        {results.map((result) => {
          const fresh = freshness(result, checkedAt);
          return (
            <li key={result.hashtag} className="result">
              <strong className="result-tag">#{result.hashtag}</strong>{" "}
              <StatusBadge status={result.status} />
              <span className="result-meta">
                {result.source && <span> Source: {result.source}.</span>}
                {fresh && <span> {fresh}.</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="actions">
        <button
          className="button button-primary"
          type="button"
          onClick={() => void handleCopy()}
          disabled={safeTags.length === 0}
        >
          Copy safe hashtags ({safeTags.length})
        </button>{" "}
        <button className="button" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
      <p role="status">
        {copyState === "copied" &&
          `Copied ${safeTags.length} ${safeTags.length === 1 ? "hashtag" : "hashtags"}.`}
        {copyState === "failed" &&
          "Could not copy automatically. Copy them from the box below."}
      </p>
      {copyState === "failed" && (
        <textarea
          className="input"
          aria-label="Safe hashtags"
          readOnly
          value={safeTags.join(" ")}
        />
      )}
      <p className="hint">
        Safe means Clear or Unknown. Unknown hashtags are not in our list, which
        is not a guarantee.
      </p>
    </section>
  );
}
