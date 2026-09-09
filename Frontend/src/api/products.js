import apiClient from "./apiClient";

export async function listProducts(params = {}) {
  const response = await apiClient.get("/products", { params });
  return response.data;
}

export async function getProduct(id) {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
}

export async function createProduct(data) {
  const response = await apiClient.post("/products", data);
  return response.data;
}

export async function updateProduct(id, data) {
  const response = await apiClient.put(`/products/${id}`, data);
  return response.data;
}

export async function generateBarcode(id) {
  const response = await apiClient.post(`/products/${id}/generate-barcode`);
  return response.data;
}