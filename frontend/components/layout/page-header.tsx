import type { ReactNode } from "react";

import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

export interface PageHeaderProps {
  breadcrumb: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Standard page header — breadcrumb, title, description, action slot. */
export function PageHeader({ breadcrumb, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        <Breadcrumb items={breadcrumb} />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
