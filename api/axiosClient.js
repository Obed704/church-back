import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token automatically
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
