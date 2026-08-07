import { z } from "zod";

import {
  projectPrioritySchema,
  projectStatusSchema,
  projectVisibilitySchema,
} from "@/services/projects";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(10000),
  businessDomain: z.string().trim().max(200),
  requirements: z.string().trim().max(100000),
  targetUsers: z.string().trim().max(5000),
  preferredStack: z.array(z.string()).max(50),
  priority: projectPrioritySchema,
  visibility: projectVisibilitySchema,
});

export const projectSettingsSchema = createProjectSchema.extend({
  status: projectStatusSchema,
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
export type ProjectSettingsFormValues = z.infer<typeof projectSettingsSchema>;

/** Map camelCase form values to the snake_case API contract. */
export function toCreatePayload(values: CreateProjectFormValues) {
  return {
    name: values.name,
    description: values.description || undefined,
    business_domain: values.businessDomain || undefined,
    requirements: values.requirements || undefined,
    target_users: values.targetUsers || undefined,
    preferred_stack: values.preferredStack.length > 0 ? values.preferredStack : undefined,
    priority: values.priority,
    visibility: values.visibility,
  };
}

/**
 * Settings sends every field, including empty values, so the backend treats
 * an explicit empty string or empty list as clearing the stored value.
 */
export function toSettingsPayload(values: ProjectSettingsFormValues) {
  return {
    name: values.name,
    description: values.description,
    business_domain: values.businessDomain,
    requirements: values.requirements,
    target_users: values.targetUsers,
    preferred_stack: values.preferredStack,
    status: values.status,
    priority: values.priority,
    visibility: values.visibility,
  };
}
