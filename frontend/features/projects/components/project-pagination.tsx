import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface ProjectPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function ProjectPagination({ page, pageSize, total, onPageChange }: ProjectPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page === 1) {
    return null;
  }

  return (
    <nav
      aria-label="Project pagination"
      className="flex items-center justify-between border-t border-border pt-4"
    >
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {total === 0 ? 0 : (page - 1) * pageSize + 1}
          {"\u2013"}
          {Math.min(page * pageSize, total)}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
