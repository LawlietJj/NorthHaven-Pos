import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

function ComparisonTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-primary">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-1 flex items-center gap-1.5 text-text-secondary">
          <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}:{" "}
          <span className="font-medium text-primary">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// data: [{ label, thisWeek, lastWeek }], both series aligned by weekday.
function WeekComparisonChart({ data, height = 160 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
        />
        <Tooltip content={<ComparisonTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
        <Legend
          verticalAlign="top"
          align="right"
          height={24}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: "var(--color-text-secondary)" }}
        />
        <Line
          type="monotone"
          dataKey="lastWeek"
          name="Last week"
          stroke="var(--color-text-muted)"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="thisWeek"
          name="This week"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: "var(--color-accent)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default WeekComparisonChart;
