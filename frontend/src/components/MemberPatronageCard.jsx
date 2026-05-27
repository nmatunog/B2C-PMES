import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { PmesService } from "../services/pmesService";

function formatPhp(n) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Read-only patronage accrual strip for the member portal (accounting ledger).
 */
export function MemberPatronageCard({ email, getFirebaseIdToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!email?.trim()) return;
    setLoading(true);
    setError("");
    try {
      const idToken = await getFirebaseIdToken();
      const summary = await PmesService.getMemberPatronageSummary(email, idToken);
      setData(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load patronage summary");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [email, getFirebaseIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-[#004aad]" aria-hidden />
        Loading patronage ledger…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900">
        <p className="font-semibold">Patronage ledger unavailable</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  const balance = data?.patronageAccruedBalance ?? "0.00";
  const accruals = Array.isArray(data?.accruals) ? data.accruals : [];
  const note = data?.note;

  return (
    <section className="rounded-2xl border-2 border-[#004aad]/20 bg-gradient-to-br from-[#004aad]/5 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Gift className="h-8 w-8 shrink-0 text-[#004aad]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-[#004aad]">Patronage refunds</h2>
          <p className="mt-1 text-sm text-slate-600">
            Accrued from your Coop store purchases — paid out per cooperative patronage policy.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Accrued balance</p>
          <p className="mt-1 text-2xl font-black text-[#004aad]">{formatPhp(balance)}</p>
        </div>
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Qualifying purchases</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{data?.purchaseCount ?? 0}</p>
        </div>
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last accrual</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatDate(data?.lastAccrualAt)}</p>
        </div>
      </div>

      {note ? <p className="mt-4 text-sm text-slate-600">{note}</p> : null}

      {accruals.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2 text-right">Purchase</th>
                <th className="px-4 py-2 text-right">Patronage</th>
              </tr>
            </thead>
            <tbody>
              {accruals.map((row) => (
                <tr key={row.transactionId ?? row.externalId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(row.occurredAt)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{row.externalId ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{row.grossAmount ? formatPhp(row.grossAmount) : "—"}</td>
                  <td className="px-4 py-2 text-right font-semibold text-[#004aad]">
                    {formatPhp(row.patronageAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
