import { MessageCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTypewriter } from "../hooks/useTypewriter";

/**
 * Text guide: speech panel + typewriter (no TTS). Avatar lives in NarrativeCard header.
 * `paused` freezes the typewriter without resetting (header Pause in text-only mode).
 */
export function KaUbanGuide({ script, active, paused = false }) {
  const [replayKey, setReplayKey] = useState(0);
  const { shown, done } = useTypewriter(script ?? "", active, replayKey, 13, paused);

  return (
    <div className="relative min-w-0 w-full">
      <div className="relative rounded-3xl border-2 border-[#004aad]/20 bg-white p-4 shadow-[0_8px_30px_-8px_rgba(0,74,173,0.2)] sm:p-5 md:p-6">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#004aad]">
          <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <span>Ka-uban says</span>
        </div>
        <p className="min-h-[4.5rem] text-[1.05rem] leading-relaxed text-slate-800 md:text-lg" lang="en">
          {shown}
          {active && !done && !paused ? (
            <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-[#004aad]" aria-hidden />
          ) : null}
        </p>
        {done && script?.length > 0 ? (
          <button
            type="button"
            onClick={() => setReplayKey((k) => k + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Replay text
          </button>
        ) : null}
      </div>
    </div>
  );
}
