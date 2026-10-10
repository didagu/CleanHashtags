// Props are a component's inputs. Declaring them as a TypeScript type means
// <Header /> without a title is a compile error, not a runtime surprise.
type HeaderProps = {
  title: string;
  tagline?: string;
};

export function Header({ title, tagline }: HeaderProps) {
  return (
    <header className="header">
      <h1>{title}</h1>
      {/* `&&` renders the paragraph only when a tagline was passed. */}
      {tagline && <p>{tagline}</p>}
    </header>
  );
}
