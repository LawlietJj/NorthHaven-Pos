function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

function StatCard({ label, value, isCurrency = false, subtext }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-[0_2px_10px_rgba(15,23,42,0.045)]">
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      <p className="text-2xl font-semibold text-primary">
        {isCurrency ? formatCurrency(value) : value}
      </p>
      {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
    </div>
  );
}

export default StatCard;