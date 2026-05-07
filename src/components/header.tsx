"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbList,
} from "./ui/breadcrumb";
import Link from "next/link";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";
import { periods, type Period } from "@/lib/consts/periods";
import { usePeriod } from "@/providers/period-provider";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CalendarIcon, RefreshCcwDotIcon, RefreshCcwIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { usePathname } from "next/navigation";

const AUTO_REFRESH_LS_KEY = "header-auto-refresh-enabled";
const breadcrumbLabels: Record<string, string> = {
  top: "Top",
  tracks: "Songs",
  artists: "Artists",
  albums: "Albums",
  "longest-session": "Longest session",
};

const segmentToLabel = (segment: string) =>
  breadcrumbLabels[segment] ??
  segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const Header = () => {
  const pathname = usePathname();
  const {
    selectedPeriod,
    openPeriodSelectDialog,
    selectPeriod,
    headerFavoritePeriods,
  } = usePeriod();
  const selectedPeriodLabel =
    periods[selectedPeriod.type]?.label ?? periods.today.label;
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const utils = api.useUtils();
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [{ href: "/", label: "Dashboard" }];
    }

    return segments.map((segment, index) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: segmentToLabel(segment),
    }));
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored =
        window.localStorage.getItem(AUTO_REFRESH_LS_KEY) ?? "false";
      setAutoRefresh(stored === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        AUTO_REFRESH_LS_KEY,
        autoRefresh ? "true" : "false",
      );
    }
  }, [autoRefresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoRefresh) {
        void utils.invalidate();
      }
    }, 60_000);
    void utils.invalidate();
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleAutoRefresh = () => {
    setAutoRefresh((prev) => {
      const next = !prev;
      if (next === false) {
        void utils.invalidate();
      }
      return next;
    });
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex w-full items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <Fragment key={crumb.href}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          {headerFavoritePeriods.length > 0 ? (
            <div className="hidden max-w-[min(72vw,32rem)] items-center gap-1 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-md lg:flex [&::-webkit-scrollbar]:hidden">
              {headerFavoritePeriods.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={
                    selectedPeriod.type === preset ? "default" : "outline"
                  }
                  size="sm"
                  className="h-8 shrink-0 px-2.5 whitespace-nowrap"
                  onClick={() =>
                    preset !== "custom"
                      ? selectPeriod({
                          type: preset as Exclude<Period, "custom">,
                        })
                      : openPeriodSelectDialog()
                  }
                >
                  {periods[preset]?.label ?? preset}
                </Button>
              ))}
            </div>
          ) : null}
          <Separator orientation="vertical" className="my-auto h-8" />
          <Button
            variant="outline"
            size="icon"
            onClick={openPeriodSelectDialog}
          >
            <CalendarIcon size={16} />
          </Button>
          <Button variant="outline" onClick={handleAutoRefresh}>
            {autoRefresh ? <RefreshCcwDotIcon /> : <RefreshCcwIcon />}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
