import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-primary">{label}</p>
      <p className="mt-0.5 text-text-secondary">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// data: [{ label, revenue, highlight? }]. `highlight` picks out one bar (e.g. today / the latest bucket) in accent color.
function RevenueChart({ data, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-bg)" }} />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill="var(--color-accent)"
              fillOpacity={entry.highlight ? 1 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default RevenueChart;
