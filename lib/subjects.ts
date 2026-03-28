import { api, ApiError, tokenStorage } from "./api";
import type { Subject } from "../types/subject.types";

const SUBJECTS_CACHE_TTL_MS = 5 * 60_000;
const SUBJECTS_RATE_LIMIT_COOLDOWN_MS = 60_000;

let subjectsCache: {
  accessToken: string | null;
  fetchedAt: number;
  value: Subject[];
} | null = null;
let subjectsInFlight: Promise<Subject[]> | null = null;
let subjectsRetryNotBefore = 0;

export async function getSubjectsCached(): Promise<Subject[]> {
  const accessToken = tokenStorage.getAccess();
  const now = Date.now();

  if (
    subjectsCache
    && subjectsCache.accessToken === accessToken
    && now - subjectsCache.fetchedAt < SUBJECTS_CACHE_TTL_MS
  ) {
    return subjectsCache.value;
  }

  if (subjectsInFlight) return subjectsInFlight;

  if (now < subjectsRetryNotBefore) {
    if (subjectsCache && subjectsCache.accessToken === accessToken) {
      return subjectsCache.value;
    }
    throw new ApiError(429, "Too many requests. Please try again later.");
  }

  subjectsInFlight = api
    .get<{ subjects: Subject[] }>("/api/subjects")
    .then(({ subjects }) => {
      const rows = subjects ?? [];
      subjectsCache = {
        accessToken,
        fetchedAt: Date.now(),
        value: rows,
      };
      subjectsRetryNotBefore = 0;
      return rows;
    })
    .catch((err) => {
      if (err instanceof ApiError && err.status === 429) {
        subjectsRetryNotBefore = Date.now() + SUBJECTS_RATE_LIMIT_COOLDOWN_MS;
        if (subjectsCache && subjectsCache.accessToken === accessToken) {
          return subjectsCache.value;
        }
      }
      throw err;
    })
    .finally(() => {
      subjectsInFlight = null;
    });

  return subjectsInFlight;
}
