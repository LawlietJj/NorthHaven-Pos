import { useEffect, useState, useRef } from "react";
import { Search, Trash2, PauseCircle, Plus, Minus, X, Banknote, CreditCard, Landmark, LoaderCircle } from "lucide-react";
import { listProducts } from "../api/products";
import { lookupByBarcode, checkout, holdCart, getHeldCart, deleteHeldCart } from "../api/pos";
import { getCurrentUser } from "../api/auth";
import HeldCartsModal from "../components/HeldCartsModal";
import { getReceipt } from "../api/pos";
import ReceiptModal from "../components/RecieptModal";
import { useToast } from "../components/ToastProvider";
import MoneyInput from "../components/MoneyInput";

function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}

const METHODS = [
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "transfer", label: "Bank Transfer", icon: Landmark },
];

function POS() {
  const user = getCurrentUser();
  const { showToast } = useToast();
  const inputRef = useRef(null);
  const searchRequestRef = useRef(0);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [cart, setCart] = useState([]); 
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searching, setSearching] = useState(false);

  const [method, setMethod] = useState("cash");
  const [tendered, setTendered] = useState("");
  const [discount, setDiscount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [heldModalOpen, setHeldModalOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  useEffect(() => {
      function handleGlobalKeyDown(e) {
        if (e.key === "Escape") {
          inputRef.current?.focus();
        }
      }
      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
  }
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    const timeoutId = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const products = await listProducts({ search: trimmedQuery });
        if (searchRequestRef.current === requestId) {
          setSuggestions(products);
          if (products.length === 0) setError("No product found matching that search.");
        }
      } catch (err) {
        if (searchRequestRef.current === requestId) {
          setSuggestions([]);
          setError(err.response?.data?.error || "Could not search products.");
        }
      } finally {
        if (searchRequestRef.current === requestId) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const subtotalByShop = cart.reduce((acc, item) => {
    acc[item.shop_code] = (acc[item.shop_code] || 0) + item.selling_price * item.quantity;
    return acc;
  }, {});
  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  // A fixed amount typed at the till (not a percentage), off the whole sale.
  const discountAmount = Number(discount) || 0;
  const discountTooLarge = discountAmount > subtotal;
  const total = Math.max(0, subtotal - discountAmount);
  const change = Number(tendered) - total;

  function notifyError(message) {
    setError(message);
    showToast(message, "error");
  }

  function notifySuccess(message) {
    setNotice(message);
    showToast(message);
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          name: product.name,
          shop_code: product.shops?.shop_code || product.shop_code,
          selling_price: Number(product.selling_price),
          quantity: 1,
        },
      ];
    });
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  }

  async function handleScanOrSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setError("");
    setSearching(true);
    try {
      const result = await lookupByBarcode(query.trim());
      if (result.matches.length === 1) {
        addToCart(result.matches[0]);
      } else {
        setSuggestions(result.matches);
      }
    } catch (err) {
      // Not a valid barcode — fall back to name search
      const matches = await listProducts({ search: query.trim() });
      if (matches.length === 0) {
        setError("No product found matching that barcode or name.");
      } else {
        setSuggestions(matches);
      }
    } finally {
      setSearching(false);
    }
  }

  function updateQuantity(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function clearCart() {
    setCart([]);
    setTendered("");
    setDiscount("");
    setError("");
  }

  async function handleHold() {
    if (cart.length === 0) return;
    try {
      await holdCart({
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      notifySuccess("Order held.");
      clearCart();
    } catch (err) {
      notifyError(err.response?.data?.error || "Could not hold this order.");
    }
  }

  async function handleResume(heldCartId) {
    const held = await getHeldCart(heldCartId);
    const products = await listProducts();
    const restored = held.items
      .map((item) => {
        const product = products.find((p) => p.product_id === item.product_id);
        if (!product) return null;
        return {
          product_id: product.product_id,
          name: product.name,
          shop_code: product.shop_code,
          selling_price: Number(product.selling_price),
          quantity: item.quantity,
        };
      })
      .filter(Boolean);
    setCart(restored);
    await deleteHeldCart(heldCartId);
    setHeldModalOpen(false);
  }

  async function handleCompleteSale() {
    setError("");
    if (cart.length === 0) return notifyError("Cart is empty.");
    if (discountTooLarge) return notifyError("Discount cannot be more than the sale total.");
    if (!tendered || Number(tendered) < total) {
      return notifyError("Amount tendered must be at least the total.");
    }

    setProcessing(true);
    try {
      const result = await checkout({
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        payment: { method, amount_tendered: Number(tendered) },
        discount_amount: discountAmount,
      });
     const fullReceipt = await getReceipt(result.transaction_id);
      setReceipt(fullReceipt);
      clearCart();
    } catch (err) {
      notifyError(err.response?.data?.error || "Could not complete sale.");
    } finally {
      setProcessing(false);
    }
  }
  function handleTenderedKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCompleteSale();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">New Sale</h2>
        <button
          onClick={() => setHeldModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-slate-700 hover:bg-bg"
        >
          <PauseCircle size={16} /> Held Orders
        </button>
      </div>

      {/* Scan/search bar */}
      <form onSubmit={handleScanOrSearch} className="relative w-full max-w-2xl">
        <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3 shadow-sm">
          {searching ? (
            <LoaderCircle size={16} className="loading-ring text-accent" aria-label="Searching" />
          ) : (
            <Search size={16} className="text-text-muted" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan barcode or search product..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto bg-surface border border-border rounded-xl shadow-lg overflow-x-hidden">
            {suggestions.map((p) => (
              <button
                key={p.product_id}
                type="button"
                onClick={() => addToCart(p)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg text-left"
              >
                <span className="text-slate-900">{p.name}</span>
                <span className="text-text-secondary">
                  {p.shops?.shop_code || p.shop_code} · {formatCurrency(p.selling_price)}
                </span>
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-900">Cart ({cart.length} items)</p>
            <div className="flex gap-3">
              <button onClick={handleHold} disabled={cart.length === 0} className="text-sm text-accent hover:underline disabled:opacity-40">
                Hold Order
              </button>
              <button onClick={clearCart} disabled={cart.length === 0} className="text-sm text-text-secondary hover:text-red-600 disabled:opacity-40">
                Clear Cart
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="py-2 font-medium">#</th>
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium">Qty</th>
                <th className="py-2 font-medium">Total</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, i) => (
                <tr key={item.product_id} className="border-b border-border last:border-0">
                  <td className="py-3 text-text-secondary">{i + 1}</td>
                  <td className="py-3">
                    <p className="text-slate-900">{item.name}</p>
                    <p className="text-xs text-text-secondary">{item.shop_code}</p>
                  </td>
                  <td className="py-3 text-text-secondary">{formatCurrency(item.selling_price)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.product_id, -1)} className="w-6 h-6 rounded bg-bg flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, 1)} className="w-6 h-6 rounded bg-bg flex items-center justify-center">
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 font-medium text-slate-900">{formatCurrency(item.selling_price * item.quantity)}</td>
                  <td className="py-3">
                    <button onClick={() => removeItem(item.product_id)} className="text-text-secondary hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">Cart is empty — scan or search a product.</td>
                </tr>
              )}
            </tbody>
          </table>

          {Object.keys(subtotalByShop).length > 1 && (
            <div className="mt-4 pt-3 border-t border-border space-y-1">
              {Object.entries(subtotalByShop).map(([shop, amount]) => (
                <div key={shop} className="flex justify-between text-xs text-text-secondary">
                  <span>{shop} subtotal</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment panel */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          {discountAmount > 0 && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-900">Total</span>
            <span className="text-2xl font-semibold text-slate-900">{formatCurrency(total)}</span>
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-2">Payment Method</p>
            <div className="flex gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
                    method === m.key ? "bg-primary text-white" : "bg-bg text-text-secondary"
                  }`}
                >
                 <div className="flex flex-col items-center gap-1">
                  <m.icon size={18} aria-hidden="true" />
                  <span className="text-[12px] leading-tight">{m.label}</span>
                </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Amount Tendered</label>
            <MoneyInput
                value={tendered}
                onChange={setTendered}
                onKeyDown={handleTenderedKeyDown}
                className="w-full h-11 px-3 rounded-lg border border-border text-lg outline-none focus:border-accent"
                placeholder="0"
              />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Discount (₦, optional)</label>
            <MoneyInput
              value={discount}
              onChange={setDiscount}
              className={`w-full h-11 px-3 rounded-lg border text-lg outline-none focus:border-accent ${
                discountTooLarge ? "border-red-400" : "border-border"
              }`}
              placeholder="0"
            />
            {discountTooLarge && (
              <p className="mt-1 text-xs text-red-600">Discount cannot be more than the sale total.</p>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Change Due</span>
            <span className="font-medium text-slate-900">
              {tendered && change >= 0 ? formatCurrency(change) : "—"}
            </span>
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={processing || cart.length === 0}
            className="w-full py-3 rounded-lg bg-accent text-white font-medium disabled:opacity-60"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle size={16} className="loading-ring" aria-hidden="true" />
                Processing…
              </span>
            ) : "Complete Sale"}
          </button>
        </div>
      </div>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
       
      {heldModalOpen && (
        <HeldCartsModal onClose={() => setHeldModalOpen(false)} onResume={handleResume} />
      )}
    </div>
  );
}

export default POS;