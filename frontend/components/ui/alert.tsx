import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva("flex w-full items-start gap-2 rounded-md border p-3 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-muted/50 text-foreground",
      destructive: "border-destructive/30 bg-destructive/10 text-destructive",
      success: "border-success/30 bg-success/10 text-success",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface AlertProps extends ComponentProps<"div">, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, role = "alert", ...props }: AlertProps) {
  return <div role={role} className={cn(alertVariants({ variant }), className)} {...props} />;
}
