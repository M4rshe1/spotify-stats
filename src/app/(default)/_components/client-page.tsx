"use client";

import { usePeriod } from "@/providers/period-provider";
import KeyMetrics from "./key-metrics";
import TopTrack from "./top-track";
import TopArtist from "./top-artist";
import { TimeListened } from "@/components/charts/time-listened";
import { TimeDistribution } from "@/components/charts/time-distribution";
import RecentlyPlayed from "./recently-played";

export default function ClientPage() {
  const { selectedPeriod } = usePeriod();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <KeyMetrics period={selectedPeriod} />
      <div className="flex h-85 min-h-0 flex-col lg:col-span-2">
        <TimeListened period={selectedPeriod} from={undefined} to={undefined} />
      </div>
      <TopArtist period={selectedPeriod} />
      <div className="flex h-85 min-h-0 flex-col lg:col-span-2">
        <TimeDistribution
          period={selectedPeriod}
          from={undefined}
          to={undefined}
        />
      </div>
      <TopTrack period={selectedPeriod} />
      <div className="lg:col-span-3">
        <RecentlyPlayed period={selectedPeriod} />
      </div>
    </div>
  );
}
