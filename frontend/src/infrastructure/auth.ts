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
  ): Promise<boolean> {
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

      if (!res.ok) {
        const data = await res.json();
        console.error("Error del backend:", data);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error en register:", err);
      return false;
    }
  },

  async logout(): Promise<void> {
    await fetch(`${AUTH_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
  },
};
