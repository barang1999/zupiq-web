// ─── API client (fetch-based, no extra dependencies) ─────────────────────────

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveBaseUrl(): string {
  const rawBase = (import.meta.env.VITE_API_URL ?? "").trim();
  if (!rawBase) return "";

  if (typeof window === "undefined") {
    return rawBase.replace(/\/+$/, "");
  }

  try {
    const resolved = new URL(rawBase, window.location.origin);
    // Prevent mixed-content failures in production when API URL is configured
    // as HTTP while the web app is served over HTTPS.
    if (
      window.location.protocol === "https:"
      && resolved.protocol === "http:"
      && !isLoopbackHost(resolved.hostname)
    ) {
      resolved.protocol = "https:";
    }
    return resolved.toString().replace(/\/+$/, "");
  } catch {
    return rawBase.replace(/\/+$/, "");
  }
}

function buildRequestUrl(endpoint: string): string {
  if (!BASE_URL) return endpoint;
  try {
    const normalizedBase = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
    return new URL(endpoint, normalizedBase).toString();
  } catch {
    return `${BASE_URL}${endpoint}`;
  }
}

const BASE_URL = resolveBaseUrl();

// ─── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = "zupiq_access_token";
const REFRESH_KEY = "zupiq_refresh_token";
const USER_KEY = "zupiq_user";

export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  getUser: (): any | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setTokens: (access: string, refresh: string, user?: any) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  // Don't force application/json for FormData — the browser must set
  // the multipart boundary automatically when no Content-Type is given.
  const headers: Record<string, string> =
    fetchOptions.body instanceof FormData
      ? { ...(fetchOptions.headers as Record<string, string> ?? {}) }
      : { "Content-Type": "application/json", ...(fetchOptions.headers as Record<string, string> ?? {}) };

  if (!skipAuth) {
    const token = tokenStorage.getAccess();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;
  const requestUrl = buildRequestUrl(endpoint);
  try {
    response = await fetch(requestUrl, {
      ...fetchOptions,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network request failed";
    const method = (fetchOptions.method ?? "GET").toUpperCase();
    throw new ApiError(0, message, {
      kind: "network_error",
      endpoint,
      url: requestUrl,
      method,
      baseUrl: BASE_URL,
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage: message,
      origin: typeof window !== "undefined" ? window.location.origin : null,
      online: typeof navigator !== "undefined" ? navigator.onLine : null,
      secureContext: typeof window !== "undefined" ? window.isSecureContext : null,
    });
  }

  // Handle 401 by attempting token refresh
  if (response.status === 401 && !skipAuth) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry original request with new token
      headers["Authorization"] = `Bearer ${tokenStorage.getAccess()}`;
      const retryResponse = await fetch(requestUrl, {
        ...fetchOptions,
        headers,
      });
      return parseResponse<T>(retryResponse);
    }
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const errorData = isJson ? await response.json() : { error: response.statusText };
    throw new ApiError(
      response.status,
      errorData.error ?? `HTTP ${response.status}`,
      errorData
    );
  }

  if (response.status === 204) return undefined as T;
  return isJson ? response.json() : response.text() as unknown as T;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return false;

  try {
    const data = await request<{ accessToken: string; refreshToken: string }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
      }
    );
    tokenStorage.setTokens(data.accessToken, data.refreshToken, (data as any).user);
    return true;
  } catch {
    tokenStorage.clear();
    return false;
  }
}

// ─── HTTP method helpers ──────────────────────────────────────────────────────

export const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "GET" }),

  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "DELETE" }),

  upload: <T>(url: string, formData: FormData, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "POST",
      body: formData,
    }),
};
