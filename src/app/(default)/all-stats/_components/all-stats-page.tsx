"use client";

import { DeviceSplitChart } from "@/components/charts/device-split-chart";
import { ContextSplitChart } from "@/components/charts/context-split-chart";
import { PlatformSplitChart } from "@/components/charts/platform-split-chart";
import { TimeDistribution } from "@/components/charts/time-distribution";
import { TimeListened } from "@/components/charts/time-listened";
import { usePeriod } from "@/providers/period-provider";
import { ArtistCountSplitChart } from "@/components/charts/artist-count-split-chart";

export default function AllStatsPage() {
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-h-72">
        <TimeListened period={selectedPeriod} />
      </div>
      <div className="min-h-72">
        <PlatformSplitChart period={selectedPeriod} />
      </div>
      <div className="min-h-72">
        <DeviceSplitChart period={selectedPeriod} />
      </div>
      <div className="min-h-72">
        <TimeDistribution period={selectedPeriod} />
      </div>
      <div className="min-h-72">
        <ContextSplitChart period={selectedPeriod} />
      </div>
      <div className="min-h-72">
        <ArtistCountSplitChart period={selectedPeriod} />
      </div>
    </div>
  );
}
