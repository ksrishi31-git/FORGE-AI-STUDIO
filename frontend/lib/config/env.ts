import { z } from "zod";

/**
 * Typed client configuration — the frontend's shared configuration module
 * (Phase 3.1 deliverable #20). All `NEXT_PUBLIC_*` values are validated at
 * module load; misconfiguration fails fast instead of surfacing at runtime.
 *
 * `NEXT_PUBLIC_API_URL` may be empty: the HTTP client then uses same-origin
 * `/api` paths, which Next.js proxies to the API service (see next.config.ts).
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default(""),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_AUTH_COOKIE: z.string().default("forgeai_refresh"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_AUTH_COOKIE: process.env.NEXT_PUBLIC_AUTH_COOKIE,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}

export const env = parsed.data;
