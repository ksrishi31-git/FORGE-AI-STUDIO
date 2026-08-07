"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

export interface ProjectSearchProps {
  initialValue: string;
  onCommit: (value: string) => void;
  /** Debounce delay in milliseconds before the query is committed. */
  debounceMs?: number;
}

export function ProjectSearch({ initialValue, onCommit, debounceMs = 400 }: ProjectSearchProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCommit(value);
    }, debounceMs);
    return () => clearTimeout(timer);
    // The commit is intentionally read fresh each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search projects..."
        aria-label="Search projects"
        className="h-9 pl-8 pr-8"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue("")}
          className="absolute right-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
