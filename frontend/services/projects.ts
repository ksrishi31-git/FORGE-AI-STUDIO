/**
 * Projects API service (Phase 3.4 — Project Workspace).
 *
 * The backend ships the full project contract: scoped lists, pagination,
 * search, filters, soft delete, and archive/restore. All requests go through
 * the shared typed HTTP client; schema drift surfaces as a query error.
 */
import { z } from "zod";

import { http } from "./http-client";

// --- Schemas & types ----------------------------------------------------------

export const projectStatusSchema = z.enum(["planning", "in_progress", "completed", "failed"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type ProjectPriority = z.infer<typeof projectPrioritySchema>;

export const projectVisibilitySchema = z.enum(["private", "team", "public"]);
export type ProjectVisibility = z.infer<typeof projectVisibilitySchema>;

export const projectSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: projectStatusSchema,
  priority: projectPrioritySchema,
  visibility: projectVisibilitySchema,
  archived: z.boolean(),
  progress: z.number().min(0).max(100),
  owner: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectSchema = projectSummarySchema.extend({
  description: z.string().nullable(),
  business_domain: z.string().nullable(),
  requirements: z.string().nullable(),
  target_users: z.string().nullable(),
  preferred_stack: z.array(z.string()).nullable(),
});
export type Project = z.infer<typeof projectSchema>;

const projectPageSchema = z.object({
  items: z.array(projectSummarySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});
export type ProjectPage = z.infer<typeof projectPageSchema>;

const projectSearchItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: projectStatusSchema,
  updated_at: z.string(),
});
export type ProjectSearchItem = z.infer<typeof projectSearchItemSchema>;

export interface ProjectListParams {
  q?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  visibility?: ProjectVisibility;
  archived?: boolean;
  page?: number;
  page_size?: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  business_domain?: string;
  requirements?: string;
  target_users?: string;
  preferred_stack?: string[];
  status?: ProjectStatus;
  priority?: ProjectPriority;
  visibility?: ProjectVisibility;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

// --- Service ------------------------------------------------------------------

export const projectsApi = {
  list: (params: ProjectListParams = {}) =>
    http.get(
      `/api/v1/projects${toQuery({
        ...params,
        archived: params.archived ?? false,
      })}`,
      projectPageSchema,
    ),

  search: (q: string) =>
    http.get(
      `/api/v1/projects/search${toQuery({ q, page_size: 8 })}`,
      z.array(projectSearchItemSchema),
    ),

  get: (id: string) => http.get(`/api/v1/projects/${id}`, projectSchema),

  create: (data: CreateProjectInput) => http.post("/api/v1/projects", data, projectSchema),

  update: (id: string, data: UpdateProjectInput) =>
    http.patch(`/api/v1/projects/${id}`, data, projectSchema),

  remove: (id: string) => http.delete(`/api/v1/projects/${id}`),

  archive: (id: string) => http.post(`/api/v1/projects/${id}/archive`, undefined, projectSchema),

  restore: (id: string) => http.post(`/api/v1/projects/${id}/restore`, undefined, projectSchema),
};
