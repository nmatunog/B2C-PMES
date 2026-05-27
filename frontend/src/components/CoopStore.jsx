import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, ShoppingBag } from "lucide-react";
import { PmesService } from "../services/pmesService";
import { B2CLogo } from "./B2CLogo";

function formatPhp(n) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DEMO_CART = [
  { sku: "RICE-5KG", quantity: 1 },
  { sku: "OIL-1L", quantity: 1 },
];

/**
 * B2C native Coop Store (dev) — member checkout → WebApp → accounting.
 * Use this instead of Versa for marketplace / patronage / ledger testing.
 */
export function CoopStore({ email, getFirebaseIdToken, onBack }) {
  const [catalog, setCatalog] = useState([]);
  const [qty, setQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await PmesService.getStoreCatalog();
      const items = Array.isArray(data?.items) ? data.items : [];
      setCatalog(items);
      const initial = {};
      for (const item of items) {
        initial[item.sku] = 0;
      }
      setQty(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load store catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const cartLines = useMemo(() => {
    return catalog
      .filter((item) => (qty[item.sku] ?? 0) > 0)
      .map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: qty[item.sku],
        unitPrice: item.unitPrice,
        patronagePerUnit: Number(item.patronagePerUnit ?? 0),
        lineTotal: item.unitPrice * qty[item.sku],
        linePatronage: Number(item.patronagePerUnit ?? 0) * qty[item.sku],
      }));
  }, [catalog, qty]);

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.lineTotal, 0),
    [cartLines],
  );

  const patronageTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.linePatronage, 0),
    [cartLines],
  );

  const categories = useMemo(() => {
    const set = new Set(catalog.map((i) => i.category || "General"));
    return [...set].sort();
  }, [catalog]);

  function loadDemoCart() {
    const next = {};
    for (const item of catalog) {
      next[item.sku] = 0;
    }
    for (const line of DEMO_CART) {
      if (catalog.some((i) => i.sku === line.sku)) {
        next[line.sku] = line.quantity;
      }
    }
    setQty(next);
    setReceipt(null);
    setError("");
  }

  async function handleCheckout() {
    setError("");
    setSubmitting(true);
    try {
      const items = cartLines.map((line) => ({ sku: line.sku, quantity: line.quantity }));
      if (items.length === 0) {
        throw new Error("Add at least one item to your cart");
      }
      const idToken = await getFirebaseIdToken();
      const result = await PmesService.checkoutStore(email, items, idToken);
      setReceipt(result);
      setQty((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) next[key] = 0;
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 p-4 pb-20 pt-8 sm:p-8">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <B2CLogo size="lg" align="center" className="mb-4" />
          <ShoppingBag className="mx-auto h-12 w-12 text-[#004aad]" aria-hidden />
          <h1 className="mt-3 text-3xl font-black uppercase tracking-tighter text-[#004aad] sm:text-4xl">
            B2C Coop Store
          </h1>
          <p className="mt-2 text-base font-medium text-slate-600">
            Native marketplace for development — posts sales, vendor payable, COGS, and patronage to accounting.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/90 p-4 text-left text-sm text-amber-950">
          <p className="flex items-center gap-2 font-black uppercase tracking-wide text-amber-900">
            <FlaskConical className="h-5 w-5 shrink-0" aria-hidden />
            Dev testing store
          </p>
          <p className="mt-2 leading-relaxed">
            Use this store for ledger and patronage tests. You do <strong>not</strong> need the external Versa shop.
            Checkout is simulated (no real payment) and writes to the cooperative books when accounting is connected.
          </p>
        </div>

        {receipt ? (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-6 text-left">
            <p className="text-lg font-black text-emerald-800">Order confirmed</p>
            <p className="mt-2 text-sm text-emerald-900">
              Reference <code className="rounded bg-white/80 px-1">{receipt.externalId}</code> ·{" "}
              {formatPhp(receipt.grossAmount)}
            </p>
            <p className="mt-2 text-sm text-emerald-800">
              Check <strong>Journals</strong> in the Treasurer app (port 5174) and your <strong>Patronage refunds</strong> card on
              the member portal.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="text-sm font-bold text-[#004aad] underline"
              >
                Place another order
              </button>
              <button type="button" onClick={onBack} className="text-sm font-bold text-slate-700 underline">
                Back to portal (patronage)
              </button>
            </div>
          </div>
        ) : null}

        {!receipt && !loading ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadDemoCart}
              className="rounded-xl border border-[#004aad]/30 bg-[#004aad]/10 px-4 py-2 text-sm font-bold text-[#004aad]"
            >
              Load demo cart (rice + oil · ₱470)
            </button>
            <button
              type="button"
              onClick={() => setQty(Object.fromEntries(catalog.map((i) => [i.sku, 0])))}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Clear cart
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#004aad]" aria-hidden />
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat}>
                <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">{cat}</h2>
                <div className="space-y-3">
                  {catalog
                    .filter((item) => (item.category || "General") === cat)
                    .map((item) => (
                      <div
                        key={item.sku}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div>
                          <p className="font-black text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">
                            {item.sku} · vendor {item.vendorCode}
                          </p>
                          <p className="mt-1 text-lg font-bold text-[#004aad]">{formatPhp(item.unitPrice)}</p>
                          {item.patronagePerUnit > 0 ? (
                            <p className="text-xs font-semibold text-emerald-700">
                              Est. patronage {formatPhp(item.patronagePerUnit)} / unit
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name}`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 font-bold"
                            onClick={() =>
                              setQty((prev) => ({
                                ...prev,
                                [item.sku]: Math.max(0, (prev[item.sku] ?? 0) - 1),
                              }))
                            }
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center font-black">{qty[item.sku] ?? 0}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.name}`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#004aad]/30 bg-[#004aad]/5 font-bold text-[#004aad]"
                            onClick={() =>
                              setQty((prev) => ({
                                ...prev,
                                [item.sku]: Math.min(99, (prev[item.sku] ?? 0) + 1),
                              }))
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && cartLines.length > 0 ? (
          <div className="rounded-2xl border border-[#004aad]/20 bg-[#004aad]/5 p-5 space-y-2">
            <p className="font-black text-[#004aad]">Cart total: {formatPhp(cartTotal)}</p>
            <p className="text-sm font-semibold text-emerald-800">
              Est. patronage accrual: {formatPhp(patronageTotal)}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {cartLines.map((line) => (
                <li key={line.sku}>
                  {line.quantity}× {line.name} — {formatPhp(line.lineTotal)}
                  {line.linePatronage > 0 ? ` · patronage ${formatPhp(line.linePatronage)}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onBack} className="btn-secondary flex-1 py-4 font-black">
            Back to portal
          </button>
          <button
            type="button"
            disabled={submitting || loading || cartLines.length === 0}
            onClick={handleCheckout}
            className="btn-primary flex-1 py-4 font-black disabled:opacity-50"
          >
            {submitting ? "Processing…" : "Confirm checkout (dev)"}
          </button>
        </div>
      </div>
    </div>
  );
}
