import apiClient from "./apiClient";

export async function getSalesSummary(params = {}) {
  const response = await apiClient.get("/reports/sales-summary", { params });
  return response.data;
}

export async function getLowStock(params = {}) {
  const response = await apiClient.get("/reports/low-stock", { params });
  return response.data;
}

export async function getStockValue(params = {}) {
  const response = await apiClient.get("/reports/stock-value", { params });
  return response.data;
}

export async function getShopComparison() {
  const response = await apiClient.get("/reports/shop-comparison");
  return response.data;
}

export async function getSalesLog(params = {}) {
  const response = await apiClient.get("/reports/sales-log", { params });
  return response.data;
}

export async function getPaymentBreakdown(params = {}) {
  const response = await apiClient.get("/reports/payment-breakdown", { params });
  return response.data;
}

export async function getRevenueTrend(range = "week") {
  const response = await apiClient.get("/reports/revenue-trend", { params: { range } });
  return response.data;
}

export async function getProfitMargins(shopId) {
  const response = await apiClient.get("/reports/profit-margins", {
    params: shopId ? { shop_id: shopId } : {},
  });
  return response.data;
}

export async function getNetProfit(range = "week") {
  const response = await apiClient.get("/reports/net-profit", { params: { range } });
  return response.data;
}