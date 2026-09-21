import { useState } from "react";
import Modal from "./Modal";
import MoneyInput from "./MoneyInput";
import { createPurchaseBatch } from "../api/stock";

function RestockModal({ productId, shopId, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError("");
    setSaving(true);
    try {
      await createPurchaseBatch({
        shop_id: shopId,
        product_id: Number(productId),
        quantity: Number(quantity),
        total_cost: Number(totalCost),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Could not record purchase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Restock Product" onClose={onClose}>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <label className="block text-xs text-text-secondary mb-1.5">Quantity Purchased</label>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-full h-10 px-3 mb-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
      />
      <label className="block text-xs text-text-secondary mb-1.5">Total Cost Paid (₦)</label>
      <MoneyInput
        value={totalCost}
        onChange={setTotalCost}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
          {saving ? "Saving…" : "Record Purchase"}
        </button>
      </div>
    </Modal>
  );
}

export default RestockModal;