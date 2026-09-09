import { useState } from "react";
import Modal from "./Modal";
import { createStockAdjustment } from "../api/stock";

function AdjustStockModal({ productId, shopId, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError("");
    setSaving(true);
    try {
      await createStockAdjustment({
        shop_id: shopId,
        product_id: Number(productId),
        quantity: Number(quantity),
        reason,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Could not adjust stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Adjust Stock" onClose={onClose}>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <label className="block text-xs text-text-secondary mb-1.5">
        Quantity Change (use negative for removal, e.g. -2)
      </label>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-full h-10 px-3 mb-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
      />
      <label className="block text-xs text-text-secondary mb-1.5">Reason</label>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. 2 damaged during handling"
        className="w-full h-10 px-3 mb-4 rounded-lg border border-border text-sm outline-none focus:border-accent"
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Apply Adjustment"}
        </button>
      </div>
    </Modal>
  );
}

export default AdjustStockModal;