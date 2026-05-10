"use client";

import * as React from "react";
import {
  BarChart3,
  BookOpen,
  CircleUser,
  Clock,
  Database,
  Disc3,
  GitBranch,
  GraduationCap,
  Heart,
  Home,
  MessageSquare,
  Music2,
  Rocket,
  ScrollText,
  Settings,
  Shield,
  Tags,
  TrendingUp,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import Image from "next/image";

import { NavCommandSearch } from "@/components/nav-command-search";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { User } from "@/server/better-auth/config";
import { authClient } from "@/server/better-auth/client";

const MainNav = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    isActive: true,
    items: [
      {
        title: "Longest Session",
        url: "/longest-session",
        icon: Clock,
      },
      {
        title: "All Stats",
        url: "/all-stats",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Top",
    icon: TrendingUp,
    url: "/top",
    isActive: true,
    items: [
      {
        title: "Top Artists",
        url: "/top/artists",
        icon: Users,
      },
      {
        title: "Top Tracks",
        url: "/top/tracks",
        icon: Music2,
      },
      {
        title: "Top Albums",
        url: "/top/albums",
        icon: Disc3,
      },
      {
        title: "Top Genres",
        url: "/top/genres",
        icon: Tags,
      },
    ],
  },
  {
    title: "Affinity",
    url: "/affinity",
    icon: Heart,
    isActive: true,
    items: [
      {
        title: "Introduction",
        url: "#",
        icon: BookOpen,
      },
      {
        title: "Get Started",
        url: "#",
        icon: Rocket,
      },
      {
        title: "Tutorials",
        url: "#",
        icon: GraduationCap,
      },
      {
        title: "Changelog",
        url: "#",
        icon: ScrollText,
      },
    ],
  },

  {
    title: "User",
    url: "/user/account",
    icon: UserRound,
    isActive: true,
    items: [
      {
        title: "Account",
        url: "/user/account",
        icon: CircleUser,
      },
      {
        title: "Settings",
        url: "/user/settings",
        icon: Settings,
      },
      {
        title: "Import",
        url: "/user/import",
        icon: Upload,
      },
    ],
  },
];

const SecondaryNav = [
  {
    title: "Github",
    url: "https://github.com/M4rshe1/spotify",
    icon: GitBranch,
  },
  {
    title: "Feedback",
    url: "https://github.com/M4rshe1/spotify/issues",
    icon: MessageSquare,
  },
];

export function getMainNav(user: User | null) {
  const nav = MainNav.map((item) => item);
  if (user?.role === "admin") {
    nav.push({
      title: "Admin",
      url: "/admin",
      icon: Shield,
      isActive: true,
      items: [
        {
          title: "Users",
          url: "/admin/users",
          icon: Users,
        },
        {
          title: "Imports",
          url: "/admin/imports",
          icon: Upload,
        },
        {
          title: "Database",
          url: "/admin/database",
          icon: Database,
        },
        {
          title: "Master Data",
          url: "/admin/master-data",
          icon: Disc3,
        },
        {
          title: "Settings",
          url: "/admin/settings",
          icon: Settings,
        },
      ],
    });
  }
  return nav;
}

export function getFlattenedNavForSearch(user: User | null) {
  const items = getMainNav(user);
  const out: { title: string; url: string }[] = [];
  for (const section of items) {
    if (section.url && section.url !== "#") {
      out.push({ title: section.title, url: section.url });
    }
    for (const sub of section.items ?? []) {
      if (sub.url && sub.url !== "#") {
        out.push({ title: `${section.title} › ${sub.title}`, url: sub.url });
      }
    }
  }
  return out;
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
  const navPagesForSearch = React.useMemo(
    () => getFlattenedNavForSearch(user),
    [user],
  );

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-accent text-muted-foreground flex aspect-square size-8 items-center justify-center rounded-sm">
                  <Image
                    src={"/wave-light.png"}
                    alt="Spotify"
                    width={32}
                    height={32}
                    className="block dark:hidden"
                  />
                  <Image
                    src={"/wave-dark.png"}
                    alt="Spotify"
                    width={32}
                    height={32}
                    className="hidden dark:block"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Spotify</span>
                  <span className="truncate text-xs">Stats</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavCommandSearch user={user} navPages={navPagesForSearch} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getMainNav(user)} />
        <NavSecondary items={SecondaryNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <ThemeSwitcher />
        {user ? <NavUser user={user} /> : null}
      </SidebarFooter>
    </Sidebar>
  );
}
