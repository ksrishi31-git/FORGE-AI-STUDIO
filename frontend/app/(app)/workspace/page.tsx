import type { Metadata } from "next";

import { WorkspacePage } from "@/features/workspace/components/workspace-page";

export const metadata: Metadata = {
  title: "Workspace",
};

/** Standalone Agent Workspace — optionally bound to a project via ?project= or a run via ?run=. */
export default async function WorkspaceRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawProject = Array.isArray(params.project) ? params.project[0] : params.project;
  const rawRun = Array.isArray(params.run) ? params.run[0] : params.run;
  return (
    <WorkspacePage
      projectId={typeof rawProject === "string" && rawProject ? rawProject : null}
      initialRunId={typeof rawRun === "string" && rawRun ? rawRun : null}
    />
  );
}
