"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/providers/session-provider";
import { CreateProjectForm } from "./create-project-form";

export function ProjectCreatePage() {
  const { status } = useSession();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: "New project" },
        ]}
        title="New project"
        description="Describe the product in plain English. The agent pipeline plans, builds, and ships it."
      />

      {status === "loading" ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>
              Fill in the project brief. Only the name is required; every other field helps the
              agents plan more accurately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProjectForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
