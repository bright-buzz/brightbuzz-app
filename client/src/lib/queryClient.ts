import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * API base URL
 * - In production: set VITE_API_URL to your Render backend URL
 * - In local dev: omit it for same-origin
 */
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "";

function withApiBase(url: string) {
  if (!url.startsWith("/")) return url;
  if (!API_BASE_URL) return url;
  return `${API_BASE_URL}${url}`;
}

/**
 * Get Clerk session token for API requests.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    if (typeof window !== "undefined" && (window as any).Clerk) {
      const token = await (window as any).Clerk.session?.getToken();
      return token || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const fullUrl = withApiBase(url);
  const token = await getAuthToken();

  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(fullUrl, {
    method,
    headers,
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
    const token = await getAuthToken();

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(fullUrl, {
      headers,
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
