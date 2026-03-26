import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserProfile, AuthResponse, RegisterDTO, AuthCredentials } from "../types/user.types";
import { api, tokenStorage } from "../lib/api";

// ─── State shape ──────────────────────────────────────────────────────────────

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (dto: RegisterDTO) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Restore session on mount
  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (token) {
      api
        .get<{ user: UserProfile }>("/api/auth/me")
        .then(({ user }) => {
          setState({ user, isAuthenticated: true, isLoading: false, error: null });
        })
        .catch(() => {
          tokenStorage.clear();
          setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
        });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await api.post<AuthResponse>("/api/auth/login", credentials, {
        skipAuth: true,
      });
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      setState({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setState((s) => ({ ...s, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const register = useCallback(async (dto: RegisterDTO) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await api.post<AuthResponse>("/api/auth/register", dto, {
        skipAuth: true,
      });
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      setState({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setState((s) => ({ ...s, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.get<{ user: UserProfile }>("/api/auth/me");
      setState((s) => ({ ...s, user }));
    } catch {
      // ignore
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthStore(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthStore must be used within an AuthProvider");
  }
  return ctx;
}
