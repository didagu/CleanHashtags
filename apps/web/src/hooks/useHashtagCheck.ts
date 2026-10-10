import type { CheckResponse } from "@hashdetector/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkHashtags, errorMessage } from "../api/client";

// A discriminated union: `status` says which of the four situations we are in,
// and TypeScript only lets us read `response` or `message` when they exist.
export type CheckState =
  | { status: "idle" }
  | { status: "loading"; count: number }
  | { status: "success"; response: CheckResponse }
  | { status: "error"; message: string };

/**
 * Request state for POST /api/check. A custom hook is a function whose name
 * starts with `use` and that calls other hooks; each component that calls it
 * gets its own independent copy of the state.
 */
export function useHashtagCheck() {
  const [state, setState] = useState<CheckState>({ status: "idle" });

  // A ref holds a value across renders without causing a re-render when it
  // changes: right for the AbortController, which the UI never displays.
  const controllerRef = useRef<AbortController | null>(null);

  // The one effect in the app: when the component using this hook unmounts,
  // cancel any request still in flight. The returned function is the cleanup.
  useEffect(() => () => controllerRef.current?.abort(), []);

  // useCallback keeps the same function between renders, so components that
  // receive `check` or `reset` as props do not see a "new" prop every time.
  const check = useCallback(async (tags: string[]) => {
    // A newer check wins: cancel the previous request so its late response
    // cannot overwrite these results.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: "loading", count: tags.length });
    try {
      const response = await checkHashtags(tags, { signal: controller.signal });
      if (!controller.signal.aborted) setState({ status: "success", response });
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: "error", message: errorMessage(error) });
      }
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ status: "idle" });
  }, []);

  return { state, check, reset };
}
