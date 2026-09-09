import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil,  } from "lucide-react";
import { listProducts } from "../api/products";
import { listCategories } from "../api/categories";
import { listShops } from "../api/shops";
import LoadingScreen from "../components/LoadingScreen";

function getStatus(product) {
  if (product.quantity === 0) return { label: "Out of Stock", className: "bg-red-100 text-red-700" };
  if (product.quantity <= product.low_stock_level)
    return { label: "Low Stock", className: "bg-amber-100 text-amber-700" };
  return { label: "In Stock", className: "bg-emerald-100 text-emerald-700" };
}

const PAGE_SIZE = 8;

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([listProducts(), listCategories(), listShops()])
      .then(([productsData, categoriesData, shopsData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
        setShops(shopsData);
      })
      .catch(() => setError("Could not load products. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

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

 
  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesShop = !shopFilter || p.shop_id === Number(shopFilter);
    const matchesCategory = !categoryFilter || p.category_id === Number(categoryFilter);
    return matchesSearch && matchesShop && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">Manage your store products</p>
        </div>
        <button
          onClick={() => navigate("/products/new")}
          className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-800 transition"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 bg-surface  rounded-xl p-3 shadow-md">
        <div className="relative flex-1 min-w-50">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
          />
        </div>

        <select
          value={shopFilter}
          onChange={(e) => {
            setShopFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg border border-border text-sm text-slate-700 outline-none"
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
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg border border-border text-sm text-slate-700 outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.parent_category_id ? `— ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface  rounded-xl overflow-hidden shadow-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-secondary border-b border-border">
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
            {paginated.map((product) => {
              const status = getStatus(product);
              return (
                <tr key={product.product_id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="w-10 h-10 rounded-lg bg-bg border border-border overflow-hidden flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-900">{product.name}</td>
                  <td className="px-5 py-3 text-text-secondary">{shopById[product.shop_id]}</td>
                  <td className="px-5 py-3 text-text-secondary">{categoryById[product.category_id]}</td>
                  <td className="px-5 py-3 text-slate-900">₦{Number(product.selling_price).toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-900">{product.quantity}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => navigate(`/products/${product.product_id}`)}
                      className="text-text-secondary hover:text-accent transition"
                    >
                      <Pencil size={16} />
                      
                    </button>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination — client-side for now, backend doesn't paginate yet */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-text-muted">
            Showing {paginated.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} products
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
            >
              Prev
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