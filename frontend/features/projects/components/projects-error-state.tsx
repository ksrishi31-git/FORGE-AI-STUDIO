import { RefreshCw, TriangleAlert } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface ProjectsErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ProjectsErrorState({ message, onRetry }: ProjectsErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <TriangleAlert className="size-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight">Unable to load projects</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {message ?? "The projects service did not respond. Check the connection and retry."}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

export function ProjectsInlineError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <TriangleAlert className="size-4" aria-hidden="true" />
      {message}
    </Alert>
  );
}
