"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs subcomponents must be rendered within <Tabs>");
  }
  return context;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? "");
  const active = value ?? internal;

  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) {
        setInternal(next);
      }
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: active, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    const triggers = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    if (triggers.length === 0) {
      return;
    }
    const currentIndex = triggers.findIndex((trigger) => trigger === document.activeElement);
    if (currentIndex === -1) {
      return;
    }
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + triggers.length) % triggers.length;
    triggers[nextIndex]?.focus();
    triggers[nextIndex]?.click();
    event.preventDefault();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Tab navigation"
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: active, setValue, baseId } = useTabs();
  const selected = active === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        selected
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: active, baseId } = useTabs();
  if (active !== value) {
    return null;
  }
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}
