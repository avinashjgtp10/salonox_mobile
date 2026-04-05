import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { AuthUser, LoginCredentials } from "../types/scheduler-types";
import { saveToken, saveUser, getUser, removeToken, getToken, isTokenExpired } from "../utils/jwt";

const DEFAULT_PIN = "1234";
const PIN_KEY     = "salon_admin_pin";

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  verifyPin: (pin: string) => boolean;
  changePin: (oldPin: string, newPin: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mockLogin(credentials: LoginCredentials): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (credentials.email === "admin@salon.com" && credentials.password === "admin123") {
        const header  = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const payload = btoa(JSON.stringify({
          id: "u1", name: "Admin", email: credentials.email,
          role: "admin", exp: Math.floor(Date.now() / 1000) + 86400,
        }));
        const token = `${header}.${payload}.mockSignature`;
        resolve({ id: "u1", name: "Admin", email: credentials.email, role: "admin", token });
      } else {
        reject(new Error("Invalid email or password"));
      }
    }, 800);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const saved = getUser();
    if (token && saved && !isTokenExpired(token)) {
      setUser(saved);
    } else {
      removeToken();
    }
    // Set default PIN if not set
    if (!localStorage.getItem(PIN_KEY)) {
      localStorage.setItem(PIN_KEY, DEFAULT_PIN);
    }
    setLoading(false);
  }, []);

  async function login(credentials: LoginCredentials) {
    setLoading(true); setError(null);
    try {
      const authUser = await mockLogin(credentials);
      saveToken(authUser.token);
      saveUser(authUser);
      setUser(authUser);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() { removeToken(); setUser(null); }

  function verifyPin(pin: string): boolean {
    const stored = localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
    return pin === stored;
  }

  function changePin(oldPin: string, newPin: string): boolean {
    if (!verifyPin(oldPin)) return false;
    localStorage.setItem(PIN_KEY, newPin);
    return true;
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout, loading, error, verifyPin, changePin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
