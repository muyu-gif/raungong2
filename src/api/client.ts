import axios from "axios";

/**
 * 后端 Base URL 来自 .env.development / .env.production。
 * 所有业务路径都自带 /api/v1 前缀（健康检查 /healthz 除外）。
 */
const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "http://127.0.0.1:8082";

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

export { baseURL };

function currentLocation(): string {
  return `${window.location.pathname}${window.location.search}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.dispatchEvent(new CustomEvent("auth:expired"));
      if (window.location.pathname !== "/login") {
        const query = new URLSearchParams({ redirect: currentLocation(), expired: "1" });
        window.location.replace(`/login?${query.toString()}`);
      }
    }
    return Promise.reject(error);
  },
);
