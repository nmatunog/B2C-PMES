import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Loader2 } from "lucide-react";
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
 * Member share-capital passbook with dues reminders (accounting ledger).
 */
export function MemberPassbookCard({ email, getFirebaseIdToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!email?.trim()) return;
    setLoading(true);
    setError("");
    try {
      const idToken = await getFirebaseIdToken();
      const summary = await PmesService.getMemberPassbookSummary(email, idToken);
      setData(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load member passbook");
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
        Loading share capital passbook…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900">
        <p className="font-semibold">Member passbook unavailable</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  const dues = data?.dues;
  const passbook = Array.isArray(data?.passbook) ? data.passbook : [];
  const reminders = Array.isArray(dues?.reminders) ? dues.reminders : [];
  const totalDue = Number(dues?.due?.total ?? 0);
  const note = data?.note;

  return (
    <section className="rounded-2xl border-2 border-emerald-600/25 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <BookOpen className="h-8 w-8 shrink-0 text-emerald-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-emerald-900">Share capital passbook</h2>
          <p className="mt-1 text-sm text-slate-600">
            Membership fee (₱{Number(dues?.policy?.annualMembershipFee ?? 500).toFixed(0)}/year) and share capital
            (₱{Number(dues?.policy?.monthlyShareCapital ?? 100).toFixed(0)}/month minimum) — pay through Treasury.
          </p>
        </div>
      </div>

      {totalDue > 0 ? (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-black uppercase tracking-wide text-amber-900">Amount due</p>
              <p className="mt-1 text-2xl font-black text-amber-950">{formatPhp(totalDue)}</p>
              <ul className="mt-2 space-y-1">
                {reminders
                  .filter((r) => r.severity === "warning" && Number(r.amountDue) > 0)
                  .map((r) => (
                    <li key={r.type}>{r.description}</li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        reminders.some((r) => r.severity === "info") && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
            <p>{reminders.find((r) => r.severity === "info")?.description}</p>
          </div>
        )
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Share capital balance</p>
          <p className="mt-1 text-2xl font-black text-emerald-800">
            {formatPhp(dues?.shareCapitalBalance ?? "0.00")}
          </p>
        </div>
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Membership fee paid</p>
          <p className="mt-1 text-2xl font-black text-slate-800">
            {formatPhp(dues?.paid?.membershipFeeTotal ?? "0.00")}
          </p>
        </div>
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Share capital paid</p>
          <p className="mt-1 text-2xl font-black text-slate-800">
            {formatPhp(dues?.paid?.shareCapitalContributions ?? "0.00")}
          </p>
        </div>
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Member since</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatDate(dues?.membershipStart ?? data?.initialFeesPaidAt)}</p>
        </div>
      </div>

      {note ? <p className="mt-4 text-sm text-slate-600">{note}</p> : null}

      {passbook.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Membership</th>
                <th className="px-4 py-2 text-right">Share capital</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {passbook.map((row) => (
                <tr key={row.transactionId ?? row.externalId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(row.occurredAt)}</td>
                  <td className="px-4 py-2">{row.label ?? row.memo ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {Number(row.membershipFee) > 0 ? formatPhp(row.membershipFee) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(row.shareCapital) > 0 ? formatPhp(row.shareCapital) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-emerald-800">{formatPhp(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
