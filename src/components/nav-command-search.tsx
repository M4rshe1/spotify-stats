"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Disc3, LayoutDashboard, Music2, Search, Users } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { User } from "@/server/better-auth/config";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

function useSearchShortcutLabel() {
  const [label, setLabel] = React.useState("Ctrl K");

  React.useEffect(() => {
    const isApple =
      /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ||
      navigator.userAgent.includes("Mac");
    setLabel(isApple ? "⌘K" : "Ctrl K");
  }, []);

  return label;
}

export function NavCommandSearch({
  user,
  navPages,
}: {
  user: User | null;
  navPages: { title: string; url: string }[];
}) {
  const router = useRouter();
  const shortcutLabel = useSearchShortcutLabel();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredPages = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return navPages;
    return navPages.filter((p) => p.title.toLowerCase().includes(q));
  }, [navPages, search]);

  const { data, isFetching } = api.search.global.useQuery(
    { q: debounced },
    {
      enabled: open && Boolean(user) && debounced.length >= 1,
    },
  );

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      setSearch("");
      router.push(href);
    },
    [router],
  );

  const onOpenChange = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  }, []);

  const debouncingLibrary =
    Boolean(user) &&
    search.trim().length >= 1 &&
    search.trim() !== debounced;
  const showLibraryPlaceholder =
    Boolean(user) &&
    search.trim().length >= 1 &&
    (debouncingLibrary || isFetching);

  const libraryReady =
    Boolean(user) && debounced.length >= 1 && !isFetching && data;

  const trackItems = libraryReady ? data.tracks : [];
  const albumItems = libraryReady ? data.albums : [];
  const artistItems = libraryReady ? data.artists : [];

  const hasLibraryHits =
    trackItems.length > 0 || albumItems.length > 0 || artistItems.length > 0;
  const hasPageHits = filteredPages.length > 0;

  const showEmpty =
    !showLibraryPlaceholder &&
    !hasPageHits &&
    !hasLibraryHits &&
    search.trim().length > 0;

  return (
    <>
      <SidebarMenu className="mt-2">
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            className="text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            <Search />
            <span className="flex-1 text-left">Search</span>
            <kbd
              className={cn(
                "bg-muted text-muted-foreground pointer-events-none hidden h-5 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] font-medium select-none sm:inline-flex",
              )}
            >
              {shortcutLabel}
            </kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search"
        description="Find pages and music from your listening history"
        showCloseButton={false}
      >
        <Command shouldFilter={false} loop>
          <CommandInput
            placeholder={
              user
                ? "Search pages and your library…"
                : "Search pages… (sign in for library)"
            }
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {showLibraryPlaceholder ? (
              <div className="text-muted-foreground px-2 py-6 text-center text-xs">
                Searching your library…
              </div>
            ) : null}

            {hasPageHits ? (
              <CommandGroup heading="Pages">
                {filteredPages.map((p) => (
                  <CommandItem
                    key={`page-${p.url}-${p.title}`}
                    value={`page-${p.title}-${p.url}`}
                    onSelect={() => go(p.url)}
                  >
                    <LayoutDashboard />
                    <span className="truncate">{p.title}</span>
                    <CommandShortcut>↵</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {trackItems.length > 0 ? (
              <CommandGroup heading="Tracks">
                {trackItems.map((t) => (
                  <CommandItem
                    key={`track-${t.id}`}
                    value={`track-${t.id}-${t.name}`}
                    onSelect={() => go(`/track/${t.id}`)}
                  >
                    {t.image ? (
                      <img
                        src={t.image}
                        alt=""
                        className="size-7 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <Music2 />
                    )}
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    {t.album?.name ? (
                      <span className="text-muted-foreground truncate text-[10px]">
                        {t.album.name}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {albumItems.length > 0 ? (
              <CommandGroup heading="Albums">
                {albumItems.map((a) => (
                  <CommandItem
                    key={`album-${a.id}`}
                    value={`album-${a.id}-${a.name}`}
                    onSelect={() => go(`/album/${a.id}`)}
                  >
                    {a.image ? (
                      <img
                        src={a.image}
                        alt=""
                        className="size-7 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <Disc3 />
                    )}
                    <span className="truncate">{a.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {artistItems.length > 0 ? (
              <CommandGroup heading="Artists">
                {artistItems.map((a) => (
                  <CommandItem
                    key={`artist-${a.id}`}
                    value={`artist-${a.id}-${a.name}`}
                    onSelect={() => go(`/artist/${a.id}`)}
                  >
                    {a.image ? (
                      <img
                        src={a.image}
                        alt=""
                        className="size-7 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <Users />
                    )}
                    <span className="truncate">{a.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {showEmpty ? (
              <div className="text-muted-foreground px-2 py-6 text-center text-xs">
                <p>No results found.</p>
                {!user ? (
                  <p className="mt-2 text-[11px] opacity-90">
                    Sign in to search tracks, albums, and artists from your
                    history.
                  </p>
                ) : null}
              </div>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
