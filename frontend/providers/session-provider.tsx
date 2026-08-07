"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearAccessToken, setAccessToken, setRefreshHandler } from "@/lib/auth/token-store";
import { env } from "@/lib/config/env";
import { authApi, type AuthUser } from "@/services/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** True between logout() start and the next successful login/register/boot. */
  loggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, companyName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const ME_QUERY_KEY = ["auth", "me"] as const;

setRefreshHandler(async () => {
  try {
    const response = await authApi.refresh();
    setAccessToken(response.access_token);
    return response.access_token;
  } catch {
    clearAccessToken();
    return null;
  }
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: user } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authApi.me,
    enabled: status === "authenticated",
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // No refresh cookie => definitely no session. Skip the network probe so
      // public pages (landing, auth screens) make zero API calls.
      const hasRefreshCookie = document.cookie
        .split("; ")
        .some((entry) => entry.split("=")[0] === env.NEXT_PUBLIC_AUTH_COOKIE);
      if (!hasRefreshCookie) {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
        return;
      }
      try {
        const response = await authApi.refresh();
        if (cancelled) {
          return;
        }
        setAccessToken(response.access_token);
        setStatus("authenticated");
      } catch {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      setAccessToken(response.access_token);
      setLoggingOut(false);
      setStatus("authenticated");
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
    [queryClient],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, companyName?: string) => {
      const response = await authApi.register({
        name,
        email,
        company_name: companyName?.trim() || undefined,
        password,
      });
      setAccessToken(response.access_token);
      setLoggingOut(false);
      setStatus("authenticated");
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Local session is cleared regardless of server acknowledgement.
    } finally {
      clearAccessToken();
      queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, null);
      setStatus("unauthenticated");
    }
  }, [queryClient]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user: user ?? null,
      status,
      loggingOut,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, status, loggingOut, login, register, logout, refreshUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
