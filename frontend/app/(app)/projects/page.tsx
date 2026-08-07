import type { Metadata } from "next";

import { ProjectsListPage } from "@/features/projects/components/projects-list-page";
import {
  projectPrioritySchema,
  projectStatusSchema,
  projectVisibilitySchema,
  type ProjectListParams,
} from "@/services/projects";

export const metadata: Metadata = {
  title: "Projects",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.search);
  const status = projectStatusSchema.safeParse(first(sp.status)).data;
  const priority = projectPrioritySchema.safeParse(first(sp.priority)).data;
  const visibility = projectVisibilitySchema.safeParse(first(sp.visibility)).data;

  const archivedRaw = first(sp.archived);
  const archived = archivedRaw === "true" ? true : archivedRaw === "false" ? false : undefined;

  const initialParams: ProjectListParams = {
    q,
    status,
    priority,
    visibility,
    archived,
    page: parsePositiveInt(first(sp.page)),
  };

  return <ProjectsListPage initialParams={initialParams} />;
}
