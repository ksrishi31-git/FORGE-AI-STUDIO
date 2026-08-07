"use client";

import { cn } from "@/lib/utils";

/** Common platform technologies offered for selection (factual, not demo data). */
const STACK_OPTIONS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "FastAPI",
  "Django",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Tailwind CSS",
  "GraphQL",
  "Go",
  "Java",
  ".NET",
];

export interface StackPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
}

export function StackPicker({ value, onChange, id }: StackPickerProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div id={id} className="flex flex-wrap gap-2" role="group" aria-label="Preferred stack">
      {STACK_OPTIONS.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
