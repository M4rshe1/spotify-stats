"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, UploadIcon } from "lucide-react";

import { DeviceSplitChart } from "@/components/charts/device-split-chart";
import { ContextSplitChart } from "@/components/charts/context-split-chart";
import { PlatformSplitChart } from "@/components/charts/platform-split-chart";
import { TimeDistribution } from "@/components/charts/time-distribution";
import { TimeListened } from "@/components/charts/time-listened";
import type { StatsScope } from "@/lib/provider-period-query-input";
import { usePeriod } from "@/providers/period-provider";
import { ArtistCountSplitChart } from "@/components/charts/artist-count-split-chart";
import { DayOfWeekDistribution } from "@/components/charts/day-of-week-distribution";
import { GenreSplitChart } from "@/components/charts/genre-split-chart";
import { ExplicitSplitChart } from "@/components/charts/explicit-split-chart";
import { TrackLengthSplitChart } from "@/components/charts/track-length-split-chart";
import { ReleaseDecadeSplitChart } from "@/components/charts/release-decade-split-chart";
import { ReleaseYearDistribution } from "@/components/charts/release-year-distribution";
import { ListeningCalendarChart } from "@/components/charts/listening-calendar-chart";
import {
  CountrySplitChart,
  ReasonEndSplitChart,
  ShuffleSplitChart,
  SkipSplitChart,
} from "@/components/charts/import-split-charts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const EXPORT_STATS_OPEN_KEY = "all-stats-export-charts-open";

export default function AllStatsPage({ scope }: { scope?: StatsScope }) {
  const { selectedPeriod } = usePeriod();
  const [exportStatsOpen, setExportStatsOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXPORT_STATS_OPEN_KEY);
      if (stored === "true") setExportStatsOpen(true);
      if (stored === "false") setExportStatsOpen(false);
    } catch {}
  }, []);

  function handleExportStatsOpenChange(next: boolean) {
    setExportStatsOpen(next);
    try {
      localStorage.setItem(EXPORT_STATS_OPEN_KEY, String(next));
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ListeningCalendarChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <TimeListened period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <PlatformSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <DeviceSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <TimeDistribution period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <DayOfWeekDistribution period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <ContextSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <ArtistCountSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <GenreSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <ExplicitSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <TrackLengthSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <ReleaseDecadeSplitChart period={selectedPeriod} scope={scope} />
        </div>
        <div className="min-h-72">
          <ReleaseYearDistribution period={selectedPeriod} scope={scope} />
        </div>
      </div>
      <Collapsible
        open={exportStatsOpen}
        onOpenChange={handleExportStatsOpenChange}
      >
        <CollapsibleTrigger className="bg-card ring-foreground/10 hover:bg-muted/40 group flex w-full items-center gap-3 px-4 py-3 text-left ring-1 transition-colors">
          <UploadIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="font-heading block text-sm font-medium">
              Extended history stats
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              {scope === "all"
                ? "Skip, shuffle, country, and how plays ended across every account. These need a Spotify extended streaming history import."
                : "Skip, shuffle, country, and how plays ended. These need a Spotify extended streaming history import."}
            </span>
          </span>
          <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="min-h-72">
              <SkipSplitChart period={selectedPeriod} scope={scope} />
            </div>
            <div className="min-h-72">
              <ShuffleSplitChart period={selectedPeriod} scope={scope} />
            </div>
            <div className="min-h-72">
              <CountrySplitChart period={selectedPeriod} scope={scope} />
            </div>
            <div className="min-h-72">
              <ReasonEndSplitChart period={selectedPeriod} scope={scope} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
