import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/services/projects";

export function ProjectRequirements({ project }: { project: Project }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business requirements</CardTitle>
      </CardHeader>
      <CardContent>
        {project.requirements ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {project.requirements}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div
              className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <FileText className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">No requirements recorded</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Requirements are captured when the project is created or edited.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
