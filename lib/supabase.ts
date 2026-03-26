// Auth compatibility shim — mimics the Supabase auth API surface
// but routes all calls through our Express backend JWT auth.

import { api, tokenStorage } from "./api";

type Session = { user: any; access_token: string } | null;
type AuthCallback = (event: string, session: Session) => void;

const listeners: AuthCallback[] = [];

export function notifyAuthChange(event: string, session: Session) {
  listeners.forEach((cb) => cb(event, session));
}

export const supabase = {
  auth: {
    getSession: async (): Promise<{ data: { session: Session } }> => {
      const token = tokenStorage.getAccess();
      if (!token) return { data: { session: null } };
      try {
        const res = await api.get<{ user: any }>("/api/users/profile");
        return { data: { session: { user: res.user, access_token: token } } };
      } catch {
        tokenStorage.clear();
        return { data: { session: null } };
      }
    },

    onAuthStateChange: (callback: AuthCallback) => {
      listeners.push(callback);
      const token = tokenStorage.getAccess();
      const user = tokenStorage.getUser();
      // Fire immediately with cached user — no network call, instant UI
      callback("INITIAL_SESSION", token && user ? { user, access_token: token } : null);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = listeners.indexOf(callback);
              if (idx > -1) listeners.splice(idx, 1);
            },
          },
        },
      };
    },

    signOut: async (): Promise<{ error: null }> => {
      try {
        await api.post("/api/auth/logout");
      } catch {
        // Clear locally even if server call fails
      }
      tokenStorage.clear();
      notifyAuthChange("SIGNED_OUT", null);
      return { error: null };
    },
  },
};
