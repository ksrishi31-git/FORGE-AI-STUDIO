import type { Metadata } from "next";

import { AgentsPage } from "@/features/agents/components/agents-page";

export const metadata: Metadata = {
  title: "Agents",
};

export default async function AgentsRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.run) ? sp.run[0] : sp.run;
  const initialRunId = typeof raw === "string" && raw ? raw : null;
  return <AgentsPage initialRunId={initialRunId} />;
}
