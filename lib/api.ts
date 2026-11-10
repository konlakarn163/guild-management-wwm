const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const API_PROXY_PREFIX = "/meawmeawmeawmeawmeaw";

const resolveApiUrl = (path: string) => (
  typeof window === "undefined" ? `${API_BASE_URL}${path}` : `${API_PROXY_PREFIX}${path}`
);

const BROWSER_GET_REUSE_MS = 3000;
const browserGetCache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

type ApiFetchOptions = RequestInit & { token?: string; next?: { revalidate?: number | false; tags?: string[] } };

async function request<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");

  if (options?.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...options,
    headers,
    cache: options?.cache ?? (options?.next ? undefined : "no-store"),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };

    throw new Error(errorBody.message ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  if (typeof window === "undefined") {
    return request<T>(path, options);
  }

  const method = (options?.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    browserGetCache.clear();
    try {
      return await request<T>(path, options);
    } finally {
      browserGetCache.clear();
    }
  }

  const key = `${options?.token ?? ""} ${path}`;
  const cached = browserGetCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>;
  }

  const promise = request<T>(path, options);
  browserGetCache.set(key, { expiresAt: Date.now() + BROWSER_GET_REUSE_MS, promise });
  promise.catch(() => {
    if (browserGetCache.get(key)?.promise === promise) {
      browserGetCache.delete(key);
    }
  });
  return promise;
}
