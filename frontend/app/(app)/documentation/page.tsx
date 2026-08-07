import type { Metadata } from "next";

import { DocumentationPage } from "@/features/documentation/components/documentation-page";

export const metadata: Metadata = {
  title: "Documentation",
};

export default async function DocumentationRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.project) ? sp.project[0] : sp.project;
  const initialProjectId = typeof raw === "string" && raw ? raw : null;
  return <DocumentationPage initialProjectId={initialProjectId} />;
}
