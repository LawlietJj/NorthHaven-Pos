import { useEffect, useState } from "react";
import { PauseCircle, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { listHeldCarts, deleteHeldCart } from "../api/pos";

function HeldCartsModal({ onClose, onResume }) {
  const [held, setHeld] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    listHeldCarts().then(setHeld).finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleDiscard(id) {
    await deleteHeldCart(id);
    refresh();
  }

  return (
    <Modal title="Held Orders" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : held.length === 0 ? (
        <p className="text-sm text-text-muted">No orders on hold right now.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {held.map((h) => (
            <div key={h.held_cart_id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <PauseCircle size={16} className="text-warning" />
                <div>
                  <p className="text-sm text-primary">{h.label || `Order #${h.held_cart_id}`}</p>
                  <p className="text-xs text-text-secondary">
                    {h.item_count} item(s) · by {h.held_by_name} · {new Date(h.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => onResume(h.held_cart_id)} className="text-sm font-medium text-accent hover:underline">
                  Resume
                </button>
                <button onClick={() => handleDiscard(h.held_cart_id)} className="text-text-secondary hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default HeldCartsModal;