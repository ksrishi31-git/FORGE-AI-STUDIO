"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Play } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { ApiError } from "@/services/http-client";
import { useRunPipeline } from "../hooks/use-agents";

const runSchema = z.object({
  projectId: z.string().optional(),
  requirements: z.string().trim().min(1, "Describe what you want to build").max(100000),
  mode: z.enum(["auto", "llm", "deterministic"]),
});

type RunFormValues = z.infer<typeof runSchema>;

export function RunForm() {
  const runPipeline = useRunPipeline();
  const projects = useProjects({ page_size: 50 });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RunFormValues>({
    resolver: zodResolver(runSchema),
    defaultValues: { projectId: "", requirements: "", mode: "auto" },
  });

  const onSubmit = async (values: RunFormValues) => {
    await runPipeline.mutateAsync({
      project_id: values.projectId || undefined,
      requirements: values.requirements,
      mode: values.mode,
    });
  };

  const error = runPipeline.isError
    ? runPipeline.error instanceof ApiError
      ? runPipeline.error.message
      : "Unable to start the pipeline."
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run the pipeline</CardTitle>
        <CardDescription>
          Ten specialist agents plan, build, test, audit, document, and review your product.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <div className="space-y-2">
            <Label htmlFor="run-project">Project (optional)</Label>
            <Select id="run-project" {...register("projectId")}>
              <option value="">Standalone run</option>
              {(projects.data?.items ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="run-requirements">Business requirements</Label>
            <Textarea
              id="run-requirements"
              rows={6}
              className="min-h-32"
              placeholder="Describe the product in plain English. The agents turn this into a complete software design."
              {...register("requirements")}
            />
            {errors.requirements ? (
              <p className="text-xs text-destructive">{errors.requirements.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="run-mode">Execution mode</Label>
            <Select id="run-mode" {...register("mode")}>
              <option value="auto">Auto (LLM when configured, otherwise deterministic)</option>
              <option value="deterministic">Deterministic engine</option>
              <option value="llm">LLM (requires an API key)</option>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
            {isSubmitting ? "Starting pipeline" : "Start pipeline"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
