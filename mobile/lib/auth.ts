import { create } from "zustand";
import { getItem, setItem, deleteItem } from "./secure-storage";
import { api } from "./api";
import type { User } from "./types";

const TOKEN_KEY = "medscribe_token";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await api.post("/api/mobile-auth", { email, password });
    const { token, user } = response.data;

    await setItem(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    await deleteItem(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = await getItem(TOKEN_KEY);
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      set({ token });

      const response = await api.get("/api/mobile-auth", {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await deleteItem(TOKEN_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
