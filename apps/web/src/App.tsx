import { useState } from "react";
import { Header } from "./components/Header";
import { HashtagForm } from "./components/HashtagForm";

// A component is a function that returns JSX. React calls it to find out what
// to show; the capitalised name is how JSX tells components from HTML tags.
export function App() {
  // Placeholder until the form calls the API: remember what was submitted.
  const [submitted, setSubmitted] = useState<string[] | null>(null);

  return (
    <>
      <Header
        title="CleanHashtags"
        tagline="Check your Instagram hashtags before you post."
      />
      <main>
        <HashtagForm onSubmit={setSubmitted} />
        {submitted && (
          <p role="status">
            Ready to check {submitted.length}{" "}
            {submitted.length === 1 ? "hashtag" : "hashtags"}. Checking against
            the list is coming soon.
          </p>
        )}
      </main>
    </>
  );
}
