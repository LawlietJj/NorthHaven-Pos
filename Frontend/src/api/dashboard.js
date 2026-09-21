import apiClient from "./apiClient";

export async function getOwnerOverview() {
  const response = await apiClient.get("/dashboard/owner-overview");
  return response.data;
}

export async function getManagerOverview() {
  const response = await apiClient.get("/dashboard/manager-overview");
  return response.data;
}

export async function getActivityLog() {
  const response = await apiClient.get("/dashboard/activity-log");
  return response.data;
}