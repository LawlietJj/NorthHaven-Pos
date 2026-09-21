import { useEffect, useState } from "react";
import { AlertTriangle, Package, TrendingUp, TrendingDown, WalletCards } from "lucide-react";
import { getActivityLog, getOwnerOverview } from "../api/dashboard";
import { getNetProfit } from "../api/reports";
import LoadingScreen from "../components/LoadingScreen";
import RecentActivityList from "../components/RecentActivityList";
import RevenueChart from "../components/RevenueChart";
import WeekComparisonChart from "../components/WeekComparisonChart";
import { useToast } from "../components/ToastProvider";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

// Compact form for big totals, e.g. ₦1,500,000,000 -> ₦1.5B, ₦80,000,000 -> ₦80M.
function formatCompactCurrency(amount) {
  const num = Number(amount);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) return `${sign}₦${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${sign}₦${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return formatCurrency(num);
}

const NET_PROFIT_RANGES = [
  { key: "day", label: "D", title: "Today" },
  { key: "week", label: "W", title: "This week" },
  { key: "month", label: "M", title: "Last 4 weeks" },
  { key: "year", label: "Y", title: "Last 12 months" },
];

function OwnerDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState([]);

  const [netProfitRange, setNetProfitRange] = useState("week");
  const [netProfit, setNetProfit] = useState(null);
  const [netProfitLoadedRange, setNetProfitLoadedRange] = useState(null);
  const netProfitLoading = netProfitLoadedRange !== netProfitRange;

  useEffect(() => {
    Promise.all([getOwnerOverview(), getActivityLog()])
      .then(([overview, activities]) => {
        setData(overview);
        setActivityLog(activities);
      })
      .catch(() => {
        setError("Could not load dashboard data. Try refreshing.");
        showToast("Could not load dashboard data. Try refreshing.", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    let ignore = false;
    getNetProfit(netProfitRange)
      .then((result) => {
        if (!ignore) setNetProfit(result);
      })
      .catch(() => {
        if (!ignore) showToast("Could not load net profit.", "error");
      })
      .finally(() => {
        if (!ignore) setNetProfitLoadedRange(netProfitRange);
      });
    return () => {
      ignore = true;
    };
  }, [netProfitRange, showToast]);

  if (loading) return <LoadingScreen label="Loading dashboard" />;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  const trendUp = data.week_trend.percent_change >= 0;
  const revenueChartData = data.daily_revenue_last_7_days.map((d) => ({
    label: d.label,
    revenue: d.revenue,
    highlight: d.is_today,
  }));
  const weekComparisonData = data.week_trend.daily_this_week.map((d, i) => ({
    label: d.label,
    thisWeek: d.revenue,
    lastWeek: data.week_trend.daily_last_week[i]?.revenue ?? 0,
  }));

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-end justify-between border-b border-border pb-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Overview</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">Owner dashboard</h2><p className="mt-1 text-sm text-text-secondary">A clear view of sales, stock, and store momentum.</p></div>
        <span className="hidden text-xs text-text-muted sm:block">Updated today</span>
      </div>
      
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-primary p-5 text-white shadow-[0_10px_25px_rgba(0,51,153,0.16)]">
          <p className="text-sm text-white/70 mb-1">Combined Sales Today</p>
          <p className="text-2xl font-semibold">{formatCurrency(data.today.combined.revenue)}</p>
          <p className="text-xs text-white/60 mt-1">{data.today.combined.sales_count} sale(s)</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-accent" />
            <p className="text-sm text-text-secondary">Total Products</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{data.total_products}</p>
          <p className="text-xs text-text-muted mt-1">across both shops</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-sm text-text-secondary">Low Stock Alerts</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{data.low_stock_count}</p>
          <p className="text-xs text-text-muted mt-1">at or below threshold</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2"><WalletCards size={16} className="text-accent" /><p className="text-sm text-text-secondary">Net Profit</p></div>
            <div className="flex gap-0.5 rounded-md bg-bg p-0.5">
              {NET_PROFIT_RANGES.map((r) => (
                <button
                  key={r.key}
                  title={r.title}
                  onClick={() => setNetProfitRange(r.key)}
                  className={`h-5 w-5 rounded text-[10px] font-medium ${
                    netProfitRange === r.key ? "bg-surface shadow-sm text-primary" : "text-text-secondary"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <p
            className="text-2xl font-semibold text-slate-900"
            title={netProfit ? formatCurrency(netProfit.net_profit) : undefined}
          >
            {netProfitLoading ? "…" : formatCompactCurrency(netProfit?.net_profit || 0)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {NET_PROFIT_RANGES.find((r) => r.key === netProfitRange)?.title} · revenue minus cost of goods sold
          </p>
          {netProfit?.excluded_quantity > 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              {netProfit.excluded_quantity} unit(s) sold with no recorded cost excluded
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-semibold text-primary">Revenue overview</p><p className="mt-1 text-xs text-text-muted">Last 7 days</p></div><TrendingUp size={18} className="text-accent" /></div>
          <RevenueChart data={revenueChartData} height={200} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-primary">This week vs last week</p>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xl font-semibold text-slate-900">
              {formatCurrency(data.week_trend.this_week_revenue)}
            </p>
            {data.week_trend.percent_change !== null && (
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  trendUp ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(data.week_trend.percent_change).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mb-4">
            vs {formatCurrency(data.week_trend.last_week_revenue)} last week
          </p>
          <WeekComparisonChart data={weekComparisonData} height={140} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <RecentActivityList activities={activityLog} />
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-primary">Top selling products</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                {data.top_selling_products.map((product, i) => (
                  <tr key={product.product_id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="px-5 py-3 text-text-secondary">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-primary">{product.name}</td>
                    <td className="px-5 py-3 text-text-secondary">{product.total_quantity_sold}</td>
                  </tr>
                ))}
                {data.top_selling_products.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-text-muted">No sales recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard;