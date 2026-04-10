import { useEffect, useRef, useState } from "react";

/**
 * Reveals `fullText` one character at a time while `active` is true.
 * `resetKey` changes restart the animation (e.g. Replay button).
 * While `paused` is true, the timer keeps running but does not advance (Pause in text-only mode).
 */
export function useTypewriter(fullText, active, resetKey = 0, charIntervalMs = 14, paused = false) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!active || !fullText?.length) {
      setShown("");
      setDone(false);
      return;
    }

    let cancelled = false;
    setShown("");
    setDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      if (cancelled) return;
      if (pausedRef.current) return;
      i += 1;
      setShown(fullText.slice(0, i));
      if (i >= fullText.length) {
        setDone(true);
        window.clearInterval(id);
      }
    }, charIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, fullText, resetKey, charIntervalMs]);

  return { shown, done };
}
