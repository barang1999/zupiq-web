import { useAuthStore } from "../store/auth.store";
import { useAppStore } from "../store/app.store";
import type { AuthCredentials, RegisterDTO } from "../types/user.types";

/**
 * Convenience hook that combines auth state + navigation on login/logout.
 */
export function useAuth() {
  const auth = useAuthStore();
  const { navigateTo, closeAuthModal } = useAppStore();

  async function login(credentials: AuthCredentials): Promise<void> {
    await auth.login(credentials);
    closeAuthModal();
    navigateTo("dashboard");
  }

  async function register(dto: RegisterDTO): Promise<void> {
    await auth.register(dto);
    closeAuthModal();
    navigateTo("dashboard");
  }

  function logout(): void {
    auth.logout();
    navigateTo("landing");
  }

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    login,
    register,
    logout,
    clearError: auth.clearError,
    refreshUser: auth.refreshUser,
  };
}
