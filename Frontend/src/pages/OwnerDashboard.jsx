import { useEffect, useState } from "react";
import { AlertTriangle, Package, TrendingUp, TrendingDown } from "lucide-react";
import { getOwnerOverview } from "../api/dashboard";
import LoadingScreen from "../components/LoadingScreen";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnerOverview()
      .then(setData)
      .catch(() => setError("Could not load dashboard data. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen label="Loading dashboard" />;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  const trendUp = data.week_trend.percent_change >= 0;
  const maxRevenue = Math.max(...data.daily_revenue_last_7_days.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-primary rounded-xl p-5 text-white">
          <p className="text-sm text-white/70 mb-1">Combined Sales Today</p>
          <p className="text-2xl font-semibold">{formatCurrency(data.today.combined.revenue)}</p>
          <p className="text-xs text-white/60 mt-1">{data.today.combined.sales_count} sale(s)</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-accent" />
            <p className="text-sm text-text-secondary">Total Products</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{data.total_products}</p>
          <p className="text-xs text-text-muted mt-1">across both shops</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-sm text-text-secondary">Low Stock Alerts</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{data.low_stock_count}</p>
          <p className="text-xs text-text-muted mt-1">at or below threshold</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-sm text-text-secondary mb-1">Potential Profit</p>
          <p className="text-2xl font-semibold text-slate-900">
            {formatCurrency(data.stock_value.potential_profit)}
          </p>
          <p className="text-xs text-text-muted mt-1">if all current stock sells</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5">
          <p className="text-sm font-medium text-slate-900 mb-6">Revenue — Last 7 Days</p>
          <div className="flex items-end justify-between gap-3 h-40">
            {data.daily_revenue_last_7_days.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-md ${day.is_today ? "bg-accent" : "bg-primary/20"}`}
                  style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 4)}%` }}
                  title={formatCurrency(day.revenue)}
                />
                <span className="text-xs text-text-secondary">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-sm font-medium text-slate-900 mb-4">This Week vs Last Week</p>
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
          <p className="text-xs text-text-muted mb-6">
            vs {formatCurrency(data.week_trend.last_week_revenue)} last week
          </p>

          <p className="text-sm font-medium text-slate-900 mb-3">Recent Activity</p>
          <div className="space-y-2">
            {data.recent_activity.slice(0, 5).map((activity) => (
              <div key={activity.transaction_id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 truncate">{activity.processed_by}</span>
                <span className="text-text-secondary">{formatCurrency(activity.total_amount)}</span>
              </div>
            ))}
            {data.recent_activity.length === 0 && (
              <p className="text-sm text-text-muted">No transactions yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-slate-900">Top Selling Products</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-secondary border-b border-border">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            {data.top_selling_products.map((product, i) => (
              <tr key={product.product_id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-text-secondary">{i + 1}</td>
                <td className="px-5 py-3 text-slate-900">{product.name}</td>
                <td className="px-5 py-3 text-text-secondary">{product.total_quantity_sold}</td>
              </tr>
            ))}
            {data.top_selling_products.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-text-muted">
                  No sales recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OwnerDashboard;