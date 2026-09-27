import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Boxes } from "lucide-react";
import { getCurrentUser } from "../api/auth";
import { listCategories } from "../api/categories";
import { createProduct, listProducts } from "../api/products";
import { listShops } from "../api/shops";
import { createPurchaseBatch, createStockAdjustment, listPurchaseBatches, listStockMovements } from "../api/stock";
import LoadingScreen from "../components/LoadingScreen";
import StockHistory from "../components/StockHistory";
import StockRecordForm from "../components/StockRecordForm";
import { useToast } from "../components/ToastProvider";

const PURCHASE_PAGE_SIZE = 10;
const MOVEMENT_PAGE_SIZE = 10;

function Stock() {
  const location = useLocation();
  const user = getCurrentUser();
  const isOwner = user?.role === "owner";
  const canRecordPurchase = isOwner || user?.role === "manager";
  const { showToast } = useToast();
  const shopSelectRef = useRef(null);
  const prefillShopId = location.state?.prefillShopId;
  const prefillProductId = location.state?.prefillProductId;

  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [purchaseBatches, setPurchaseBatches] = useState([]);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseTotalPages, setPurchaseTotalPages] = useState(1);
  const [purchaseTotal, setPurchaseTotal] = useState(0);
  const [movements, setMovements] = useState([]);
  const [movementPage, setMovementPage] = useState(1);
  const [movementTotalPages, setMovementTotalPages] = useState(1);
  const [movementTotal, setMovementTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("existing");
  const [existingMode, setExistingMode] = useState(canRecordPurchase ? "purchase" : "adjustment");
  const [existingShopId, setExistingShopId] = useState(prefillShopId ? String(prefillShopId) : "");
  const [existingProductId, setExistingProductId] = useState(prefillProductId ? String(prefillProductId) : "");
  const [existingQuantity, setExistingQuantity] = useState("");
  const [existingCost, setExistingCost] = useState("");
  const [existingReason, setExistingReason] = useState("");

  const [newShopId, setNewShopId] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newSellingPrice, setNewSellingPrice] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newCost, setNewCost] = useState("");

  async function loadPurchaseHistory(page = 1) {
    if (!canRecordPurchase) return;
    const res = await listPurchaseBatches({ page, limit: PURCHASE_PAGE_SIZE });
    setPurchaseBatches(res.data);
    setPurchasePage(res.page);
    setPurchaseTotalPages(res.totalPages);
    setPurchaseTotal(res.total);
  }

  async function loadMovementHistory(page = 1) {
    if (isOwner) return;
    const res = await listStockMovements({ page, limit: MOVEMENT_PAGE_SIZE });
    setMovements(res.data);
    setMovementPage(res.page);
    setMovementTotalPages(res.totalPages);
    setMovementTotal(res.total);
  }

  async function loadProductsForShop(shopId, selectedProductId = "") {
    setExistingProductId(selectedProductId);
    if (!shopId) {
      setProducts([]);
      return;
    }

    setLoadingProducts(true);
    try {
      const data = await listProducts({ shop_id: shopId });
      setProducts(data.filter((product) => product.shop_id === Number(shopId)));
    } catch {
      notifyError("Could not load products for this shop.");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    if (!loading) shopSelectRef.current?.focus();
  }, [loading, activeTab]);

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (e.key === "Escape") {
        shopSelectRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    async function loadPage() {
      try {
        const [shopsData] = await Promise.all([listShops(), loadPurchaseHistory(1), loadMovementHistory(1)]);
        setShops(shopsData);

        if (prefillShopId && prefillProductId) {
          setActiveTab("existing");
          setExistingMode(canRecordPurchase ? "purchase" : "adjustment");
          await loadProductsForShop(String(prefillShopId), String(prefillProductId));
        }
      } catch {
        notifyError("Could not load stock data. Try refreshing.");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
    // Runs once when the page opens; the loaders are recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!newShopId) return;
    listCategories(newShopId)
      .then(setCategories)
      .catch(() => showToast("Could not load categories for this shop.", "error"));
  }, [newShopId, showToast]);

  function handleNewShopChange(shopId) {
    setNewShopId(shopId);
    setNewCategoryId("");
    if (!shopId) setCategories([]);
  }

  function notifyError(message) {
    showToast(message, "error");
  }

  function notifySuccess(message) {
    showToast(message);
  }

  async function handleExistingSubmit() {
    if (!existingShopId || !existingProductId || !existingQuantity) {
      notifyError("Select a shop, product, and quantity first.");
      return;
    }

    setSaving(true);
    try {
      if (existingMode === "purchase" && existingCost) {
        await createPurchaseBatch({
          shop_id: Number(existingShopId),
          product_id: Number(existingProductId),
          quantity: Number(existingQuantity),
          total_cost: Number(existingCost),
        });
        notifySuccess("Purchase recorded successfully.");
      } else {
        await createStockAdjustment({
          shop_id: Number(existingShopId),
          product_id: Number(existingProductId),
          quantity: Number(existingQuantity),
          reason: existingReason,
        });
        notifySuccess("Stock adjustment recorded successfully.");
      }
      setExistingQuantity("");
      setExistingCost("");
      setExistingReason("");
      await Promise.all([loadPurchaseHistory(purchasePage), loadMovementHistory(movementPage)]);
    } catch (err) {
      notifyError(err.response?.data?.error || "Could not record stock.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNewProductSubmit() {
    if (!newShopId || !newCategoryId || !newProductName || !newSellingPrice || !newQuantity) {
      notifyError("Complete the shop, product, category, price, and quantity fields first.");
      return;
    }

    setSaving(true);
    try {
      const created = await createProduct({
        shop_id: Number(newShopId),
        category_id: Number(newCategoryId),
        name: newProductName,
        selling_price: Number(newSellingPrice),
        low_stock_level: 0,
        barcode: null,
        brand: null,
        image_url: null,
      });

      if (canRecordPurchase && newCost) {
        await createPurchaseBatch({
          shop_id: Number(newShopId),
          product_id: Number(created.product_id),
          quantity: Number(newQuantity),
          total_cost: Number(newCost),
        });
      } else {
        await createStockAdjustment({
          shop_id: Number(newShopId),
          product_id: Number(created.product_id),
          quantity: Number(newQuantity),
          reason: "Initial stock",
        });
      }

      setNewProductName("");
      setNewSellingPrice("");
      setNewQuantity("");
      setNewCost("");
      notifySuccess("Product and opening stock recorded successfully.");
      await Promise.all([loadPurchaseHistory(purchasePage), loadMovementHistory(movementPage)]);
    } catch (err) {
      notifyError(err.response?.data?.error || "Could not create product and record stock.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen label="Loading stock" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <Boxes size={19} className="text-accent" />
        <div>
          <p className="text-xl font-semibold text-primary">Stock</p>
          <p className="text-sm text-text-secondary">Record inventory additions and adjustments.</p>
        </div>
      </div>

      <StockRecordForm
        shopSelectRef={shopSelectRef}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canRecordPurchase={canRecordPurchase}
        existingMode={existingMode}
        setExistingMode={setExistingMode}
        existingShopId={existingShopId}
        setExistingShopId={setExistingShopId}
        existingProductId={existingProductId}
        setExistingProductId={setExistingProductId}
        existingQuantity={existingQuantity}
        setExistingQuantity={setExistingQuantity}
        existingCost={existingCost}
        setExistingCost={setExistingCost}
        existingReason={existingReason}
        setExistingReason={setExistingReason}
        newShopId={newShopId}
        setNewShopId={handleNewShopChange}
        newCategoryId={newCategoryId}
        setNewCategoryId={setNewCategoryId}
        newProductName={newProductName}
        setNewProductName={setNewProductName}
        newSellingPrice={newSellingPrice}
        setNewSellingPrice={setNewSellingPrice}
        newQuantity={newQuantity}
        setNewQuantity={setNewQuantity}
        newCost={newCost}
        setNewCost={setNewCost}
        shops={shops}
        products={products}
        categories={categories}
        loadingProducts={loadingProducts}
        saving={saving}
        loadProductsForShop={loadProductsForShop}
        onExistingSubmit={handleExistingSubmit}
        onNewProductSubmit={handleNewProductSubmit}
      />

      <StockHistory
        showPurchases={canRecordPurchase}
        showMovements={!isOwner}
        purchaseBatches={purchaseBatches}
        purchasePage={purchasePage}
        purchasePageSize={PURCHASE_PAGE_SIZE}
        purchaseTotalPages={purchaseTotalPages}
        purchaseTotal={purchaseTotal}
        onPurchasePageChange={loadPurchaseHistory}
        movements={movements}
        movementPage={movementPage}
        movementPageSize={MOVEMENT_PAGE_SIZE}
        movementTotalPages={movementTotalPages}
        movementTotal={movementTotal}
        onMovementPageChange={loadMovementHistory}
      />
    </div>
  );
}

export default Stock;
