import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Database,
  Disc3,
  Settings,
  Upload,
  Users,
} from "lucide-react";

export type AdminSubNavItem = {
  title: string;
  url: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
};

export const adminSubNavItems: AdminSubNavItem[] = [
  {
    title: "Users",
    url: "/admin/users",
    description: "Accounts, roles, bans, and impersonation.",
    icon: Users,
    iconClassName: "text-violet-600 dark:text-violet-400",
  },
  {
    title: "Database",
    url: "/admin/database",
    description: "Drizzle/Prisma tools and database maintenance.",
    icon: Database,
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "Master Data",
    url: "/admin/master-data",
    description: "Shared reference data (artists, genres, and related).",
    icon: Disc3,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Statistics",
    url: "/admin/statistics",
    description: "Aggregate usage and reporting.",
    icon: BarChart3,
    iconClassName: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    title: "Settings",
    url: "/admin/settings",
    description: "Registration policy, allowlist, and instance options.",
    icon: Settings,
    iconClassName: "text-orange-600 dark:text-orange-400",
  },
];
