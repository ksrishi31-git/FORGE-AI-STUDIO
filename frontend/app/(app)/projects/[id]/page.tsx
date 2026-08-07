import type { Metadata } from "next";

import { ProjectDetailPage } from "@/features/projects/components/project-detail-page";

export const metadata: Metadata = {
  title: "Project",
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailPage projectId={id} />;
}
