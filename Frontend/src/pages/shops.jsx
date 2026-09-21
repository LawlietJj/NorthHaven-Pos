import { useEffect, useState } from "react";
import { MapPin, Phone, Store, UserCheck, UserX } from "lucide-react";
import { listShops, updateShop, deactivateShop, reactivateShop } from "../api/shops";
import LoadingScreen from "../components/LoadingScreen";
import { useToast } from "../components/ToastProvider";

function Shops() {
  const { showToast } = useToast();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ shop_name: "", address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setShops(await listShops());
      setError("");
    } catch (err) {
      const message = err.response?.data?.error || "Could not load shops.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(shop) {
    setEditingId(shop.shop_id);
    setForm({ shop_name: shop.shop_name, address: shop.address || "", phone: shop.phone || "" });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  async function handleSave(shopId) {
    setSaving(true);
    setError("");
    try {
      await updateShop(shopId, form);
      setNotice("Shop updated.");
      showToast("Shop updated.");
      setEditingId(null);
      refresh();
    } catch (err) {
      const message = err.response?.data?.error || "Could not update shop.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(shop) {
    try {
      if (shop.is_active) await deactivateShop(shop.shop_id);
      else await reactivateShop(shop.shop_id);
      showToast(shop.is_active ? "Shop deactivated." : "Shop reactivated.");
      refresh();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not update shop status.", "error");
    }
  }

  if (loading) return <LoadingScreen label="Loading shops" />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between border-b border-border pb-4">
        <div><p className="text-xl font-semibold text-primary">Shops</p><p className="mt-1 text-sm text-text-secondary">Manage shop details and availability.</p></div>
        <span className="text-xs text-text-muted">{shops.length} location(s)</span>
      </div>

      {notice && <div className="rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">{notice}</div>}

      {error && !editingId && (
        <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {shops.map((shop) => {
          const isEditing = editingId === shop.shop_id;
          return (
            <div key={shop.shop_id} className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-orange-50 text-accent flex items-center justify-center">
                    <Store size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary">{shop.shop_code}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        shop.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {shop.is_active ? "Active" : "Deactivated"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(shop)}
                  className="text-text-secondary hover:text-accent"
                  title={shop.is_active ? "Deactivate" : "Reactivate"}
                >
                  {shop.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                </button>
              </div>

              {error && isEditing && <p className="text-sm text-red-600">{error}</p>}

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Shop Name</label>
                    <input
                      type="text"
                      value={form.shop_name}
                      onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Address</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Phone</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg border border-border text-sm">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(shop.shop_id)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-base text-primary font-semibold">{shop.shop_name}</p>
                  <p className="flex items-center gap-2 text-sm text-text-secondary"><MapPin size={14} className="text-accent" />{shop.address || "No address set"}</p>
                  <p className="flex items-center gap-2 text-sm text-text-secondary"><Phone size={14} className="text-accent" />{shop.phone || "No phone set"}</p>
                  <button onClick={() => startEdit(shop)} className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm text-primary hover:border-accent hover:text-accent">Edit details</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {shops.length === 0 && !error && (
        <div className="rounded-xl border border-border bg-surface px-5 py-10 text-center text-sm text-text-secondary">
          No shops found.
        </div>
      )}
    </div>
  );
}

export default Shops;