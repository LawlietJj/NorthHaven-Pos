import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

// Vite bakes VITE_* values in at build time — if a production build ships
// without the real backend URL set, every request would silently keep
// hitting localhost with no visible symptom until things stop working.
// Fail loudly at load time instead.
if (import.meta.env.PROD && (!baseURL || /localhost|127\.0\.0\.1/.test(baseURL))) {
  throw new Error(
    `VITE_API_BASE_URL is not set to a real backend URL for this production build (got "${baseURL}"). ` +
      "Set it before running the production build."
  );
}

const apiClient = axios.create({
  baseURL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;