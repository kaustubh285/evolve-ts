import { useCallback, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Wraps a save function so that:
 *  - saves run one at a time, in order (never two requests racing each other)
 *  - if several saves queue up while one is in flight, only the newest runs
 *  - the UI gets a simple status to show
 *
 * The caller decides WHEN to call `save` (debounced onChange, onBlur, …).
 */
export function useAutosave<T>(saveFn: (value: T) => Promise<unknown>) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef(0);

  const save = useCallback(
    (value: T) => {
      const ticket = ++latest.current;
      setStatus("saving");

      queue.current = queue.current.then(async () => {
        // A newer value was queued after this one — skip; that one will save.
        if (ticket !== latest.current) return;
        try {
          await saveFn(value);
          if (ticket === latest.current) {
            setStatus("saved");
            setError(null);
          }
        } catch (e) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Couldn't save");
        }
      });
    },
    [saveFn],
  );

  /** Mark as failed without calling the server (e.g. client-side validation). */
  const fail = useCallback((message: string) => {
    latest.current++; // cancel anything queued
    setStatus("error");
    setError(message);
  }, []);

  return { save, fail, status, error };
}
