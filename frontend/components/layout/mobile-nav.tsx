"use client";

import { Sheet } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar-content";

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Slide-in navigation drawer for small screens (FAD §2 responsive). */
export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="left" titleId="mobile-nav-title">
      <h2 id="mobile-nav-title" className="sr-only">
        Navigation
      </h2>
      <SidebarContent />
    </Sheet>
  );
}
