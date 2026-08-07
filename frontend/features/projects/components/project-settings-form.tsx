"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/services/projects";
import { ApiError } from "@/services/http-client";
import { useUpdateProject } from "../hooks/use-projects";
import {
  projectSettingsSchema,
  toSettingsPayload,
  type ProjectSettingsFormValues,
} from "../project-schemas";
import { StackPicker } from "./stack-picker";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function ProjectSettingsForm({ project }: { project: Project }) {
  const updateProject = useUpdateProject(project.id);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectSettingsFormValues>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      businessDomain: project.business_domain ?? "",
      requirements: project.requirements ?? "",
      targetUsers: project.target_users ?? "",
      preferredStack: project.preferred_stack ?? [],
      status: project.status,
      priority: project.priority,
      visibility: project.visibility,
    },
  });

  const preferredStack = watch("preferredStack");

  const onSubmit = async (values: ProjectSettingsFormValues) => {
    setSaved(false);
    await updateProject.mutateAsync(toSettingsPayload(values));
    setSaved(true);
  };

  const error = updateProject.isError
    ? updateProject.error instanceof ApiError
      ? updateProject.error.message
      : "Unable to save changes."
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {saved ? (
        <Alert variant="success">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Project settings saved.
        </Alert>
      ) : null}
      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="space-y-2">
        <Label htmlFor="settings-name">Project name</Label>
        <Input id="settings-name" {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-description">Description</Label>
        <Textarea id="settings-description" rows={3} {...register("description")} />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="settings-domain">Business domain</Label>
          <Input id="settings-domain" {...register("businessDomain")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-users">Target users</Label>
          <Input id="settings-users" {...register("targetUsers")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-requirements">Business requirements</Label>
        <Textarea
          id="settings-requirements"
          rows={6}
          className="min-h-32"
          {...register("requirements")}
        />
      </div>

      <div className="space-y-2">
        <Label>Preferred stack</Label>
        <StackPicker
          value={preferredStack}
          onChange={(next) => setValue("preferredStack", next, { shouldValidate: true })}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="settings-status">Status</Label>
          <Select id="settings-status" {...register("status")}>
            <option value="planning">Planning</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-priority">Priority</Label>
          <Select id="settings-priority" {...register("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-visibility">Visibility</Label>
          <Select id="settings-visibility" {...register("visibility")}>
            <option value="private">Private</option>
            <option value="team">Team</option>
            <option value="public">Public</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? "Saving changes" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
