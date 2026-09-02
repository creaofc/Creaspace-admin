import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { api } from "./firebase-api";

interface AuthUser {
  email: string;
  role: string;
}
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // We set a default role of admin for now. Roles can be expanded via Firestore user documents later.
        setUser({ email: firebaseUser.email, role: "admin" });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user && userCredential.user.email) {
        setUser({ email: userCredential.user.email, role: "admin" });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      throw error; // Let the UI handle the error (e.g. invalid credentials)
    }
  };

  const logout = async () => {
    try {
      if (user) await api.log("Logout", user.email);
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
