import { api, ApiError, tokenStorage } from "./api";

export interface SessionRow {
  id: string;
  title?: string | null;
  subject?: string | null;
  problem?: string | null;
  node_count?: number | null;
  duration_seconds?: number | null;
  breakdown_json?: string | null;
  visual_table_json?: string | null;
  created_at?: string | null;
  subject_id?: string | null;
  user_role?: 'owner' | 'editor' | 'viewer';
}

const SESSIONS_CACHE_TTL_MS = 60_000;
const SESSIONS_RATE_LIMIT_COOLDOWN_MS = 60_000;

let sessionsCache: {
  accessToken: string | null;
  fetchedAt: number;
  value: SessionRow[];
} | null = null;
let sessionsInFlight: Promise<SessionRow[]> | null = null;
let sessionsRetryNotBefore = 0;

export function invalidateSessionsCache(): void {
  sessionsCache = null;
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/api/sessions/${id}`);
  if (sessionsCache) {
    sessionsCache = {
      ...sessionsCache,
      value: sessionsCache.value.filter(s => s.id !== id),
    };
  }
}

export async function getSessionsCached(): Promise<SessionRow[]> {
  const accessToken = tokenStorage.getAccess();
  const now = Date.now();

  if (
    sessionsCache
    && sessionsCache.accessToken === accessToken
    && now - sessionsCache.fetchedAt < SESSIONS_CACHE_TTL_MS
  ) {
    return sessionsCache.value;
  }

  if (sessionsInFlight) return sessionsInFlight;

  if (now < sessionsRetryNotBefore) {
    if (sessionsCache && sessionsCache.accessToken === accessToken) {
      return sessionsCache.value;
    }
    throw new ApiError(429, "Too many requests. Please try again later.");
  }

  sessionsInFlight = api
    .get<{ sessions: SessionRow[] }>("/api/sessions")
    .then(({ sessions }) => {
      const rows = sessions ?? [];
      sessionsCache = {
        accessToken,
        fetchedAt: Date.now(),
        value: rows,
      };
      sessionsRetryNotBefore = 0;
      return rows;
    })
    .catch((err) => {
      if (err instanceof ApiError && err.status === 429) {
        sessionsRetryNotBefore = Date.now() + SESSIONS_RATE_LIMIT_COOLDOWN_MS;
        if (sessionsCache && sessionsCache.accessToken === accessToken) {
          return sessionsCache.value;
        }
      }
      throw err;
    })
    .finally(() => {
      sessionsInFlight = null;
    });

  return sessionsInFlight;
}
