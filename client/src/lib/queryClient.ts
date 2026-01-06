import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * API base URL
 * - In production: set VITE_API_URL to your Render backend URL (e.g. https://your-service.onrender.com)
 * - In local dev: you can omit it and it will use same-origin (proxy/dev server if you have one)
 */
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "";

/**
 * Prefix /api/... routes with the configured API base URL.
 * If API_BASE_URL is empty, it falls back to same-origin.
 */
function withApiBase(url: string) {
  if (!url.startsWith("/")) return url;
  if (!API_BASE_URL) return url;
  return `${API_BASE_URL}${url}`;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const fullUrl = withApiBase(url);

  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const rawUrl = queryKey.join("/") as string;
    const fullUrl = withApiBase(rawUrl);

    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
