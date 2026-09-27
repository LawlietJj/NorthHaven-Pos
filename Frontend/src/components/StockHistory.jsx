function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function formatMoney(value) {
  return value == null ? "—" : `₦${Number(value).toLocaleString()}`;
}

function Pagination({ page, pageSize, totalPages, total, itemLabel, onPageChange }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 mt-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-muted">
        Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Owner sees purchase cost history; Manager sees the purchase history and the
// stock movement log (which also covers adjustments and sales).
function StockHistory({
  showPurchases,
  showMovements,
  purchaseBatches,
  purchasePage,
  purchasePageSize,
  purchaseTotalPages,
  purchaseTotal,
  onPurchasePageChange,
  movements,
  movementPage,
  movementPageSize,
  movementTotalPages,
  movementTotal,
  onMovementPageChange,
}) {
  return (
    <div className="space-y-4">
      {showPurchases && (
        <div className="bg-surface rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-primary mb-4">Recent Purchases</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Total Cost</th>
                  <th className="px-4 py-3 font-medium">Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {purchaseBatches.map((batch) => (
                  <tr key={batch.batch_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-secondary">{formatDate(batch.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-primary">{batch.product_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{batch.quantity}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatMoney(batch.total_cost)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatMoney(batch.unit_cost)}</td>
                  </tr>
                ))}
                {purchaseBatches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                      No purchases recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={purchasePage}
            pageSize={purchasePageSize}
            totalPages={purchaseTotalPages}
            total={purchaseTotal}
            itemLabel="purchase(s)"
            onPageChange={onPurchasePageChange}
          />
        </div>
      )}

      {showMovements && (
        <div className="bg-surface rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-primary mb-4">Stock Movement History</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.movement_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-secondary">{formatDate(movement.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-primary">{movement.product_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{movement.movement_type}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        movement.quantity >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                      No stock movements recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={movementPage}
            pageSize={movementPageSize}
            totalPages={movementTotalPages}
            total={movementTotal}
            itemLabel="movement(s)"
            onPageChange={onMovementPageChange}
          />
        </div>
      )}
    </div>
  );
}

export default StockHistory;
