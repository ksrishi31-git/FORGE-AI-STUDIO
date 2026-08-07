"use client";

import { SidebarContent } from "./sidebar-content";

/** Fixed desktop sidebar (hidden below `lg` — mobile uses MobileNav). */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card lg:flex">
      <SidebarContent />
    </aside>
  );
}
