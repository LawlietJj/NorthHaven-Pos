import apiClient from "./apiClient";

export async function lookupByBarcode(barcode) {
  const response = await apiClient.get(`/products/by-barcode/${barcode}`);
  return response.data;
}

export async function checkout(data) {
  const response = await apiClient.post("/checkout", data);
  return response.data;
}

export async function holdCart(data) {
  const response = await apiClient.post("/held-carts", data);
  return response.data;
}

export async function listHeldCarts() {
  const response = await apiClient.get("/held-carts");
  return response.data;
}

export async function getHeldCart(id) {
  const response = await apiClient.get(`/held-carts/${id}`);
  return response.data;
}

export async function deleteHeldCart(id) {
  const response = await apiClient.delete(`/held-carts/${id}`);
  return response.data;
}