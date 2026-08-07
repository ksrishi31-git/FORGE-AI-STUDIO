import type { Metadata } from "next";

import { ProjectCreatePage } from "@/features/projects/components/project-create-page";

export const metadata: Metadata = {
  title: "New project",
};

export default function NewProjectPage() {
  return <ProjectCreatePage />;
}
