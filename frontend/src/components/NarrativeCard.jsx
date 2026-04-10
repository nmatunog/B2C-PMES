import { ChevronDown, LayoutList, Loader2, Volume2, Zap } from "lucide-react";

export function NarrativeCard({
  title,
  outline,
  isOpen,
  onClick,
  index,
  script,
  playTts,
  isSpeaking,
  audioLoading,
}) {
  return (
    <div
      className={`mb-6 overflow-hidden rounded-[2.5rem] border-4 transition-all duration-300 ${
        isOpen
          ? "scale-[1.01] border-[#004aad] bg-white shadow-xl"
          : "border-slate-100 bg-slate-50 hover:border-[#004aad]/30"
      }`}
    >
      <button onClick={onClick} className="flex w-full items-center justify-between p-8 text-left">
        <span
          className={`flex items-center gap-6 text-2xl font-extrabold md:text-3xl ${
            isOpen ? "text-[#004aad]" : "text-slate-700"
          }`}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-lg font-black ${
              isOpen
                ? "border-[#004aad] bg-[#004aad] text-white"
                : "border-slate-100 bg-white text-slate-400"
            }`}
          >
            {index + 1}
          </span>
          {title}
        </span>
        <ChevronDown
          className={`h-8 w-8 transition-transform duration-500 ${
            isOpen ? "rotate-180 text-[#004aad]" : "text-slate-300"
          }`}
        />
      </button>

      <div
        className={`transition-all duration-500 ease-in-out ${
          isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        <div className="bg-white px-10 pb-12">
          <div className="mb-10 rounded-3xl border-2 border-[#004aad]/10 bg-[#004aad]/5 p-8">
            <div className="mb-4 flex items-center gap-3 text-xl font-black uppercase tracking-widest text-[#004aad]">
              <LayoutList /> Key Outline
            </div>
            <div className="whitespace-pre-line text-2xl font-bold leading-relaxed text-slate-800 md:text-3xl">
              {outline}
            </div>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              playTts(script, `${index}-${title}`);
            }}
            disabled={isSpeaking || audioLoading}
            className={`flex w-full items-center justify-center gap-5 rounded-[2rem] px-10 py-6 text-2xl font-black transition-all md:w-auto ${
              isSpeaking
                ? "animate-pulse bg-emerald-500 text-white shadow-lg"
                : audioLoading
                  ? "bg-amber-100 text-amber-600"
                  : "bg-[#004aad] text-white shadow-xl active:scale-95 hover:bg-[#003380]"
            }`}
          >
            {isSpeaking ? (
              <Zap className="animate-bounce" />
            ) : audioLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Volume2 />
            )}
            {isSpeaking ? "Ka-uban is Speaking..." : audioLoading ? "Preparing voice..." : "HEAR FROM KA-UBAN"}
          </button>
        </div>
      </div>
    </div>
  );
}
