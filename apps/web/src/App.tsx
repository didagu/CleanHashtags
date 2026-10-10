import type { CheckResponse } from "@hashdetector/shared";
import { useState } from "react";
import { checkHashtags, errorMessage } from "./api/client";
import { HashtagForm } from "./components/HashtagForm";
import { Header } from "./components/Header";
import { ResultsList } from "./components/ResultsList";

// A discriminated union: `status` says which of the four situations we are in,
// and TypeScript only lets us read `response` or `message` when they exist.
type CheckState =
  | { status: "idle" }
  | { status: "loading"; count: number }
  | { status: "success"; response: CheckResponse }
  | { status: "error"; message: string };

// A component is a function that returns JSX. React calls it to find out what
// to show; the capitalised name is how JSX tells components from HTML tags.
export function App() {
  // Lifted state: the textarea's text used to live inside HashtagForm. Reset
  // (in ResultsList) must clear it, so it moves up to the closest common
  // parent of both components and is passed down as props.
  const [text, setText] = useState("");
  const [check, setCheck] = useState<CheckState>({ status: "idle" });

  // The request starts because the user submitted the form, so it lives in the
  // event handler. No useEffect needed: nothing has to "sync" after rendering.
  async function runCheck(tags: string[]) {
    setCheck({ status: "loading", count: tags.length });
    try {
      const response = await checkHashtags(tags);
      setCheck({ status: "success", response });
    } catch (error) {
      setCheck({ status: "error", message: errorMessage(error) });
    }
  }

  function reset() {
    setText("");
    setCheck({ status: "idle" });
  }

  return (
    <>
      <Header
        title="HashDetector"
        tagline="Check your Instagram hashtags before you post."
      />
      <main>
        <HashtagForm
          text={text}
          onTextChange={setText}
          // `void` marks the returned promise as deliberately not awaited;
          // runCheck handles its own errors.
          onSubmit={(tags) => void runCheck(tags)}
          busy={check.status === "loading"}
        />

        {check.status === "loading" && (
          <p role="status">
            Checking {check.count} {check.count === 1 ? "hashtag" : "hashtags"}…
          </p>
        )}

        {check.status === "error" && <p role="alert">{check.message}</p>}

        {check.status === "success" && (
          // A new key per response makes React start ResultsList fresh, so
          // its local "Copied" message does not carry over to the next check.
          <ResultsList
            key={check.response.checkedAt}
            response={check.response}
            onReset={reset}
          />
        )}
      </main>
    </>
  );
}
