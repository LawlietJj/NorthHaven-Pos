import apiClient from "./apiClient";

export async function createPurchaseBatch(data) {
  const response = await apiClient.post("/purchase-batches", data);
  return response.data;
}

export async function createStockAdjustment(data) {
  const response = await apiClient.post("/stock-adjustments", data);
  return response.data;
}

export async function listPurchaseBatches(params = {}) {
  const response = await apiClient.get("/purchase-batches", { params });
  return response.data;
}

export async function listStockMovements(params = {}) {
  const response = await apiClient.get("/stock-movements", { params });
  return response.data;
}