"use client";

import { DeviceSplitChart } from "@/components/charts/device-split-chart";
import { PlatformSplitChart } from "@/components/charts/platform-split-chart";
import { TimeDistribution } from "@/components/charts/time-distribution";
import { TimeListened } from "@/components/charts/time-listened";
import { usePeriod } from "@/providers/period-provider";

export default function AllStatsPage() {
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2">
        <TimeListened period={selectedPeriod} />
      </div>
      <div className="lg:col-span-2">
        <PlatformSplitChart period={selectedPeriod} />
      </div>
      <div className="lg:col-span-2">
        <DeviceSplitChart period={selectedPeriod} />
      </div>
      <div className="lg:col-span-2">
        <TimeDistribution period={selectedPeriod} />
      </div>
    </div>
  );
}
