import axios from "axios";

// Vercel/CRA için env: REACT_APP_BACKEND_URL
export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://convince-app-v3.onrender.com";

// Tek axios instance
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
});

// Her isteğe otomatik Authorization ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
