import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, CreditCard, Download, LayoutDashboard, LoaderCircle, Printer, Receipt, Store, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";
import { getCurrentUser } from "../api/auth";
import { getReceipt } from "../api/pos";
import { getPaymentBreakdown, getProfitMargins, getRevenueTrend, getSalesLog, getShopComparison } from "../api/reports";
import LoadingScreen from "../components/LoadingScreen";
import ReceiptModal from "../components/RecieptModal";
import RevenueChart from "../components/RevenueChart";
import { useToast } from "../components/ToastProvider";

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
  const from = new Date(now);
  if (range === "day") from.setHours(0, 0, 0, 0);
  if (range === "week") from.setDate(from.getDate() - 6);
  if (range === "month") from.setDate(from.getDate() - 27);
  if (range === "year") from.setMonth(from.getMonth() - 11, 1);
  if (range !== "day") from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function paymentMethod(transaction) {
  const payment = Array.isArray(transaction.payments) ? transaction.payments[0] : transaction.payments;
  return payment?.method || "—";
}

function Sales() {
  const { showToast } = useToast();
  const user = getCurrentUser();
  const isOwner = user?.role === "owner";
  const canSeePaymentBreakdown = user?.role === "owner" || user?.role === "manager";
  const canSeeRevenueTrend = isOwner;
  const [activeView, setActiveView] = useState(user?.role === "cashier" ? "log" : "dashboard");

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
  const [margins, setMargins] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState(null);

  async function openReceipt(transactionId) {
    if (loadingReceiptId) return;
    setLoadingReceiptId(transactionId);
    try {
      setReceipt(await getReceipt(transactionId));
    } catch (err) {
      showToast(err.response?.data?.error || "Could not load this receipt.", "error");
    } finally {
      setLoadingReceiptId(null);
    }
  }

  useEffect(() => {
    const calls = [getSalesLog({ page: 1, limit: PAGE_SIZE })];
    if (isOwner) calls.push(getShopComparison());
    if (isOwner) calls.push(getProfitMargins());

    Promise.all(calls)
      .then((results) => {
        setSalesLog(results[0]);
        let i = 1;
        if (isOwner) setShopComparison(results[i++]);
        if (isOwner) setMargins(results[i++]);
      })
      .catch(() => {
        setError("Could not load sales data. Try refreshing.");
        showToast("Could not load sales data. Try refreshing.", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canSeeRevenueTrend) {
      setTrendLoading(false);
      return;
    }
    setTrendLoading(true);
    getRevenueTrend(range).then(setTrend).finally(() => setTrendLoading(false));
  }, [range]);

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
    getSalesLog({ ...(dateFilter ? { date: dateFilter } : {}), page, limit: PAGE_SIZE }).then(setSalesLog);
  }, [dateFilter, page]);

  const transactions = salesLog?.transactions || [];
  const totalRevenue = Number(salesLog?.total_revenue || 0);
  const totalTransactions = Number(salesLog?.total_sales_count || transactions.length);
  const averageSale = totalTransactions ? totalRevenue / totalTransactions : 0;
  const trendChartData = trend
    ? trend.buckets.map((b, i) => ({
        label: b.label,
        revenue: Number(b.revenue),
        highlight: i === trend.buckets.length - 1,
      }))
    : [];

  const totalPages = salesLog?.totalPages || 1;

  async function exportSalesLog() {
    if (!totalTransactions) return;
    // Export the FULL filtered log, not just the current page of results.
    const full = await getSalesLog(dateFilter ? { date: dateFilter } : {});
    const rows = full.transactions.map((transaction) => ({
      "Transaction ID": transaction.transaction_id,
      Date: new Date(transaction.created_at).toLocaleString(),
      "Processed By": transaction.cashier_name,
      Shops: transaction.sales.map((sale) => sale.shops.shop_code).join(", "),
      "Payment Method": paymentMethod(transaction),
      "Discount (₦)": Number(transaction.discount_amount || 0),
      "Total Amount (₦)": Number(transaction.total_amount),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Log");
    XLSX.writeFile(workbook, `sales-log-${dateFilter || new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (loading) return <LoadingScreen label="Loading sales" />;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-lg bg-bg p-1">{user?.role !== "cashier" && <button onClick={() => setActiveView("dashboard")} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${activeView === "dashboard" ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-primary"}`}><LayoutDashboard size={15} /> Dashboard</button>}<button onClick={() => setActiveView("log")} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${activeView === "log" ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-primary"}`}><Receipt size={15} /> Sales Log</button></div>
      </div>

      {activeView === "dashboard" ? <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[{ label: "Total revenue", value: formatCurrency(totalRevenue), icon: TrendingUp, note: "All loaded sales" }, { label: "Transactions", value: totalTransactions.toLocaleString(), icon: Receipt, note: "Completed" }, { label: "Average sale", value: formatCurrency(averageSale), icon: BarChart3, note: "Per transaction" }].map((card) => <div key={card.label} className="rounded-xl border border-border bg-surface p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="rounded-lg bg-orange-50 p-2 text-accent"><card.icon size={17} /></span><span className="text-xs text-text-muted">{card.note}</span></div><p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{card.label}</p><p className="mt-1 text-2xl font-semibold text-primary">{card.value}</p></div>)}
      </div>

      {canSeeRevenueTrend && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6"><div><p className="text-sm font-semibold text-primary">Revenue trend</p><p className="mt-1 text-xs text-text-muted">How revenue is moving over time</p></div><div className="flex gap-1 bg-bg rounded-lg p-1">{RANGES.map((r) => <button key={r.key} onClick={() => setRange(r.key)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${range === r.key ? "bg-surface shadow-sm text-primary" : "text-text-secondary"}`}>{r.label}</button>)}</div></div>
          {trendLoading ? (
            <p className="text-sm text-text-secondary h-50 flex items-center justify-center">Loading…</p>
          ) : (
            <RevenueChart data={trendChartData} height={200} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          {canSeePaymentBreakdown && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4"><p className="text-sm font-semibold text-primary">Payment methods ({RANGES.find((r) => r.key === range)?.label})</p><CreditCard size={17} className="text-accent" /></div>
              {paymentLoading ? <p className="text-sm text-text-secondary">Loading...</p> : <div className="space-y-3">{paymentBreakdown?.by_method?.map((m) => <div key={m.method} className="flex items-center justify-between text-sm"><span className="text-text-secondary capitalize">{m.method}</span><span className="text-primary font-medium">{formatCurrency(m.total_amount)} <span className="text-text-muted font-normal">({m.count})</span></span></div>)}{(!paymentBreakdown || paymentBreakdown.by_method.length === 0) && <p className="text-sm text-text-muted">No payments recorded for this period.</p>}<div className="flex items-center justify-between text-sm pt-2 border-t border-border"><span className="text-primary font-medium">Total</span><span className="text-primary font-semibold">{formatCurrency(paymentBreakdown?.grand_total || 0)}</span></div></div>}
            </div>
          )}
          {isOwner && shopComparison && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><Store size={17} className="text-accent" /><p className="text-sm font-semibold text-primary">Shop performance</p></div>
              <div className="space-y-3">{shopComparison.shops.map((shop) => <div key={shop.shop_id} className="flex items-center justify-between text-sm"><span className="text-text-secondary">{shop.shop_code} — {shop.shop_name}</span><span className="text-primary font-medium">{formatCurrency(shop.total_revenue)}</span></div>)}<div className="flex items-center justify-between text-sm pt-2 border-t border-border"><span className="text-primary font-medium">Combined</span><span className="text-primary font-semibold">{formatCurrency(shopComparison.combined.total_revenue)}</span></div></div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {isOwner && margins && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm lg:row-span-2">
              <p className="text-sm font-semibold text-primary mb-4">Margin products</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Highest margin</p><div className="space-y-2">{margins.highest_margin.map((p) => <div key={p.product_id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-text-secondary">{p.name}</span><span className="font-medium text-emerald-600">{p.margin_percent.toFixed(0)}%</span></div>)}</div></div>
                <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-red-600">Lowest margin</p><div className="space-y-2">{margins.lowest_margin.map((p) => <div key={p.product_id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-text-secondary">{p.name}</span><span className="font-medium text-red-600">{p.margin_percent.toFixed(0)}%</span></div>)}</div></div>
              </div>
            </div>
          )}
        </div>
      </div>

      </> : null}

      {activeView === "log" && <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div><p className="text-base font-semibold text-primary">Sales log</p><p className="mt-1 text-xs text-text-muted">Review and export completed transactions.</p></div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border px-3"><CalendarDays size={15} className="text-text-muted" /><input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 bg-transparent text-xs outline-none"
            /></div>
            <button
              onClick={exportSalesLog}
              disabled={!totalTransactions}
              className="flex items-center gap-2 h-9 px-3 rounded-lg bg-accent text-xs font-semibold text-white hover:bg-accent-strong disabled:opacity-40"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="text-left text-text-secondary border-b border-border">
              <th className="px-5 py-3 font-medium">Transaction</th>
              <th className="px-5 py-3 font-medium">Processed By</th>
              <th className="px-5 py-3 font-medium">Shops</th>
              <th className="px-5 py-3 font-medium">Payment</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium text-right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.transaction_id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-semibold text-primary">#{t.transaction_id}</td>
                <td className="px-5 py-3 text-text-secondary">{t.cashier_name}</td>
                <td className="px-5 py-3 text-text-secondary">
                  {t.sales.map((s) => s.shops.shop_code).join(", ")}
                </td>
                <td className="px-5 py-3 text-text-secondary capitalize">{paymentMethod(t)}</td>
                <td className="px-5 py-3 text-right font-semibold text-primary">
                  {formatCurrency(t.total_amount)}
                  {Number(t.discount_amount) > 0 && (
                    <span className="block text-xs font-normal text-text-muted">
                      -{formatCurrency(t.discount_amount)} discount
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-text-secondary">
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openReceipt(t.transaction_id)}
                    disabled={loadingReceiptId !== null}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs text-primary hover:bg-bg disabled:opacity-50"
                    aria-label={`View and print receipt for transaction ${t.transaction_id}`}
                  >
                    {loadingReceiptId === t.transaction_id ? (
                      <LoaderCircle size={14} className="loading-ring" />
                    ) : (
                      <Printer size={14} />
                    )}
                    Receipt
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7}className="px-5 py-8 text-center text-text-muted">
                  No sales found{dateFilter ? " for this date" : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table></div>

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
      </div>}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

export default Sales;