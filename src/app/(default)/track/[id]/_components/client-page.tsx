"use client";

import { TrackTimeDistribution } from "@/components/charts/track-time-distribution";
import { TrackTimeListened } from "@/components/charts/track-time-listened";
import { usePeriod } from "@/providers/period-provider";

import { TrackRecentPlays } from "@/components/recent-plays";

import TrackCard from "./track-card";
import FirstLastPlayed from "./first-last-played";

const ClientPage = ({ id }: { id: number }) => {
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TrackCard id={id} period={selectedPeriod} />
      <div className="h-fit">
        <FirstLastPlayed id={id} />
      </div>
      <div className="h-72">
        <TrackTimeListened trackId={id} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <TrackTimeDistribution trackId={id} period={selectedPeriod} />
      </div>
      <div className="h-fit lg:col-span-2">
        <TrackRecentPlays id={id} />
      </div>
    </div>
  );
};

export default ClientPage;
