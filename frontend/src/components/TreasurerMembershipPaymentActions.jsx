import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PmesService } from "../services/pmesService";

function currentMembershipPeriods() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
  return { year, month, monthLabel };
}

export function adminToastForAccountingPayment(apiResponse) {
  const a = apiResponse?.accountingPayment;
  if (!a) return null;
  const label = a.source === "membership.annual_fee" ? "Membership fee" : "Share capital";
  if (a.ok) {
    return {
      type: /** @type {"success"} */ ("success"),
      message: a.created
        ? `${label} ₱${Number(a.amount).toLocaleString("en-PH")} (${a.period}) posted to Accounting.`
        : `${label} (${a.period}) already in Accounting books.`,
    };
  }
  return {
    type: /** @type {"error"} */ ("error"),
    message: `${label} post failed: ${a.error ?? "check ACCOUNTING_API_URL"}`,
  };
}

/**
 * Treasurer actions for recurring ₱500/year membership fee and ₱100/month share capital.
 */
export function TreasurerMembershipPaymentActions({
  participantId,
  initialFeesPaid,
  canTreasury,
  staffAccessToken,
  onComplete,
  onToast,
  compact = false,
}) {
  const [busy, setBusy] = useState("");
  const periods = useMemo(() => currentMembershipPeriods(), []);

  if (!canTreasury || !initialFeesPaid || !staffAccessToken || !participantId) return null;

  const record = async (paymentType) => {
    setBusy(paymentType);
    try {
      const res = await PmesService.recordMembershipPayment(staffAccessToken, participantId, {
        paymentType,
        period: paymentType === "annual_fee" ? periods.year : periods.month,
      });
      const toast = adminToastForAccountingPayment(res);
      if (toast && onToast) onToast(toast);
      if (onComplete) await onComplete();
    } catch (e) {
      if (onToast) {
        onToast({
          type: "error",
          message: e instanceof Error ? e.message : "Could not record payment",
        });
      }
    } finally {
      setBusy("");
    }
  };

  const btnClass = compact
    ? "rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
    : "rounded-lg border border-emerald-700 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase text-emerald-900 hover:bg-emerald-100 disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        disabled={Boolean(busy)}
        className={btnClass}
        onClick={() => record("annual_fee")}
      >
        {busy === "annual_fee" ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {busy === "annual_fee" ? " Posting…" : `₱500 fee (${periods.year})`}
      </button>
      <button
        type="button"
        disabled={Boolean(busy)}
        className={btnClass}
        onClick={() => record("share_capital")}
      >
        {busy === "share_capital" ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {busy === "share_capital" ? " Posting…" : `₱100 share (${periods.monthLabel})`}
      </button>
    </>
  );
}
