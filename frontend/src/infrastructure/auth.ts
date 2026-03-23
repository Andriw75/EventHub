import type { User } from "../domain/auth";

const API_URL = import.meta.env.VITE_API_URL;

export const authService = {
  async fetchMe(): Promise<User | null> {
    const res = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
    });

    return res.ok ? await res.json() : null;
  },

  async login(username: string, password: string): Promise<User | null> {
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const res = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Error del backend:", data);
        throw new Error(data?.detail || "Error en login");
      }
      return data;
    } catch (err) {
      console.error("Error en login:", err);
      return null;
    }
  },

  async logout(): Promise<void> {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  },
};
