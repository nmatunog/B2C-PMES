/** Primary actions: indigo → blue → sky (depth without flat corporate blue). */
export const ctaPrimary =
  "bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:via-blue-500 hover:to-sky-400 hover:shadow-xl hover:shadow-sky-500/15 active:scale-[0.99]";

/** Companion CTA (same family, lighter / more cyan-teal). */
export const ctaSecondary =
  "bg-gradient-to-br from-sky-600 via-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-600/20 transition-all hover:from-sky-500 hover:via-cyan-400 hover:to-teal-500 hover:shadow-xl hover:shadow-teal-500/20 active:scale-[0.99]";

/** Outlined / low-emphasis — pairs with primary on a row. */
export const ctaOutlineLight =
  "border-2 border-indigo-200/90 bg-white/80 text-indigo-950 shadow-sm backdrop-blur-sm transition-all hover:border-sky-400 hover:bg-sky-50/95 hover:text-indigo-950 active:scale-[0.99]";

export const ctaPrimaryFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";

export const ctaSecondaryFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

/** FAQ Assistant panel header + user bubbles (matches landing CTA family). */
export const faqHeaderBar = "bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500";
export const faqUserBubble =
  "bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 text-white shadow-sm shadow-indigo-900/15";
