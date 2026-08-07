import {
  Bot,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Network,
  PanelsTopLeft,
  Rocket,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Primary navigation (FAD §2 route tree). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Workspace", href: "/workspace", icon: PanelsTopLeft },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Architecture", href: "/architecture", icon: Network },
  { label: "Documentation", href: "/documentation", icon: FileText },
  { label: "Deployment", href: "/deployment", icon: Rocket },
  { label: "Settings", href: "/settings", icon: Settings },
];
