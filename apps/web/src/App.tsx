import { useState } from "react";
import { Footer } from "./components/Footer";
import { HashtagForm } from "./components/HashtagForm";
import { Header } from "./components/Header";
import { ResultsList } from "./components/ResultsList";
import { useHashtagCheck } from "./hooks/useHashtagCheck";

// A component is a function that returns JSX. React calls it to find out what
// to show; the capitalised name is how JSX tells components from HTML tags.
export function App() {
  // Lifted state: Reset (in ResultsList) must clear the textarea, so the text
  // lives here, in the closest common parent, and is passed down as props.
  const [text, setText] = useState("");
  // All request state (loading, results, errors) now lives in a custom hook.
  const { state, check, reset } = useHashtagCheck();

  function handleReset() {
    setText("");
    reset();
  }

  return (
    <div className="page">
      <Header
        title="CleanHashtags"
        tagline="Check your Instagram hashtags before you post."
      />
      <main className="stack">
        <HashtagForm
          text={text}
          onTextChange={setText}
          // `void` marks the returned promise as deliberately not awaited;
          // `check` handles its own errors.
          onSubmit={(tags) => void check(tags)}
          busy={state.status === "loading"}
        />

        {state.status === "loading" && (
          <p role="status" className="notice">
            Checking {state.count} {state.count === 1 ? "hashtag" : "hashtags"}…
          </p>
        )}

        {state.status === "error" && (
          <p role="alert" className="notice notice-error">
            {state.message}
          </p>
        )}

        {state.status === "success" && (
          // A new key per response makes React start ResultsList fresh, so
          // its local "Copied" message does not carry over to the next check.
          <ResultsList
            key={state.response.checkedAt}
            response={state.response}
            onReset={handleReset}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
