import { z } from "zod";

import { http } from "./http-client";

export const healthSchema = z.object({
  status: z.literal("healthy"),
  service: z.string(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthSchema>;

/** Reference API service — platform health (BAD §5). */
export function getHealth(): Promise<HealthResponse> {
  return http.get("/api/v1/health", healthSchema);
}
