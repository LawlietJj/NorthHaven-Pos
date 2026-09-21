import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteProduct, listProducts } from "../api/products";
import { listCategories } from "../api/categories";
import { listShops } from "../api/shops";
import LoadingScreen from "../components/LoadingScreen";
import { useToast } from "../components/ToastProvider";

function getStatus(product) {
  if (product.quantity === 0) return { label: "Out of Stock", className: "bg-red-100 text-red-700" };
  if (product.quantity <= product.low_stock_level)
    return { label: "Low Stock", className: "bg-amber-100 text-amber-700" };
  return { label: "In Stock", className: "bg-emerald-100 text-emerald-700" };
}

const PAGE_SIZE = 8;

function Products() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const searchInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (e.key === "Escape") {
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    Promise.all([listCategories(), listShops()])
      .then(([categoriesData, shopsData]) => {
        setCategories(categoriesData);
        setShops(shopsData);
      })
      .catch(() => {
        setError("Could not load products. Try refreshing.");
        showToast("Could not load products. Try refreshing.", "error");
      });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, shopFilter, categoryFilter]);

  function refreshProducts() {
    setTableLoading(true);
    return listProducts({
      search: debouncedSearch || undefined,
      shop_id: shopFilter || undefined,
      category_id: categoryFilter || undefined,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        setError("Could not load products. Try refreshing.");
        showToast("Could not load products. Try refreshing.", "error");
      })
      .finally(() => {
        setLoading(false);
        setTableLoading(false);
      });
  }

  useEffect(() => {
    refreshProducts();
  }, [debouncedSearch, shopFilter, categoryFilter, page]);

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    try {
      await deleteProduct(product.product_id);
      showToast("Product deleted.");
      await refreshProducts();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not delete product.", "error");
    }
  }

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.category_id] = c.name));
    return map;
  }, [categories]);

  const shopById = useMemo(() => {
    const map = {};
    shops.forEach((s) => (map[s.shop_id] = s.shop_code));
    return map;
  }, [shops]);

  if (loading) return <LoadingScreen label="Loading products" />;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-2"><Package size={19} className="text-accent" /><p className="text-xl font-semibold text-primary">Products</p></div><p className="mt-1 text-sm text-text-secondary">Manage your catalogue, pricing, and stock levels.</p></div>
        <button
          onClick={() => navigate("/products/new")}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Filter size={16} className="text-accent" /><span>Filter catalogue</span></div>
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>

        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-bg px-3 text-sm text-text-secondary outline-none focus:border-accent"
        >
          <option value="">All Shops</option>
          {shops.map((s) => (
            <option key={s.shop_id} value={s.shop_id}>
              {s.shop_code} — {s.shop_name}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-bg px-3 text-sm text-text-secondary outline-none focus:border-accent"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.parent_category_id ? `— ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-[11px] uppercase tracking-wide text-text-muted">
              <th className="px-5 py-3 font-medium">Image</th>
              <th className="px-5 py-3 font-medium">Product Name</th>
              <th className="px-5 py-3 font-medium">Shop</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const status = getStatus(product);
              return (
                <tr key={product.product_id} className="border-b border-border transition last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <div className="w-10 h-10 rounded-lg bg-bg border border-border overflow-hidden flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-primary">{product.name}</td>
                  <td className="px-5 py-3 text-text-secondary">{shopById[product.shop_id]}</td>
                  <td className="px-5 py-3 text-text-secondary">{categoryById[product.category_id]}</td>
                  <td className="px-5 py-3 font-medium text-primary">₦{Number(product.selling_price).toLocaleString()}</td>
                  <td className="px-5 py-3 font-medium text-text-secondary">{product.quantity}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/products/${product.product_id}`)}
                        className="rounded-lg p-2 text-text-secondary transition hover:bg-orange-50 hover:text-accent"
                        title={`Edit ${product.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="rounded-lg p-2 text-text-secondary transition hover:bg-red-50 hover:text-red-600"
                        title={`Delete ${product.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table></div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">
            {tableLoading
              ? "Loading…"
              : `Showing ${products.length ? (page - 1) * PAGE_SIZE + 1 : 0}–${Math.min(page * PAGE_SIZE, total)} of ${total} products`}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Products;