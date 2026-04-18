import { House, LayoutDashboard } from "lucide-react";

const chipClass =
  "inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-[#004aad] shadow-lg shadow-slate-900/10 backdrop-blur-md transition hover:border-[#004aad]/40 hover:bg-[#004aad] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad]";

/**
 * Fixed controls: Home (when not on marketing page) and Admin portal when a staff JWT is active.
 *
 * @param {object} props
 * @param {() => void} [props.onGoHome]
 * @param {string | null} [props.staffAccessToken]
 * @param {() => void} [props.onGoAdmin]
 * @param {"default" | "adminOnly"} [props.variant] — landing: show only the Admin portal chip
 */
export function PortalHomeBar({ onGoHome, staffAccessToken, onGoAdmin, variant = "default" }) {
  const showAdmin = Boolean(staffAccessToken?.trim()) && typeof onGoAdmin === "function";

  if (variant === "adminOnly") {
    if (!showAdmin) return null;
    return (
      <nav className="fixed right-4 top-4 z-[100] sm:right-6 sm:top-5" aria-label="Staff navigation">
        <button type="button" onClick={onGoAdmin} className={chipClass}>
          <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
          Admin portal
        </button>
      </nav>
    );
  }

  return (
    <nav
      className="fixed right-4 top-4 z-[100] flex flex-col items-end gap-2 sm:right-6 sm:top-5"
      aria-label="Site navigation"
    >
      {showAdmin ? (
        <button type="button" onClick={onGoAdmin} className={chipClass}>
          <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
          Admin portal
        </button>
      ) : null}
      <button type="button" onClick={onGoHome} className={chipClass}>
        <House className="h-5 w-5 shrink-0" aria-hidden />
        Home
      </button>
    </nav>
  );
}
