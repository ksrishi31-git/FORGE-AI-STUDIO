import type { Metadata } from "next";

import { ArchitecturePage } from "@/features/architecture/components/architecture-page";

export const metadata: Metadata = {
  title: "Architecture",
};

export default async function ArchitectureRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.project) ? sp.project[0] : sp.project;
  const initialProjectId = typeof raw === "string" && raw ? raw : null;
  return <ArchitecturePage initialProjectId={initialProjectId} />;
}
