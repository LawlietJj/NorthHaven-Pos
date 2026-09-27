import MoneyInput from "./MoneyInput";

const inputClass = "w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent";

function StockRecordForm({
  shopSelectRef,
  activeTab,
  setActiveTab,
  canRecordPurchase,
  existingMode,
  setExistingMode,
  existingShopId,
  setExistingShopId,
  existingProductId,
  setExistingProductId,
  existingQuantity,
  setExistingQuantity,
  existingCost,
  setExistingCost,
  existingReason,
  setExistingReason,
  newShopId,
  setNewShopId,
  newCategoryId,
  setNewCategoryId,
  newProductName,
  setNewProductName,
  newSellingPrice,
  setNewSellingPrice,
  newQuantity,
  setNewQuantity,
  newCost,
  setNewCost,
  shops,
  products,
  categories,
  loadingProducts,
  saving,
  loadProductsForShop,
  onExistingSubmit,
  onNewProductSubmit,
}) {
  function handleEnterSubmit(e, submit) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <>
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("existing")}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === "existing" ? "border-accent text-accent" : "border-transparent text-text-secondary"
          }`}
        >
          Restock Existing Product
        </button>
        <button
          onClick={() => setActiveTab("new")}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === "new" ? "border-accent text-accent" : "border-transparent text-text-secondary"
          }`}
        >
          + New Product
        </button>
      </div>

      <div className="bg-surface rounded-xl p-5 shadow-sm">
        {activeTab === "existing" ? (
          <>
            {canRecordPurchase && (
              <div className="flex gap-2 border-b border-border mb-5">
                <button
                  onClick={() => setExistingMode("purchase")}
                  className={`px-3 py-2 text-sm font-medium border-b-2 ${
                    existingMode === "purchase" ? "border-accent text-accent" : "border-transparent text-text-secondary"
                  }`}
                >
                  Record Purchase
                </button>
                <button
                  onClick={() => setExistingMode("adjustment")}
                  className={`px-3 py-2 text-sm font-medium border-b-2 ${
                    existingMode === "adjustment"
                      ? "border-accent text-accent"
                      : "border-transparent text-text-secondary"
                  }`}
                >
                  Adjust Stock
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Shop *</label>
                <select
                  ref={shopSelectRef}
                  value={existingShopId}
                  onChange={(event) => {
                    setExistingShopId(event.target.value);
                    loadProductsForShop(event.target.value);
                  }}
                  className={inputClass}
                >
                  <option value="">Select shop</option>
                  {shops.map((shop) => (
                    <option key={shop.shop_id} value={shop.shop_id}>
                      {shop.shop_code} — {shop.shop_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Product *</label>
                <select
                  value={existingProductId}
                  onChange={(event) => setExistingProductId(event.target.value)}
                  disabled={!existingShopId || loadingProducts}
                  className={`${inputClass} disabled:bg-bg disabled:text-text-secondary`}
                >
                  <option value="">{loadingProducts ? "Loading products..." : "Select product"}</option>
                  {products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name} ({product.quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">
                  {existingMode === "adjustment" ? "Quantity Change *" : "Quantity Purchased *"}
                </label>
                <input
                  type="number"
                  value={existingQuantity}
                  onChange={(event) => setExistingQuantity(event.target.value)}
                  onKeyDown={(e) => handleEnterSubmit(e, onExistingSubmit)}
                  placeholder={existingMode === "adjustment" ? "Use negative for removal" : "0"}
                  className={inputClass}
                />
              </div>
              {existingMode === "purchase" && canRecordPurchase ? (
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Total Cost Paid (₦)</label>
                  <MoneyInput
                    value={existingCost}
                    onChange={setExistingCost}
                    onKeyDown={(e) => handleEnterSubmit(e, onExistingSubmit)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Reason</label>
                  <input
                    type="text"
                    value={existingReason}
                    onChange={(event) => setExistingReason(event.target.value)}
                    onKeyDown={(e) => handleEnterSubmit(e, onExistingSubmit)}
                    placeholder="e.g. damaged during handling"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            {existingMode === "purchase" && canRecordPurchase && existingCost === "" && (
              <p className="mt-3 text-xs text-text-muted">Leave cost blank to record this as a plain stock adjustment.</p>
            )}
            <div className="flex justify-end mt-5">
              <button
                onClick={onExistingSubmit}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving…" : existingMode === "purchase" && existingCost ? "Record Purchase" : "Apply Adjustment"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Shop *</label>
                <select
                  ref={shopSelectRef}
                  value={newShopId}
                  onChange={(event) => {
                    setNewShopId(event.target.value);
                  }}
                  className={inputClass}
                >
                  <option value="">Select shop</option>
                  {shops.map((shop) => (
                    <option key={shop.shop_id} value={shop.shop_id}>
                      {shop.shop_code} — {shop.shop_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Product Name *</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(event) => setNewProductName(event.target.value)}
                  onKeyDown={(e) => handleEnterSubmit(e, onNewProductSubmit)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Category *</label>
                <select
                  value={newCategoryId}
                  onChange={(event) => setNewCategoryId(event.target.value)}
                  disabled={!newShopId}
                  className={`${inputClass} disabled:bg-bg disabled:text-text-secondary`}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.parent_category_id ? `— ${category.name}` : category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Selling Price (₦) *</label>
                <MoneyInput
                  value={newSellingPrice}
                  onChange={setNewSellingPrice}
                  onKeyDown={(e) => handleEnterSubmit(e, onNewProductSubmit)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={newQuantity}
                  onChange={(event) => setNewQuantity(event.target.value)}
                  onKeyDown={(e) => handleEnterSubmit(e, onNewProductSubmit)}
                  className={inputClass}
                />
              </div>
              {canRecordPurchase && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Total Cost Paid (₦)</label>
                  <MoneyInput
                    value={newCost}
                    onChange={setNewCost}
                    onKeyDown={(e) => handleEnterSubmit(e, onNewProductSubmit)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            {canRecordPurchase && <p className="mt-3 text-xs text-text-muted">Leave cost blank to record opening stock without cost data.</p>}
            <div className="flex justify-end mt-5">
              <button
                onClick={onNewProductSubmit}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving…" : "Create Product and Add Stock"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default StockRecordForm;
