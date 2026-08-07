import type { Metadata } from "next";

import { DeploymentPage } from "@/features/deployment/components/deployment-page";

export const metadata: Metadata = {
  title: "Deployment",
};

export default async function DeploymentRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.project) ? sp.project[0] : sp.project;
  const initialProjectId = typeof raw === "string" && raw ? raw : null;
  return <DeploymentPage initialProjectId={initialProjectId} />;
}
