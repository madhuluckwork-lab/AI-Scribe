import axios from "axios";
import { getItem, deleteItem } from "./secure-storage";
import { API_URL } from "./constants";

const TOKEN_KEY = "medscribe_token";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer token to every request
api.interceptors.request.use(async (config) => {
  const token = await getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — force logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await deleteItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);
