"use client";

import * as React from "react";
import {
  Command,
  Frame,
  Home,
  Heart,
  Map,
  PieChart,
  MessageSquare,
  Settings2,
  TrendingUp,
  GitBranch,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { User } from "better-auth";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
      isActive: true,
      items: [
        {
          title: "Longest Session",
          url: "/longest-session",
        },
        {
          title: "All Stats",
          url: "/all-stats",
        },
      ],
    },
    {
      title: "Top",
      icon: TrendingUp,
      url: "/top",
      items: [
        {
          title: "Top Artists",
          url: "/top/artists",
        },
        {
          title: "Top Tracks",
          url: "/top/tracks",
        },
        {
          title: "Top Albums",
          url: "/top/albums",
        },
      ],
    },
    {
      title: "Afinity",
      url: "/affinity",
      icon: Heart,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
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
  ],
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-accent text-accent-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
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
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
