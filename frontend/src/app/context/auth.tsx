import { createContext, useContext, createSignal, onMount } from "solid-js";
import type { Accessor } from "solid-js";
import type { User } from "../../domain/auth.ts";
import { authService } from "../../infrastructure/auth";

interface AuthContextType {
  user: Accessor<User | null>;
  login: (username: string, password: string) => Promise<User | null>;
  logout: (call?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>();

export const AuthProvider = (props: { children: any }) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [loading, setLoading] = createSignal(true);

  const refreshUser = async () => {
    try {
      const data = await authService.fetchMe();
      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const data = await authService.login(username, password);
      if (!data) {
        setUser(null);
        return null;
      }
      setUser(data);
      return data;
    } catch (err) {
      setUser(null);
      return null;
    }
  };

  const logout = async (call: boolean = true) => {
    if (call) {
      await authService.logout();
    }
    setUser(null);
  };

  onMount(async () => {
    await refreshUser();
  });

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {loading() ? ( //TODO: PONER UN PANEL DE CARGA AL INICIO
        <div>Cargando...</div>
      ) : (
        props.children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
