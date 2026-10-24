import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { api, getSession, saveSession, type StoredSession } from "@/api/client";
import type { AuthSession, Me } from "@/api/types";
type AuthValue = {
  me?: Me;
  session: StoredSession | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
  login: (value: AuthSession) => void;
  logout: () => Promise<void>;
};
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(getSession);
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ["me", session?.token],
    queryFn: ({ signal }) => api<Me>("/me", { signal }),
    enabled: !!session,
    retry: false,
  });
  const clear = () => {
    saveSession(null);
    setSession(null);
    client.clear();
  };
  useEffect(() => {
    const expire = () => {
      setSession(null);
      client.clear();
    };
    window.addEventListener("sdu:session-expired", expire);
    return () => window.removeEventListener("sdu:session-expired", expire);
  }, [client]);
  const login = (value: AuthSession) => {
    client.clear();
    const next = {
      token: value.token,
      expiresAt: value.expiresAt,
      userId: value.user.id,
    };
    saveSession(next);
    setSession(next);
  };
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Local sign-out remains available when the teaching service is unreachable.
    } finally {
      clear();
    }
  };
  return (
    <Context.Provider
      value={{
        me: me.data,
        session,
        loading: !!session && me.isPending,
        error: me.error,
        retry: () => {
          void me.refetch();
        },
        login,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}
export function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.session)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (auth.loading)
    return <div className="page-loading">正在读取你的空间…</div>;
  if (auth.error)
    return (
      <div className="empty-state">
        <h1>暂时无法读取账号</h1>
        <p>{auth.error.message}</p>
        <button className="btn" onClick={auth.retry}>
          重新连接
        </button>
      </div>
    );
  if (admin && auth.me?.role !== "ADMIN")
    return (
      <div className="empty-state">
        <h1>这里需要管理员身份</h1>
        <p>你的博客与创作空间仍可正常使用。</p>
      </div>
    );
  return children;
}
