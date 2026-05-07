"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbList,
} from "./ui/breadcrumb";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";
import { periods } from "@/lib/consts/periods";
import { usePeriod } from "@/providers/period-provider";
import { useEffect, useState } from "react";
import { CalendarIcon, RefreshCcwDotIcon, RefreshCcwIcon } from "lucide-react";
import { api } from "@/trpc/react";

const AUTO_REFRESH_LS_KEY = "header-auto-refresh-enabled";

const Header = () => {
  const {
    selectedPeriod,
    openPeriodSelectDialog,
    selectPeriod,
    headerFavoritePeriods,
  } = usePeriod();
  const selectedPeriodLabel =
    periods[selectedPeriod]?.label ?? periods.today.label;
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const utils = api.useUtils();

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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          {headerFavoritePeriods.length > 0 ? (
            <div className="hidden max-w-[min(72vw,32rem)] items-center gap-1 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-md lg:flex [&::-webkit-scrollbar]:hidden">
              {headerFavoritePeriods.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={selectedPeriod === p ? "default" : "outline"}
                  size="sm"
                  className="h-8 shrink-0 px-2.5 whitespace-nowrap"
                  onClick={() => selectPeriod(p)}
                >
                  {periods[p]?.label ?? p}
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
