function LowStockBadge({ quantity, threshold = 5 }) {
  const isLow = quantity <= threshold;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        isLow ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
      }`}
    >
      {isLow ? "Low stock" : "In stock"}
    </span>
  );
}

export default LowStockBadge;
