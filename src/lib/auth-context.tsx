import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./sheets-api";

interface AuthUser { email: string; role: string }
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
const STORAGE = "crea_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.ok && res.user) {
      setUser(res.user);
      localStorage.setItem(STORAGE, JSON.stringify(res.user));
      return true;
    }
    return false;
  };

  const logout = async () => {
    try { if (user) await api.log("Logout", user.email); } catch {}
    setUser(null);
    localStorage.removeItem(STORAGE);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}