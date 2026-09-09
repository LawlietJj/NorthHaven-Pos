import apiClient from "./apiClient";

export async function listShops() {
  const response = await apiClient.get("/shops");
  return response.data;
}

export async function updateShop(id, data) {
  const response = await apiClient.put(`/shops/${id}`, data);
  return response.data;
}

export async function deactivateShop(id) {
  const response = await apiClient.put(`/shops/${id}/deactivate`);
  return response.data;
}

export async function reactivateShop(id) {
  const response = await apiClient.put(`/shops/${id}/reactivate`);
  return response.data;
}