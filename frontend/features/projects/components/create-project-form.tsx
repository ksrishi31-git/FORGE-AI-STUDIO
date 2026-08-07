"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/services/http-client";
import {
  createProjectSchema,
  toCreatePayload,
  type CreateProjectFormValues,
} from "../project-schemas";
import { useCreateProject } from "../hooks/use-projects";
import { StackPicker } from "./stack-picker";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function CreateProjectForm() {
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const preferredStack = watch("preferredStack");

  const onSubmit = async (values: CreateProjectFormValues) => {
    await createProject.mutateAsync(toCreatePayload(values));
  };

  const error = createProject.isError
    ? createProject.error instanceof ApiError
      ? createProject.error.message
      : "Unable to create the project."
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" placeholder="e.g. Customer Portal" autoFocus {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="What does the product do, at a high level?"
          {...register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="businessDomain">Business domain</Label>
          <Input
            id="businessDomain"
            placeholder="e.g. Fintech, Healthcare, E-commerce"
            {...register("businessDomain")}
          />
          <FieldError message={errors.businessDomain?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetUsers">Target users</Label>
          <Input
            id="targetUsers"
            placeholder="e.g. Small business owners and accountants"
            {...register("targetUsers")}
          />
          <FieldError message={errors.targetUsers?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Business requirements</Label>
        <Textarea
          id="requirements"
          rows={6}
          placeholder="Describe the functional requirements in plain English. The agent pipeline turns this into a production-ready application."
          className="min-h-36"
          {...register("requirements")}
        />
        <FieldError message={errors.requirements?.message} />
      </div>

      <div className="space-y-2">
        <Label>Preferred stack</Label>
        <StackPicker
          value={preferredStack}
          onChange={(next) => setValue("preferredStack", next, { shouldValidate: true })}
        />
        <FieldError message={errors.preferredStack?.message} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" {...register("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <Select id="visibility" {...register("visibility")}>
            <option value="private">Private</option>
            <option value="team">Team</option>
            <option value="public">Public</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? "Creating project" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
