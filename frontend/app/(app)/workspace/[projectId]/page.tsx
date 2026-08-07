import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WorkspacePage } from "@/features/workspace/components/workspace-page";

export const metadata: Metadata = {
  title: "Workspace",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Project-bound Agent Workspace — /workspace/[projectId]. */
export default async function ProjectWorkspaceRoute({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  if (!UUID_RE.test(projectId)) {
    redirect("/workspace");
  }
  const sp = await searchParams;
  const rawRun = Array.isArray(sp.run) ? sp.run[0] : sp.run;
  return (
    <WorkspacePage
      projectId={projectId}
      initialRunId={typeof rawRun === "string" && rawRun ? rawRun : null}
    />
  );
}
