import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../api/auth";
import {
  getRevenueTrend,
  getShopComparison,
  getPaymentBreakdown,
  getSalesLog,
} from "../api/reports";
import LoadingScreen from "../components/LoadingScreen";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

const RANGES = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const PAGE_SIZE = 8;

function getRangeBounds(range) {
  const now = new Date();
  let from;
  if (range === "day") {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    from = new Date(now);
    from.setDate(from.getDate() - 27);
    from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function Sales() {
  const user = getCurrentUser();
  const isOwner = user?.role === "owner";
  const canSeePaymentBreakdown = user?.role === "owner" || user?.role === "manager";
  const canSeeRevenueTrend = isOwner;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [range, setRange] = useState("week");
  const [trend, setTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(true);

  const [shopComparison, setShopComparison] = useState(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(true);

  const [salesLog, setSalesLog] = useState(null);
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  // Initial load — sales log + shop comparison (Owner only). Payment
  // breakdown is handled separately below since it's tied to `range`.
  useEffect(() => {
    const calls = [getSalesLog()];
    if (isOwner) calls.push(getShopComparison());

    Promise.all(calls)
      .then((results) => {
        setSalesLog(results[0]);
        if (isOwner) setShopComparison(results[1]);
      })
      .catch(() => setError("Could not load sales data. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  // Revenue Trend chart — Owner only, refetches on range change
  useEffect(() => {
    if (!canSeeRevenueTrend) {
      setTrendLoading(false);
      return;
    }
    setTrendLoading(true);
    getRevenueTrend(range).then(setTrend).finally(() => setTrendLoading(false));
  }, [range]);

  // Payment Breakdown — Owner/Manager, tied to the SAME shared range
  useEffect(() => {
    if (!canSeePaymentBreakdown) {
      setPaymentLoading(false);
      return;
    }
    setPaymentLoading(true);
    const { from, to } = getRangeBounds(range);
    getPaymentBreakdown({ from, to })
      .then(setPaymentBreakdown)
      .finally(() => setPaymentLoading(false));
  }, [range]);

  useEffect(() => {
    getSalesLog(dateFilter ? { date: dateFilter } : {}).then(setSalesLog);
    setPage(1);
  }, [dateFilter]);

  const maxRevenue = trend ? Math.max(...trend.buckets.map((b) => b.revenue), 1) : 1;

  const paginatedTransactions = useMemo(() => {
    if (!salesLog) return [];
    return salesLog.transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [salesLog, page]);

  const totalPages = salesLog ? Math.max(1, Math.ceil(salesLog.transactions.length / PAGE_SIZE)) : 1;

  if (loading) return <LoadingScreen label="Loading sales" />;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shared range filter — Owner/Manager only, drives chart + payment breakdown together */}
      {canSeePaymentBreakdown && (
        <div className="flex justify-end">
          <div className="flex gap-1 bg-bg rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  range === r.key ? "bg-surface shadow-sm text-slate-900" : "text-text-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Trend — Owner ONLY (duplicate of Manager Dashboard's chart otherwise) */}
      {canSeeRevenueTrend && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-900 mb-6">Revenue Trend</p>
          {trendLoading ? (
            <p className="text-sm text-text-secondary h-40 flex items-center justify-center">Loading…</p>
          ) : (
            <div className="flex items-end justify-between gap-1 h-40 overflow-x-auto">
              {trend.buckets.map((bucket, i) => (
                <div key={i} className="flex-1 min-w-5 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-accent/25"
                    style={{ height: `${Math.max((bucket.revenue / maxRevenue) * 100, 4)}%` }}
                    title={formatCurrency(bucket.revenue)}
                  />
                  <span className="text-[10px] text-text-secondary whitespace-nowrap">{bucket.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shop Comparison (Owner only, all-time) + Payment Breakdown (Owner/Manager, filtered), side by side */}
      {(isOwner || canSeePaymentBreakdown) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isOwner && shopComparison && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-900 mb-4">Shop Comparison (All-Time)</p>
              <div className="space-y-3">
                {shopComparison.shops.map((shop) => (
                  <div key={shop.shop_id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{shop.shop_code} — {shop.shop_name}</span>
                    <span className="text-slate-900 font-medium">
                      {formatCurrency(shop.total_revenue)}
                      <span className="text-text-muted font-normal"> ({shop.total_sales_count})</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <span className="text-slate-900 font-medium">Combined</span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(shopComparison.combined.total_revenue)}</span>
                </div>
              </div>
            </div>
          )}

          {canSeePaymentBreakdown && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-900 mb-4">
                Payment Method Breakdown ({RANGES.find((r) => r.key === range)?.label})
              </p>
              {paymentLoading ? (
                <p className="text-sm text-text-secondary">Loading…</p>
              ) : (
                <div className="space-y-3">
                  {paymentBreakdown?.by_method.map((m) => (
                    <div key={m.method} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 capitalize">{m.method}</span>
                      <span className="text-slate-900 font-medium">
                        {formatCurrency(m.total_amount)}
                        <span className="text-text-muted font-normal"> ({m.count})</span>
                      </span>
                    </div>
                  ))}
                  {(!paymentBreakdown || paymentBreakdown.by_method.length === 0) && (
                    <p className="text-sm text-text-muted">No payments recorded for this period.</p>
                  )}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="text-slate-900 font-medium">Total</span>
                    <span className="text-slate-900 font-semibold">
                      {formatCurrency(paymentBreakdown?.grand_total || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full Sales Log — everyone, independent date filter (not tied to the range buttons above) */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-slate-900">Sales Log</p>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-secondary border-b border-border">
              <th className="px-5 py-3 font-medium">Transaction</th>
              <th className="px-5 py-3 font-medium">Processed By</th>
              <th className="px-5 py-3 font-medium">Shops</th>
              <th className="px-5 py-3 font-medium">Payment</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((t) => (
              <tr key={t.transaction_id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-slate-900">#{t.transaction_id}</td>
                <td className="px-5 py-3 text-text-secondary">{t.cashier_name}</td>
                <td className="px-5 py-3 text-text-secondary">
                  {t.sales.map((s) => s.shops.shop_code).join(", ")}
                </td>
                <td className="px-5 py-3 text-text-secondary capitalize">
                  {(Array.isArray(t.payments) ? t.payments[0]?.method : t.payments?.method) || "—"}
                </td>
                <td className="px-5 py-3 text-slate-900 font-medium">{formatCurrency(t.total_amount)}</td>
                <td className="px-5 py-3 text-text-secondary">
                  {new Date(t.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {paginatedTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                  No sales found{dateFilter ? " for this date" : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-text-muted">
            {salesLog?.total_sales_count || 0} transaction(s) · {formatCurrency(salesLog?.total_revenue || 0)}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm text-slate-700">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sales;