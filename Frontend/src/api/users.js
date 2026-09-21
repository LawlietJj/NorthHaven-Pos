import apiClient from "./apiClient";

export async function listUsers(params = {}) {
  const response = await apiClient.get("/users", { params });
  return response.data;
}

export async function createUser(data) {
  const response = await apiClient.post("/users", data);
  return response.data;
}

export async function updateUser(id, data) {
  const response = await apiClient.put(`/users/${id}`, data);
  return response.data;
}

export async function deactivateUser(id) {
  const response = await apiClient.put(`/users/${id}/deactivate`);
  return response.data;
}

export async function reactivateUser(id) {
  const response = await apiClient.put(`/users/${id}/reactivate`);
  return response.data;
}

export async function resetPassword(userId, newPassword) {
  const response = await apiClient.post("/auth/reset-password", {
    user_id: userId,
    new_password: newPassword,
  });
  return response.data;
}