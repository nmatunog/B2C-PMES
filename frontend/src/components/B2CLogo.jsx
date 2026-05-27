/**
 * Official B2C wordmark (`public/b2c-logo.png`) for nav bars, cards, and in-app chrome.
 * All `SIZE_CLASS` values are mobile-first: base = phone, then `sm` → `md` → `lg` → `xl`.
 */
const SIZE_CLASS = {
  xs: "h-8 max-w-[9.5rem] sm:h-9 sm:max-w-[10.5rem] md:max-w-[11.5rem]",
  sm: "h-10 max-w-[11.5rem] sm:h-11 sm:max-w-[12.5rem] md:max-w-[13.5rem]",
  md: "h-11 max-w-[12.5rem] sm:h-12 sm:max-w-[14.5rem] md:h-[3.25rem] md:max-w-[15.5rem] lg:max-w-[16.5rem]",
  lg: "h-14 max-w-[14rem] sm:h-[3.75rem] sm:max-w-[16rem] md:h-16 md:max-w-[17.5rem] lg:max-w-[18.5rem]",
  /** Fixed nav / app chrome — prominent on phones, scales up on tablet and desktop */
  nav: "h-12 max-w-[min(78vw,15rem)] sm:h-[3.25rem] sm:max-w-[16.5rem] md:h-14 md:max-w-[17.5rem] lg:h-[3.75rem] lg:max-w-[18.75rem] xl:h-16 xl:max-w-[20rem]",
  /** Certificate / hero */
  xl: "h-24 max-w-[15rem] sm:h-28 sm:max-w-[17.5rem] md:h-32 md:max-w-[19.5rem] lg:h-36 lg:max-w-[22rem]",
};

/** Cooperative name beside the logo in marketing / app chrome (mobile-first). */
export const BRAND_TITLE_CLASS =
  "text-sm font-bold leading-snug tracking-tight text-stone-900 sm:text-base sm:leading-tight md:text-lg md:leading-tight lg:text-xl lg:leading-tight xl:text-2xl";

export const BRAND_SUBTITLE_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-600 sm:text-[11px] md:text-xs lg:text-sm";

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'nav' | 'xl'} [props.size]
 * @param {'default' | 'center'} [props.align] — `center` adds `mx-auto` for stacked hero layouts
 * @param {boolean} [props.priority] — eager load + high fetch priority (use once per page, e.g. header)
 */
export function B2CLogo({ className = "", size = "md", align = "default", priority = false }) {
  const alignClass = align === "center" ? "mx-auto" : "";
  return (
    <img
      src="/b2c-logo.png"
      alt="B2C Consumers Cooperative"
      className={`w-auto object-contain object-left ${SIZE_CLASS[size] ?? SIZE_CLASS.md} ${alignClass} ${className}`.trim()}
      width={320}
      height={128}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
