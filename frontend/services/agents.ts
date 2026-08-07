/**
 * Multi-agent engine API service (Phase 3.5).
 *
 * POST /agents/run returns immediately with a run id; the pipeline executes
 * asynchronously on the backend and status/output are polled. Every contract
 * below mirrors the backend Pydantic schemas.
 */
import { z } from "zod";

import { http } from "./http-client";

// --- Schemas & types ----------------------------------------------------------

export const runStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

export const runModeSchema = z.enum(["llm", "deterministic"]);
export type RunMode = z.infer<typeof runModeSchema>;

export const stepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
  "needs_revision",
]);
export type StepStatus = z.infer<typeof stepStatusSchema>;

export const agentDefinitionSchema = z.object({
  key: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  order: z.number(),
});
export type AgentDefinition = z.infer<typeof agentDefinitionSchema>;

export const runStatusResponseSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  status: runStatusSchema,
  mode: runModeSchema,
  current_step: z.string().nullable(),
  total_steps: z.number(),
  completed_steps: z.number(),
  progress: z.number().min(0).max(100),
  error: z.string().nullable(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  created_at: z.string(),
  // Review metadata (Phase 4.0)
  iteration: z.number().optional(),
  verdict: z.string().nullable(),
  overall_score: z.number().nullable(),
});
export type RunStatusResponse = z.infer<typeof runStatusResponseSchema>;

/** Agent artifact — a JSON object that always carries a `markdown` field. */
export const stepOutputSchema = z.record(z.string(), z.unknown());
export type StepOutput = z.infer<typeof stepOutputSchema>;

export const agentStepSchema = z.object({
  id: z.string().uuid(),
  agent: z.string(),
  status: stepStatusSchema,
  output: stepOutputSchema.nullable(),
  logs: z.array(z.string()).nullable(),
  duration_ms: z.number().nullable(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  // Execution metadata (Phase 4.0)
  iteration: z.number().optional(),
  input_artifacts: z.array(z.string()).nullable(),
  model_used: z.string().nullable(),
  token_usage: z.number().nullable(),
  feedback: z.array(z.string()).nullable(),
  error: z.string().nullable(),
});
export type AgentStep = z.infer<typeof agentStepSchema>;

export const runOutputSchema = z.object({
  run: runStatusResponseSchema,
  requirements: z.string().nullable(),
  steps: z.array(agentStepSchema),
});
export type RunOutput = z.infer<typeof runOutputSchema>;

export const runHistoryItemSchema = z.object({
  id: z.string().uuid(),
  status: runStatusSchema,
  mode: runModeSchema,
  requirements: z.string().nullable(),
  current_step: z.string().nullable(),
  progress: z.number().min(0).max(100),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type RunHistoryItem = z.infer<typeof runHistoryItemSchema>;

export const runHistoryPageSchema = z.object({
  items: z.array(runHistoryItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});
export type RunHistoryPage = z.infer<typeof runHistoryPageSchema>;

export interface RunRequest {
  project_id?: string;
  requirements: string;
  preferred_stack?: string[];
  mode?: "auto" | "llm" | "deterministic";
}

export const runAcceptedSchema = z.object({
  run_id: z.string().uuid(),
  status: z.string(),
  mode: runModeSchema,
});
export type RunAccepted = z.infer<typeof runAcceptedSchema>;

// --- Helpers ------------------------------------------------------------------

export function stepMarkdown(step: AgentStep): string {
  const value = step.output?.markdown;
  return typeof value === "string" ? value : "";
}

// --- Service ------------------------------------------------------------------

export const agentsApi = {
  definitions: () => http.get("/api/v1/agents/definitions", z.array(agentDefinitionSchema)),

  run: (data: RunRequest) => http.post("/api/v1/agents/run", data, runAcceptedSchema),

  status: (id: string) => http.get(`/api/v1/agents/status/${id}`, runStatusResponseSchema),

  /** Request cancellation of a queued/running pipeline (Phase 3.6). */
  cancel: (id: string) =>
    http.post(`/api/v1/agents/cancel/${id}`, undefined, runStatusResponseSchema),

  /** Resume a failed run from the failed agent, reusing completed artifacts (Phase 4.0). */
  retry: (id: string) => http.post(`/api/v1/agents/retry/${id}`, undefined, runAcceptedSchema),

  output: (id: string) => http.get(`/api/v1/agents/output/${id}`, runOutputSchema),

  history: (params: { page?: number; page_size?: number; project_id?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.page) {
      search.set("page", String(params.page));
    }
    search.set("page_size", String(params.page_size ?? 10));
    if (params.project_id) {
      search.set("project_id", params.project_id);
    }
    return http.get(`/api/v1/agents/history?${search.toString()}`, runHistoryPageSchema);
  },

  remove: (id: string) => http.delete(`/api/v1/agents/history/${id}`),
};
