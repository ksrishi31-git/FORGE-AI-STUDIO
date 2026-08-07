"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StackPicker } from "@/features/projects/components/stack-picker";
import {
  createProjectSchema,
  toCreatePayload,
  type CreateProjectFormValues,
} from "@/features/projects/project-schemas";
import { ApiError } from "@/services/http-client";
import { projectsApi } from "@/services/projects";

export interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create a project and open it directly in the workspace (Phase 3.6).
 *
 * The panel is capped to the viewport height: the header and footer stay
 * pinned while only the field body scrolls, so no field (description,
 * requirements, stack, priority, visibility) is ever clipped and the action
 * buttons are always reachable — on any screen size.
 */
export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      businessDomain: "",
      requirements: "",
      targetUsers: "",
      preferredStack: [],
      priority: "medium",
      visibility: "private",
    },
  });

  const onSubmit = async (values: CreateProjectFormValues) => {
    setSubmitError(null);
    try {
      const project = await projectsApi.create(toCreatePayload(values));
      onOpenChange(false);
      reset();
      router.push(`/workspace/${project.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Unable to create the project. Please try again.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} titleId="new-project-title" className="max-w-xl">
      <div className="flex max-h-[calc(100dvh-6rem)] flex-col">
        <div className="mb-5 shrink-0">
          <h2 id="new-project-title" className="text-lg font-semibold tracking-tight">
            New project
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The project opens in the workspace with its requirements prefilled.
          </p>
        </div>

        {submitError ? (
          <Alert variant="destructive" className="mb-4 shrink-0">
            {submitError}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="np-name">Name</Label>
                <Input id="np-name" placeholder="Customer portal" {...register("name")} />
                {errors.name ? (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="np-domain">Business domain</Label>
                <Input
                  id="np-domain"
                  placeholder="Fintech, healthcare, logistics…"
                  {...register("businessDomain")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="np-description">Description</Label>
              <Textarea
                id="np-description"
                rows={2}
                className="min-h-16 resize-y text-sm"
                placeholder="What is this product?"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="np-requirements">Requirements</Label>
              <Textarea
                id="np-requirements"
                rows={4}
                className="min-h-24 resize-y font-mono text-xs"
                placeholder="Business requirements — the agents turn these into a complete software design."
                {...register("requirements")}
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred stack</Label>
              <Controller
                control={control}
                name="preferredStack"
                render={({ field }) => (
                  <StackPicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="np-priority">Priority</Label>
                <Select id="np-priority" {...register("priority")}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="np-visibility">Visibility</Label>
                <Select id="np-visibility" {...register("visibility")}>
                  <option value="private">Private</option>
                  <option value="team">Team</option>
                  <option value="public">Public</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex shrink-0 items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              Create and open
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
