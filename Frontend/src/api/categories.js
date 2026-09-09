import apiClient from "./apiClient";

export async function listCategories(shopId) {
  const response = await apiClient.get("/categories", {
    params: shopId ? { shop_id: shopId } : {},
  });
  return response.data;
}

export async function createCategory(data) {
  const response = await apiClient.post("/categories", data);
  return response.data;
}

export async function updateCategory(id, data) {
  const response = await apiClient.put(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id) {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data;
}