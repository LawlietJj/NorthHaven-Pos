import apiClient from "./apiClient";

export async function createPurchaseBatch(data) {
  const response = await apiClient.post("/purchase-batches", data);
  return response.data;
}

export async function createStockAdjustment(data) {
  const response = await apiClient.post("/stock-adjustments", data);
  return response.data;
}