"use client";

import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const SIDEBAR_NAV_OPEN_KEY = "sidebar-nav-collapsible-open";

type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
};

function usePersistedCollapsibleOpen(
  sectionKey: string,
  defaultOpen: boolean,
  enabled: boolean,
) {
  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(SIDEBAR_NAV_OPEN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const stored = (parsed as Record<string, unknown>)[sectionKey];
        if (typeof stored === "boolean") {
          setOpen(stored);
        }
      }
    } catch {}
  }, [sectionKey, enabled]);

  const onOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!enabled) return;
      try {
        const raw = localStorage.getItem(SIDEBAR_NAV_OPEN_KEY);
        let map: Record<string, boolean> = {};
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as unknown;
            if (
              parsed !== null &&
              typeof parsed === "object" &&
              !Array.isArray(parsed)
            ) {
              for (const [k, v] of Object.entries(parsed)) {
                if (typeof v === "boolean") map[k] = v;
              }
            }
          } catch {
            map = {};
          }
        }
        map[sectionKey] = next;
        localStorage.setItem(SIDEBAR_NAV_OPEN_KEY, JSON.stringify(map));
      } catch {}
    },
    [sectionKey, enabled],
  );

  return { open, onOpenChange };
}

function NavMainSection({ item }: { item: NavMainItem }) {
  const defaultOpen = item.isActive ?? true;
  const hasSubItems = Boolean(item.items?.length);
  const { open, onOpenChange } = usePersistedCollapsibleOpen(
    item.title,
    defaultOpen,
    hasSubItems,
  );

  return (
    <Collapsible
      asChild
      {...(hasSubItems ? { open, onOpenChange } : { defaultOpen })}
    >
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title}>
          <a href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </a>
        </SidebarMenuButton>
        {hasSubItems ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRight />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items!.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild>
                      <Link href={subItem.url}>
                        {subItem.icon ? <subItem.icon /> : null}
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainSection key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
