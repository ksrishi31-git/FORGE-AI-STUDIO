import type { ZodType } from "zod";

import { ensureFreshAccessToken, getAccessToken } from "@/lib/auth/token-store";
import { env } from "@/lib/config/env";
import type { ApiErrorEnvelope } from "@/types/api";

const DEFAULT_TIMEOUT_MS = 10_000;

const AUTH_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
]);

/** Typed error raised for every non-2xx response (BAD §12 envelope). */
export class ApiError extends Error {
  readonly retryable: boolean;

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.retryable = status === 429 || status >= 500;
  }
}

function resolveUrl(path: string): string {
  // Empty base => same-origin path, proxied by Next.js in containerized setups.
  return env.NEXT_PUBLIC_API_URL ? `${env.NEXT_PUBLIC_API_URL}${path}` : path;
}

async function perform<T>(path: string, init: RequestInit, schema?: ZodType<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const token = getAccessToken();
    const response = await fetch(resolveUrl(path), {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Request-Id": globalThis.crypto?.randomUUID?.() ?? "",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
      throw new ApiError(
        response.status,
        body?.error.code ?? "HTTP_ERROR",
        body?.error.message ?? `Request failed with status ${response.status}`,
        body?.error.details,
        response.headers.get("X-Request-Id") ?? undefined,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data: unknown = await response.json();
    return schema ? schema.parse(data) : (data as T);
  } finally {
    clearTimeout(timeout);
  }
}

async function request<T>(path: string, init: RequestInit = {}, schema?: ZodType<T>): Promise<T> {
  const hadToken = getAccessToken() !== null;
  try {
    return await perform(path, init, schema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && hadToken && !AUTH_PATHS.has(path)) {
      // One retry after a single-flight token refresh.
      const fresh = await ensureFreshAccessToken();
      if (fresh) {
        return await perform(path, init, schema);
      }
    }
    throw error;
  }
}

/** Typed HTTP client — the single access path to the API (FAD §5.1). */
export const http = {
  get: <T>(path: string, schema?: ZodType<T>) => request<T>(path, { method: "GET" }, schema),
  post: <T>(path: string, body?: unknown, schema?: ZodType<T>) =>
    request<T>(
      path,
      { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) },
      schema,
    ),
  patch: <T>(path: string, body?: unknown, schema?: ZodType<T>) =>
    request<T>(
      path,
      { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) },
      schema,
    ),
  delete: <T>(path: string, schema?: ZodType<T>) => request<T>(path, { method: "DELETE" }, schema),
};
