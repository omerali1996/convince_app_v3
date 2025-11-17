import axios from "axios";

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "https://convince-app-v3.onrender.com";

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
});

// JWT'yi otomatik ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

