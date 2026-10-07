import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";
import { getManagerOverview } from "../api/dashboard";
import { getLowStock, getRevenueTrend } from "../api/reports";
import LoadingScreen from "../components/LoadingScreen";
import { useToast } from "../components/ToastProvider";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

const RANGES = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

function ManagerDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [lowStockList, setLowStockList] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState("week");
  const [trend, setTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    Promise.all([getManagerOverview(), getLowStock()])
      .then(([overview, lowStock]) => {
        setData(overview);
        setLowStockList(lowStock);
      })
      .catch(() => {
        setError("Could not load dashboard data. Try refreshing.");
        showToast("Could not load dashboard data. Try refreshing.", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTrendLoading(true);
    getRevenueTrend(range)
      .then(setTrend)
      .finally(() => setTrendLoading(false));
  }, [range]);

  if (loading) return <LoadingScreen label="Loading dashboard" />;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
    );
  }

  const maxRevenue = trend ? Math.max(...trend.buckets.map((b) => b.revenue), 1) : 1;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-end justify-between border-b border-border pb-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Overview</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">Manager dashboard</h2><p className="mt-1 text-sm text-text-secondary">Keep stock healthy and understand daily sales movement.</p></div>
        <span className="hidden text-xs text-text-muted sm:block">Updated today</span>
      </div>
      {/* Product-focused stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-primary p-5 text-white shadow-[0_10px_25px_rgba(27,61,45,0.16)]">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-white/70" />
            <p className="text-sm text-white/70">Total Products</p>
          </div>
          <p className="text-2xl font-semibold">{data.total_products}</p>
          <p className="text-xs text-white/60 mt-1">across both shops</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-sm text-text-secondary">Low Stock Alerts</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{data.low_stock_count}</p>
          <p className="text-xs text-text-muted mt-1">need restocking soon</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm text-text-secondary mb-1">Stock Value (Retail)</p>
          <p className="text-2xl font-semibold text-slate-900">{formatCurrency(data.stock_value.retail_value)}</p>
          <p className="text-xs text-text-muted mt-1">what's on the shelves right now</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div><p className="text-sm font-semibold text-primary">Revenue overview</p><p className="mt-1 text-xs text-text-muted">Performance by selected period</p></div>
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

        {trendLoading ? (
          <LoadingScreen label="Loading revenue" />
        ) : (
          <div className="flex items-end justify-between gap-2 h-40">
            {trend.buckets.map((bucket, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-md ${i === trend.buckets.length - 1 ? "bg-accent" : "bg-primary/20"}`}
                  style={{ height: `${Math.max((bucket.revenue / maxRevenue) * 100, 4)}%` }}
                  title={formatCurrency(bucket.revenue)}
                />
                <span className="text-xs text-text-secondary">{bucket.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      {/* Low Stock table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-primary">Products needing restock</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Quantity Left</th>
              <th className="px-5 py-3 font-medium">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {lowStockList.slice(0, 6).map((item) => (
              <tr key={item.product_id} className="border-b border-border last:border-0 hover:bg-bg">
                <td className="px-5 py-3 font-medium text-primary">{item.name}</td>
                <td className="px-5 py-3 text-red-600 font-medium">{item.quantity}</td>
                <td className="px-5 py-3 text-text-secondary">{item.low_stock_level}</td>
              </tr>
            ))}
            {lowStockList.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-text-muted">
                  Nothing is low on stock right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><TrendingUp size={17} className="text-accent" /><p className="text-sm font-semibold text-primary">Top selling products</p></div>
          <div className="space-y-3">{data.top_selling_products.map((product, i) => <div key={product.product_id} className="flex items-center justify-between text-sm"><span className="text-text-secondary">{i + 1}. {product.name}</span><span className="text-primary font-medium">{product.total_quantity_sold} sold</span></div>)}{data.top_selling_products.length === 0 && <p className="text-sm text-text-muted">No sales recorded yet.</p>}</div>
        </div>
      </div>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/products")}
          className="rounded-xl border border-border bg-surface p-5 text-left shadow-sm transition hover:border-accent hover:shadow-md"
        >
          <p className="text-sm font-medium text-slate-900">Manage Products</p>
          <p className="text-xs text-text-secondary mt-1">Add, edit, or restock products</p>
        </button>
        <button
          onClick={() => navigate("/categories")}
          className="rounded-xl border border-border bg-surface p-5 text-left shadow-sm transition hover:border-accent hover:shadow-md"
        >
          <p className="text-sm font-medium text-slate-900">Manage Categories</p>
          <p className="text-xs text-text-secondary mt-1">Organize products into groups</p>
        </button>
      </div>
    </div>
  );
}

export default ManagerDashboard;