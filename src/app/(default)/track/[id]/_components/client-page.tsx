"use client";

import { TrackTimeDistribution } from "@/components/charts/track-time-distribution";
import { TrackTimeListened } from "@/components/charts/track-time-listened";
import { usePeriod } from "@/providers/period-provider";

import { TrackRecentPlays } from "@/components/recent-plays";

import TrackCard from "./track-card";
import FirstLastPlayed from "./first-last-played";

const ClientPage = ({ id }: { id: string }) => {
  const numericId = parseInt(id, 10);
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TrackCard id={numericId} />
      <div className="h-fit">
        <FirstLastPlayed id={numericId} />
      </div>
      <div className="h-72">
        <TrackTimeListened trackId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <TrackTimeDistribution trackId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-fit lg:col-span-2">
        <TrackRecentPlays id={numericId} />
      </div>
    </div>
  );
};

export default ClientPage;
