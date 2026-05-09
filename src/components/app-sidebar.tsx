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
  TrendingUp,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";

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

function getMainNav(user: User | null) {
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

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const waveSrc =
    mounted && resolvedTheme === "dark" ? "/wave-dark.png" : "/wave-light.png";
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-accent text-muted-foreground flex aspect-square size-8 items-center justify-center rounded-sm">
                  <Image src={waveSrc} alt="Spotify" width={32} height={32} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Spotify</span>
                  <span className="truncate text-xs">Stats</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
