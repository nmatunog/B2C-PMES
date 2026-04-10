import { useEffect, useState } from "react";
import { ChevronDown, LayoutList, Loader2, Pause, Play, Volume2, Zap } from "lucide-react";
import { KaUbanGuide } from "./KaUbanGuide";
import { KaubanAvatarHead } from "./KaubanAvatarHead";

/** Turn module outline strings into lists and paragraphs for scanability and lower cognitive load. */
function OutlineBody({ outline }) {
  const rawLines = outline.split("\n");
  const chunks = [];
  let bulletBuf = [];

  const flushBullets = () => {
    if (bulletBuf.length === 0) return;
    chunks.push({ kind: "bullets", items: [...bulletBuf] });
    bulletBuf = [];
  };

  for (const line of rawLines) {
    const t = line.trim();
    const bulletMatch = t.match(/^[•\-\*]\s*(.+)$/);
    if (bulletMatch) {
      bulletBuf.push(bulletMatch[1]);
      continue;
    }
    flushBullets();
    if (!t) continue;
    const numMatch = t.match(/^(\d+)\.\s*(.+)$/);
    if (numMatch) {
      chunks.push({ kind: "ordered", n: numMatch[1], text: numMatch[2] });
    } else {
      chunks.push({ kind: "text", text: t });
    }
  }
  flushBullets();

  return (
    <div className="space-y-5">
      {chunks.map((chunk, i) => {
        if (chunk.kind === "bullets") {
          return (
            <ul key={i} className="list-none space-y-3.5 border-l-2 border-[#004aad]/25 pl-5">
              {chunk.items.map((text, j) => (
                <li key={j} className="text-[1.0625rem] font-normal leading-relaxed text-slate-700 md:text-lg">
                  {text}
                </li>
              ))}
            </ul>
          );
        }
        if (chunk.kind === "ordered") {
          return (
            <div
              key={i}
              className="flex gap-3 text-[1.0625rem] font-normal leading-relaxed text-slate-700 md:text-lg"
            >
              <span className="mt-0.5 min-w-[2rem] font-semibold tabular-nums text-[#004aad]" aria-hidden>
                {chunk.n}.
              </span>
              <span>{chunk.text}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-[1.0625rem] font-medium leading-relaxed text-slate-800 md:text-lg">
            {chunk.text}
          </p>
        );
      })}
    </div>
  );
}

function SectionSoundToggle({ enabled, onChange }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="hidden text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:block">Sound</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        title={enabled ? "Voice on for all sections (tap to use text-only)" : "Text-only (tap to turn voice on)"}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!enabled);
        }}
        className={`relative h-7 w-[2.75rem] shrink-0 overflow-hidden rounded-full border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad] ${
          enabled ? "border-[#004aad] bg-[#004aad]" : "border-slate-300 bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none absolute top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-slate-200/90 transition-[left,right] duration-200 ease-out ${
            enabled ? "left-[calc(100%-1.125rem-3px)]" : "left-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

export function NarrativeCard({
  title,
  outline,
  isOpen,
  onClick,
  index,
  script,
  courseAudioEnabled,
  onCourseAudioChange,
  prefetchTts,
  playTts,
  pauseTts,
  isSpeaking,
  speakingTtsKey,
  audioLoading,
  illustration,
}) {
  const panelId = `narrative-panel-${index}`;
  const headerId = `narrative-header-${index}`;
  const ttsKey = `${index}-${title}`;
  const [textGuidePaused, setTextGuidePaused] = useState(false);

  const thisCardSpeaking = Boolean(isSpeaking && speakingTtsKey === ttsKey);

  useEffect(() => {
    if (!isOpen) setTextGuidePaused(false);
  }, [isOpen]);

  /** Prefetch TTS only when voice mode is on. */
  useEffect(() => {
    if (!courseAudioEnabled || !isOpen || !script?.trim() || !prefetchTts) return;
    prefetchTts(script, ttsKey);
  }, [courseAudioEnabled, isOpen, script, prefetchTts, ttsKey]);

  const handlePauseClick = (e) => {
    e.stopPropagation();
    if (courseAudioEnabled) {
      if (isSpeaking) pauseTts();
    } else {
      setTextGuidePaused((p) => !p);
    }
  };

  return (
    <div
      className={`mb-5 rounded-3xl border-2 transition-all duration-300 md:rounded-[2rem] ${
        isOpen
          ? "overflow-visible border-[#004aad] bg-white shadow-[0_12px_40px_-12px_rgba(0,74,173,0.25)]"
          : "overflow-hidden border-slate-200/90 bg-slate-50/80 hover:border-[#004aad]/35 hover:bg-white"
      }`}
    >
      <div className="flex w-full flex-wrap items-start gap-2 p-5 sm:flex-nowrap sm:items-center sm:gap-3 md:gap-4 md:p-7">
        <button
          type="button"
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onClick}
          className="flex min-w-0 flex-1 items-start gap-4 text-left md:items-center md:gap-5"
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold md:h-12 md:w-12 md:text-base ${
              isOpen
                ? "bg-[#004aad] text-white shadow-md shadow-[#004aad]/30"
                : "border-2 border-slate-200 bg-white text-slate-500"
            }`}
            aria-hidden
          >
            {index + 1}
          </span>
          <span className="min-w-0">
            <span
              className={`block text-lg font-bold leading-snug tracking-tight md:text-xl ${
                isOpen ? "text-[#004aad]" : "text-slate-800"
              }`}
            >
              {title}
            </span>
            <span className="mt-1 block text-sm font-medium text-slate-500">
              {isOpen
                ? "Tap to collapse"
                : courseAudioEnabled
                  ? "Tap to read key points & listen"
                  : "Tap to read key points (text guide beside slide)"}
            </span>
          </span>
        </button>

        {isOpen ? (
          <div
            className="flex shrink-0 items-center gap-2 sm:gap-3"
            role="group"
            aria-label="Ka-uban guide controls"
            onClick={(e) => e.stopPropagation()}
          >
            <KaubanAvatarHead sizeClass="h-9 w-9 sm:h-10 sm:w-10" />
            <SectionSoundToggle enabled={courseAudioEnabled} onChange={onCourseAudioChange} />
            <button
              type="button"
              onClick={handlePauseClick}
              disabled={courseAudioEnabled ? !isSpeaking : false}
              title={
                courseAudioEnabled
                  ? isSpeaking
                    ? "Pause audio"
                    : "Nothing playing"
                  : textGuidePaused
                    ? "Resume typing"
                    : "Pause typing"
              }
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 px-2.5 text-xs font-bold uppercase tracking-wide transition-colors sm:px-3 sm:text-sm ${
                courseAudioEnabled
                  ? isSpeaking
                    ? "border-[#004aad] bg-[#004aad]/10 text-[#004aad] hover:bg-[#004aad]/15"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : textGuidePaused
                    ? "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-slate-300 bg-white text-slate-700 hover:border-[#004aad]/40"
              }`}
            >
              {courseAudioEnabled ? (
                <Pause className="h-4 w-4 shrink-0" aria-hidden />
              ) : textGuidePaused ? (
                <Play className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <Pause className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className="max-[380px]:sr-only">{courseAudioEnabled ? "Pause" : textGuidePaused ? "Resume" : "Pause"}</span>
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClick}
          className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#004aad]"
          aria-label={isOpen ? "Collapse section" : "Expand section"}
        >
          <ChevronDown
            className={`h-6 w-6 transition-transform duration-300 md:h-7 md:w-7 ${isOpen ? "rotate-180 text-[#004aad]" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`transition-all duration-300 ease-out ${
          isOpen ? "max-h-[8000px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        <div className="border-t border-slate-100 bg-white px-5 pb-6 pt-2 md:px-8 md:pb-8">
          <div className={isOpen ? "lg:grid lg:grid-cols-12 lg:items-start lg:gap-6" : ""}>
            <div className={isOpen ? "lg:col-span-7" : ""}>
              {illustration?.src ? (
                <figure
                  className={`mb-5 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm ${
                    illustration.philippinesDisplay
                      ? "bg-[#002654] px-6 py-8 md:px-10 md:py-10"
                      : "bg-slate-50 px-6 py-6"
                  }`}
                >
                  <img
                    src={illustration.src}
                    alt={illustration.alt ?? ""}
                    className={`mx-auto h-auto max-h-[min(8rem,22vw)] w-auto max-w-full object-contain md:max-h-36 ${
                      illustration.philippinesDisplay ? "brightness-0 invert" : ""
                    }`}
                    loading="lazy"
                    decoding="async"
                  />
                  {illustration.philippinesDisplay ? (
                    <figcaption className="mt-4 text-center text-xs font-medium leading-snug text-white/85">
                      Official Philippines display: white symbol on dark blue (international Co-op identity scheme).
                    </figcaption>
                  ) : null}
                </figure>
              ) : null}
              <div className="rounded-2xl bg-gradient-to-b from-[#004aad]/[0.06] to-slate-50/80 p-5 md:p-7">
                <div className="mb-4 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#004aad]/90 md:text-sm">
                  <LayoutList className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2.5} aria-hidden />
                  <span>Key points</span>
                </div>
                <OutlineBody outline={outline} />
              </div>
            </div>

            {isOpen ? (
              <div className="mt-6 min-w-0 lg:col-span-5 lg:mt-0">
                <div className="lg:sticky lg:top-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {courseAudioEnabled ? "Ka-uban — script & voice" : "Ka-uban — text guide"}
                  </p>
                  <KaUbanGuide script={script} active={isOpen} paused={textGuidePaused} />
                  {courseAudioEnabled ? (
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          playTts(script, ttsKey);
                        }}
                        disabled={audioLoading}
                        aria-busy={audioLoading}
                        className={`flex min-h-[3rem] w-full items-center justify-center gap-3 rounded-2xl px-5 py-3 text-base font-semibold tracking-wide transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad] ${
                          thisCardSpeaking
                            ? "animate-pulse bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                            : audioLoading
                              ? "cursor-wait bg-sky-50 text-sky-900 ring-1 ring-sky-200"
                              : "bg-[#004aad] text-white shadow-lg shadow-[#004aad]/25 hover:bg-[#003d99] active:scale-[0.99]"
                        } disabled:opacity-60`}
                      >
                        {thisCardSpeaking ? (
                          <Zap className="h-5 w-5 shrink-0 animate-pulse" aria-hidden />
                        ) : audioLoading ? (
                          <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
                        )}
                        <span>
                          {thisCardSpeaking
                            ? "Ka-uban is speaking… (tap to stop)"
                            : audioLoading
                              ? "Getting voice ready…"
                              : "Hear from Ka-uban"}
                        </span>
                      </button>
                      <p className="text-xs text-slate-500">
                        First play may take a few seconds; replay is instant. Use Sound in the header to switch the whole course
                        to text-only.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
