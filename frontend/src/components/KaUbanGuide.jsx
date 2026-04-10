import { MessageCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTypewriter } from "../hooks/useTypewriter";

/** Small corner avatar — image is circular art; ring keeps it crisp on the card. */
function KaUbanAvatarCorner({ animating }) {
  return (
    <div
      className={`absolute right-2 top-2 z-[1] sm:right-3 sm:top-3 ${
        animating ? "animate-[pulse_2s_ease-in-out_infinite]" : ""
      }`}
      aria-hidden
    >
      <img
        src="/kauban-avatar.png"
        alt=""
        width={56}
        height={56}
        className="h-11 w-11 rounded-full object-cover shadow-md ring-2 ring-white sm:h-14 sm:w-14"
        decoding="async"
        loading="lazy"
      />
    </div>
  );
}

/**
 * Text-only guide: compact avatar in the speech card corner + typewriter script (does not use TTS).
 */
export function KaUbanGuide({ script, active }) {
  const [replayKey, setReplayKey] = useState(0);
  const { shown, done } = useTypewriter(script ?? "", active, replayKey, 13);

  return (
    <div className="relative min-w-0 w-full">
      <div className="relative rounded-3xl border-2 border-[#004aad]/20 bg-white pl-4 pt-4 pb-4 pr-[4rem] shadow-[0_8px_30px_-8px_rgba(0,74,173,0.2)] sm:pl-5 sm:pt-5 sm:pb-5 sm:pr-[5.25rem] md:pr-[5.5rem]">
        <KaUbanAvatarCorner animating={active && !done} />
        <div className="mb-2 flex min-h-[2.75rem] items-start gap-2 text-xs font-bold uppercase tracking-wider text-[#004aad] sm:min-h-0 sm:items-center">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" strokeWidth={2.5} aria-hidden />
          <span>Ka-uban says</span>
        </div>
        <p className="min-h-[4.5rem] text-[1.05rem] leading-relaxed text-slate-800 md:text-lg" lang="en">
          {shown}
          {active && !done ? (
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
