import type { User } from "../domain/auth";

const AUTH_URL = `${import.meta.env.VITE_API_URL}/auth`;

export const authService = {
  async fetchMe(): Promise<User | null> {
    const res = await fetch(`${AUTH_URL}/me`, {
      credentials: "include",
    });

    return res.ok ? await res.json() : null;
  },

  async login(username: string, password: string): Promise<User | null> {
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const res = await fetch(`${AUTH_URL}/token`, {
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

  async register(
    correo: string,
    name: string,
    password: string,
  ): Promise<{ success: boolean; detail?: string }> {
    try {
      const res = await fetch(`${AUTH_URL}/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo,
          name,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, detail: data.detail || "Error desconocido" };
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        detail: err instanceof Error ? err.message : "Error desconocido",
      };
    }
  },
  async logout(): Promise<void> {
    await fetch(`${AUTH_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
  },
};
