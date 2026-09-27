import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ScanBarcode } from "lucide-react";
import { getProduct, createProduct, updateProduct, generateBarcode } from "../api/products";
import { listCategories } from "../api/categories";
import { listShops } from "../api/shops";
import { getCurrentUser } from "../api/auth";
import RestockModal from "../components/RestockModal";
import AdjustStockModal from "../components/AdjustStockModal";
import LoadingScreen from "../components/LoadingScreen";
import PrintLabelModal from "../components/PrintLabelModal";
import { uploadImage } from "../api/upload";
import { useToast } from "../components/ToastProvider";
import MoneyInput from "../components/MoneyInput";

function getStatus(quantity, lowStockLevel) {
  if (quantity === 0) return { label: "Out of Stock", className: "bg-red-100 text-red-700" };
  if (quantity <= lowStockLevel) return { label: "Low Stock", className: "bg-amber-100 text-amber-700" };
  return { label: "In Stock", className: "bg-emerald-100 text-emerald-700" };
}

function ProductForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { showToast } = useToast();
  const isOwner = user?.role === "owner";
  const canRecordPurchase = isOwner || user?.role === "manager";
  const isNew = mode === "create" || id === "new";

  const [shops, setShops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printLabelOpen, setPrintLabelOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newProductId, setNewProductId] = useState(null);

  const [form, setForm] = useState({
    shop_id: "",
    category_id: "",
    name: "",
    brand: "",
    barcode: "",
    selling_price: "",
    low_stock_level: "",
    image_url: "",
  });

  const [product, setProduct] = useState(null);

  const [restockOpen, setRestockOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    async function loadProductForm() {
      listShops().then(setShops);

      if (!isNew) {
        if (!id || !Number.isInteger(Number(id))) {
          showToast("This product link is invalid.", "error");
          setLoading(false);
          return;
        }

        getProduct(id)
          .then((data) => {
            setProduct(data);
            setForm({
              shop_id: data.shop_id,
              category_id: data.category_id,
              name: data.name,
              brand: data.brand || "",
              barcode: data.barcode || "",
              selling_price: data.selling_price,
              low_stock_level: data.low_stock_level,
              image_url: data.image_url || "",
            });
            listCategories(data.shop_id).then(setCategories).finally(() => setLoading(false));
          })
          .catch(() => {
            showToast("Could not load this product.", "error");
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }

    loadProductForm();
  }, [id, isNew, showToast]);

  function handleShopChange(shopId) {
    setForm((f) => ({ ...f, shop_id: shopId, category_id: "" }));
    if (shopId) listCategories(shopId).then(setCategories);
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (isNew) {
        const created = await createProduct({
          shop_id: Number(form.shop_id),
          category_id: Number(form.category_id),
          name: form.name,
          selling_price: Number(form.selling_price),
          low_stock_level: Number(form.low_stock_level) || 0,
          barcode: form.barcode || null,
          brand: form.brand || null,
          image_url: form.image_url || null,
        });
        setNewProductId(created.product_id);
        const barcodeResult = await generateBarcode(created.product_id);
        setForm((currentForm) => ({ ...currentForm, barcode: barcodeResult.barcode }));
        setPrintLabelOpen(true);
      } else {
        await updateProduct(id, {
          name: form.name,
          category_id: Number(form.category_id),
          selling_price: Number(form.selling_price),
          low_stock_level: Number(form.low_stock_level) || 0,
          image_url: form.image_url || null,
          brand: form.brand || null,
        });
        navigate("/products");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Could not save product.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      handleChange("image_url", url);
    } catch {
      showToast("Could not upload image. Try again.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateBarcode() {
    const result = await generateBarcode(id);
    setForm((f) => ({ ...f, barcode: result.barcode }));
  }

  function handleNewLabelPrinted() {
    setPrintLabelOpen(false);
    if (canRecordPurchase) setRestockOpen(true);
    else setAdjustOpen(true);
  }

  if (loading) return <LoadingScreen />;

  const status = product ? getStatus(product.quantity, product.low_stock_level) : null;
  const stockModalProductId = isNew ? newProductId : id;
  const stockModalShopId = isNew ? Number(form.shop_id) : product?.shop_id;

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/products")}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900 transition"
      >
        <ArrowLeft size={16} /> Back to Products
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-5 shadow-sm space-y-3">
          <div className="w-full aspect-square rounded-xl bg-bg border border-border overflow-hidden flex items-center justify-center relative">
            {uploading ? (
              <span className="text-text-muted text-sm">Uploading…</span>
            ) : form.image_url ? (
              <img src={form.image_url} alt={form.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-text-muted text-sm">No image</span>
            )}
          </div>
          <label className="block">
            <span className="sr-only">Upload product image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={uploading}
              className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-bg file:text-slate-700 file:text-sm disabled:opacity-60"
            />
          </label>
          {form.image_url && (
            <button onClick={() => handleChange("image_url", "")} className="text-xs text-red-600 hover:underline">
              Remove image
            </button>
          )}
        </div>

        <div className="lg:col-span-2 bg-surface rounded-xl p-5 shadow-sm space-y-4">
          <p className="text-sm font-medium text-slate-900">Product Information</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Barcode</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.barcode}
                  placeholder={isNew ? "Optional — scan or leave blank" : ""}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                  disabled={!isNew}
                  className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent disabled:bg-bg disabled:text-text-secondary"
                />
                {!isNew && !form.barcode && (
                  <button
                    onClick={handleGenerateBarcode}
                    title="Generate barcode"
                    className="h-10 w-10 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-accent transition"
                  >
                    <ScanBarcode size={16} />
                  </button>
                )}
              </div>
              {!isNew && form.barcode && (
                <button
                  onClick={() => setPrintLabelOpen(true)}
                  className="mt-2 text-sm font-medium text-accent hover:underline"
                >
                  Print Label
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Shop *</label>
              <select
                value={form.shop_id}
                onChange={(e) => handleShopChange(e.target.value)}
                disabled={!isNew}
                className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none disabled:bg-bg disabled:text-text-secondary"
              >
                <option value="">Select shop</option>
                {shops.map((s) => (
                  <option key={s.shop_id} value={s.shop_id}>
                    {s.shop_code} — {s.shop_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Category *</label>
              <select
                value={form.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                disabled={!form.shop_id}
                className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none disabled:bg-bg"
              >
                <option value="">Select category</option>
                {categories
                  .filter((c) => !c.parent_category_id)
                  .map((parent) => (
                    <optgroup key={parent.category_id} label={parent.name}>
                      <option value={parent.category_id}>{parent.name} (general)</option>
                      {categories
                        .filter((c) => c.parent_category_id === parent.category_id)
                        .map((sub) => (
                          <option key={sub.category_id} value={sub.category_id}>
                            {sub.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Optional"
                className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Selling Price (₦) *</label>
              <MoneyInput
                value={form.selling_price}
                onChange={(raw) => handleChange("selling_price", raw)}
                className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isOwner && !isNew && (
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Cost Price (₦)</label>
                <div className="h-10 px-3 rounded-lg border border-border bg-bg flex items-center text-sm text-text-secondary">
                  {product?.cost_price != null ? `₦${Number(product.cost_price).toLocaleString()}` : "Not yet purchased"}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Reorder Level</label>
              <input
                type="number"
                value={form.low_stock_level}
                onChange={(e) => handleChange("low_stock_level", e.target.value)}
                placeholder = "Minimum number of product avialable before restocking"
                className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          {!isNew && product && status && (
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Stock Quantity</label>
              <div className="flex items-center gap-3">
                <div className="h-10 px-3 rounded-lg border border-border bg-bg flex items-center text-sm text-slate-900 min-w-25">
                  {product?.quantity}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
                <div className="flex-1" />
                {canRecordPurchase && (
                  <button
                    onClick={() => setRestockOpen(true)}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Restock
                  </button>
                )}
                <button
                  onClick={() => setAdjustOpen(true)}
                  className="text-sm font-medium text-text-secondary hover:underline"
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isNew && product?.stats && (
        <div className="bg-surface rounded-xl p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">Total Sold</p>
            <p className="text-lg font-semibold text-slate-900">{product.stats.total_sold}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Total Revenue</p>
            <p className="text-lg font-semibold text-slate-900">
              ₦{Number(product.stats.total_revenue).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Created</p>
            <p className="text-sm text-slate-700">{new Date(product.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Last Updated</p>
            <p className="text-sm text-slate-700">{new Date(product.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate("/products")}
          className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-slate-700 hover:bg-bg transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-800 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : isNew ? "Create Product" : "Update Product"}
        </button>
      </div>

      {restockOpen && (
        <RestockModal
          productId={stockModalProductId}
          shopId={stockModalShopId}
          onClose={() => {
            setRestockOpen(false);
            if (isNew && newProductId) navigate(`/products/${newProductId}`);
          }}
          onSuccess={() => {
            setRestockOpen(false);
            if (isNew && newProductId) {
              showToast("Product and opening stock recorded successfully.");
              navigate(`/products/${newProductId}`);
            } else {
              getProduct(id).then(setProduct);
            }
          }}
        />
      )}

      {printLabelOpen && (
        <PrintLabelModal
          product={{ ...form, product_id: isNew ? newProductId : id, quantity: product?.quantity }}
          onClose={() => {
            setPrintLabelOpen(false);
            if (isNew && newProductId) navigate(`/products/${newProductId}`);
          }}
          onPrinted={isNew ? handleNewLabelPrinted : undefined}
        />
      )}

      {adjustOpen && (
        <AdjustStockModal
          productId={stockModalProductId}
          shopId={stockModalShopId}
          onClose={() => {
            setAdjustOpen(false);
            if (isNew && newProductId) navigate(`/products/${newProductId}`);
          }}
          onSuccess={() => {
            setAdjustOpen(false);
            if (isNew && newProductId) {
              showToast("Product and opening stock recorded successfully.");
              navigate(`/products/${newProductId}`);
            } else {
              getProduct(id).then(setProduct);
            }
          }}
        />
      )}
    </div>
  );
}

export default ProductForm;