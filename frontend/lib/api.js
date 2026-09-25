import axios from "axios";
import { useAuthStore } from "@/lib/store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().clearAuth();
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default api;
