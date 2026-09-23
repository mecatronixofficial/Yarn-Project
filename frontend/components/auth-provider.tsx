"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { User } from "@/lib/types";
import { Loading } from "./loading";
type Ctx = {
  user: User | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Ctx>({
  user: null,
  refresh: async () => {},
  logout: async () => {},
});
export function useAuth() {
  return useContext(AuthContext);
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const path = usePathname();
  const refresh = async () => {
    try {
      const r = await api<{ data: User }>("/auth/me", { silent: true });
      setUser(r.data);
    } catch {
      setUser(null);
      if (path != "/login") router.replace("/login");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST", silent: true });
    } finally {
      setUser(null);
      toast.info("You have been signed out.", "Signed out");
      router.replace("/login");
    }
  };
  if (loading) return <Loading />;
  return (
    <AuthContext.Provider value={{ user, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
