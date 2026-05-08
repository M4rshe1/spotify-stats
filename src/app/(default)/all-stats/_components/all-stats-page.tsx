"use client";

import { DeviceSplitChart } from "@/components/charts/device-split-chart";
import { PlatformSplitChart } from "@/components/charts/platform-split-chart";
import { TimeDistribution } from "@/components/charts/time-distribution";
import { TimeListened } from "@/components/charts/time-listened";
import { usePeriod } from "@/providers/period-provider";

export default function AllStatsPage() {
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TimeListened period={selectedPeriod} />
      </div>
      <div className="lg:col-span-1">
        <PlatformSplitChart period={selectedPeriod} />
      </div>
      <div className="lg:col-span-1">
        <DeviceSplitChart period={selectedPeriod} />
      </div>
      <div className="lg:col-span-2">
        <TimeDistribution period={selectedPeriod} />
      </div>
    </div>
  );
}
