import { useEffect, useMemo, useState } from "react";
import { FolderTree, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../api/categories";
import { getCurrentUser } from "../api/auth";
import { listShops } from "../api/shops";
import LoadingScreen from "../components/LoadingScreen";

const emptyForm = { name: "", description: "", shop_id: "", parent_category_id: "" };

function Categories() {
  const user = getCurrentUser();
  const isOwner = user?.role === "owner";

  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // formMode: null | "parent" | "sub" | "edit"
  const [formMode, setFormMode] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setError("");
    try {
      const [categoryData, shopData] = await Promise.all([listCategories(), listShops()]);
      setCategories(categoryData);
      setShops(shopData);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load categories. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCategories() {
      await refresh();
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => setNotice(""), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const shopById = useMemo(() => Object.fromEntries(shops.map((s) => [s.shop_id, s])), [shops]);

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((c) => {
      const matchesShop = !shopFilter || c.shop_id === Number(shopFilter);
      const matchesSearch = !query || `${c.name} ${c.description || ""}`.toLowerCase().includes(query);
      return matchesShop && matchesSearch;
    });
  }, [categories, search, shopFilter]);

  const topLevel = visibleCategories.filter((c) => !c.parent_category_id);
  const subcategories = visibleCategories.filter((c) => c.parent_category_id);

  const childrenByParent = useMemo(() => {
    const grouped = {};
    subcategories.forEach((c) => {
      grouped[c.parent_category_id] = [...(grouped[c.parent_category_id] || []), c];
    });
    return grouped;
  }, [subcategories]);

  // Only real top-level categories in the chosen shop qualify as a parent.
  const availableParents = categories.filter(
    (c) => !c.parent_category_id && c.shop_id === Number(form.shop_id)
  );

  function openAddParent() {
    setEditingCategory(null);
    setForm({ ...emptyForm, shop_id: shopFilter || "" });
    setError("");
    setFormMode("parent");
  }

  function openAddSub() {
    setEditingCategory(null);
    setForm({ ...emptyForm, shop_id: shopFilter || "" });
    setError("");
    setFormMode("sub");
  }

  function openEdit(category) {
    setEditingCategory(category);
    setForm({ name: category.name, description: category.description || "", shop_id: category.shop_id, parent_category_id: "" });
    setError("");
    setFormMode("edit");
  }

  function closeForm() {
    if (!saving) setFormMode(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (formMode === "edit") {
        await updateCategory(editingCategory.category_id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        });
        setNotice("Category updated.");
      } else {
        await createCategory({
          shop_id: Number(form.shop_id),
          name: form.name.trim(),
          description: form.description.trim() || null,
          parent_category_id: formMode === "sub" ? Number(form.parent_category_id) : null,
        });
        setNotice(formMode === "parent" ? "Parent category created." : "Subcategory created.");
      }
      setFormMode(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`Delete "${category.name}"? Categories with products or subcategories cannot be deleted.`)) return;
    setError("");
    setNotice("");
    try {
      await deleteCategory(category.category_id);
      setNotice("Category deleted.");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete category.");
    }
  }

  if (loading) return <LoadingScreen label="Loading categories" />;

  const formTitle = formMode === "edit" ? "Edit Category" : formMode === "parent" ? "Add Parent Category" : "Add Subcategory";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">Organize products into clear, shop-specific groups.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 shadow-sm">{categories.length} total categories</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 shadow-sm">{topLevel.length} parent groups</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 shadow-sm">{subcategories.length} subcategories</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={openAddParent}
              className="flex items-center justify-center gap-2 rounded-lg border border-accent px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-blue-50"
            >
              <Plus size={16} /> Add Parent Category
            </button>
          )}
          <button
            onClick={openAddSub}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            <Plus size={16} /> Add Subcategory
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3 shadow-md">
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="h-10 w-full rounded-lg border border-border pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="h-10 rounded-lg border border-border px-3 text-sm text-slate-700 outline-none focus:border-accent"
        >
          <option value="">All shops</option>
          {shops.map((s) => (
            <option key={s.shop_id} value={s.shop_id}>
              {s.shop_code} — {s.shop_name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl bg-surface shadow-md">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-text-secondary md:grid">
          <span>Category</span><span>Description</span><span>Shop</span><span>Actions</span>
        </div>
        {topLevel.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <FolderTree className="mx-auto text-slate-300" size={34} />
            <p className="mt-3 text-sm font-medium text-slate-700">No categories found</p>
            <p className="mt-1 text-sm text-text-secondary">
              {isOwner ? "Start by adding a parent category." : "Ask the Owner to set up a parent category first."}
            </p>
          </div>
        ) : (
          topLevel.map((category) => (
            <div key={category.category_id} className="border-b border-border last:border-0">
              <CategoryRow category={category} shop={shopById[category.shop_id]} onEdit={openEdit} onDelete={handleDelete} />
              {(childrenByParent[category.category_id] || []).map((child) => (
                <CategoryRow key={child.category_id} category={child} shop={shopById[child.shop_id]} onEdit={openEdit} onDelete={handleDelete} isChild />
              ))}
            </div>
          ))
        )}
      </div>

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4" onMouseDown={closeForm}>
          <form onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{formTitle}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {formMode === "parent" && "Top-level categories organize your subcategories underneath them."}
                  {formMode === "sub" && "Choose which parent category this belongs under."}
                  {formMode === "edit" && "Keep names short and easy to scan at the point of sale."}
                </p>
              </div>
              <button type="button" onClick={closeForm} className="text-text-muted hover:text-slate-700" aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-secondary">Category name *</span>
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-accent"
                />
              </label>

              {formMode !== "edit" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-text-secondary">Shop *</span>
                  <select
                    required
                    value={form.shop_id}
                    onChange={(e) => setForm({ ...form, shop_id: e.target.value, parent_category_id: "" })}
                    className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-accent"
                  >
                    <option value="">Select a shop</option>
                    {shops.map((s) => (
                      <option key={s.shop_id} value={s.shop_id}>
                        {s.shop_code} — {s.shop_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {formMode === "sub" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-text-secondary">Parent category *</span>
                  <select
                    required
                    value={form.parent_category_id}
                    onChange={(e) => setForm({ ...form, parent_category_id: e.target.value })}
                    disabled={!form.shop_id}
                    className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-accent disabled:bg-bg"
                  >
                    <option value="">{form.shop_id ? "Select a parent category" : "Select a shop first"}</option>
                    {availableParents.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {form.shop_id && availableParents.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No parent categories exist yet for this shop{isOwner ? " — add one first." : "; ask the Owner to add one."}
                    </p>
                  )}
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-secondary">Description</span>
                <textarea
                  maxLength={255}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="rounded-lg border border-border px-4 py-2 text-sm text-slate-700">
                Cancel
              </button>
              <button
                disabled={saving || (formMode === "sub" && availableParents.length === 0)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : formMode === "edit" ? "Save changes" : "Create category"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category, shop, onEdit, onDelete, isChild = false }) {
  return (
    <div className={`grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-4 ${isChild ? "bg-slate-50/70" : ""}`}>
      <div className={`flex min-w-0 items-center gap-3 ${isChild ? "pl-6" : ""}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isChild ? "bg-white text-slate-400" : "bg-blue-50 text-accent"}`}>
          <FolderTree size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {isChild && <span className="mr-1 text-text-muted">↳</span>}
            {category.name}
          </p>
          <p className="text-xs text-text-muted md:hidden">{shop?.shop_code || "Unknown shop"}</p>
        </div>
      </div>
      <p className="truncate pl-12 text-sm text-text-secondary md:pl-0">{category.description || "No description"}</p>
      <p className="hidden text-sm text-text-secondary md:block">{shop?.shop_code || "Unknown shop"}</p>
      <div className="flex items-center gap-3 pl-12 md:pl-0">
        <button onClick={() => onEdit(category)} className="text-text-secondary transition hover:text-accent" title="Edit category" aria-label={`Edit ${category.name}`}>
          <Pencil size={16} />
        </button>
        <button onClick={() => onDelete(category)} className="text-text-secondary transition hover:text-red-600" title="Delete category" aria-label={`Delete ${category.name}`}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default Categories;