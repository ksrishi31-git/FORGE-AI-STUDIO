"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  ProjectListParams,
  ProjectPriority,
  ProjectStatus,
  ProjectVisibility,
} from "@/services/projects";

export interface ProjectFiltersProps {
  params: ProjectListParams;
  onChange: (patch: Partial<ProjectListParams>) => void;
  onReset: () => void;
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function ProjectFilters({ params, onChange, onReset }: ProjectFiltersProps) {
  const hasActiveFilters =
    params.status !== undefined ||
    params.priority !== undefined ||
    params.visibility !== undefined ||
    params.archived !== false;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterField id="filter-status" label="Status">
        <Select
          id="filter-status"
          value={params.status ?? ""}
          onChange={(event) =>
            onChange({
              status: (event.target.value || undefined) as ProjectStatus | undefined,
            })
          }
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </Select>
      </FilterField>

      <FilterField id="filter-priority" label="Priority">
        <Select
          id="filter-priority"
          value={params.priority ?? ""}
          onChange={(event) =>
            onChange({
              priority: (event.target.value || undefined) as ProjectPriority | undefined,
            })
          }
          className="w-40"
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>
      </FilterField>

      <FilterField id="filter-visibility" label="Visibility">
        <Select
          id="filter-visibility"
          value={params.visibility ?? ""}
          onChange={(event) =>
            onChange({
              visibility: (event.target.value || undefined) as ProjectVisibility | undefined,
            })
          }
          className="w-40"
        >
          <option value="">All visibility</option>
          <option value="private">Private</option>
          <option value="team">Team</option>
          <option value="public">Public</option>
        </Select>
      </FilterField>

      <FilterField id="filter-archive" label="Archive">
        <Select
          id="filter-archive"
          value={params.archived === true ? "archived" : "active"}
          onChange={(event) => onChange({ archived: event.target.value === "archived" })}
          className="w-40"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </FilterField>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw aria-hidden="true" />
          Reset filters
        </Button>
      ) : null}
    </div>
  );
}
