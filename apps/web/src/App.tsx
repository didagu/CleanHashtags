import { Header } from "./components/Header";

// A component is a function that returns JSX. React calls it to find out what
// to show; the capitalised name is how JSX tells components from HTML tags.
export function App() {
  return (
    <>
      <Header
        title="HashDetector"
        tagline="Check your Instagram hashtags before you post."
      />
      <main>
        <p>Hashtag checking is coming soon.</p>
      </main>
    </>
  );
}
