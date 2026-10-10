import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Entry point: Vite loads this file from index.html. createRoot takes over the
// <div id="root"> element and React renders the component tree inside it.
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element in index.html");
}

// StrictMode only affects development: it double-invokes some functions to
// surface bugs such as side effects during rendering.
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
