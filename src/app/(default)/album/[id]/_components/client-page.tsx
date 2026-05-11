"use client";

import { AlbumTimeDistribution } from "@/components/charts/album-time-distribution";
import { AlbumTimeListened } from "@/components/charts/album-time-listened";
import { usePeriod } from "@/providers/period-provider";

import { AlbumRecentPlays } from "@/components/recent-plays";

import AlbumCard from "./album-card";
import FirstLastPlayed from "./first-last-played";
import TopTracks from "./top-tracks";

const ClientPage = ({ id }: { id: string }) => {
  const numericId = parseInt(id, 10);
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <AlbumCard id={numericId} period={selectedPeriod} />
      <div className="h-fit">
        <FirstLastPlayed id={numericId} />
      </div>
      <div className="h-72">
        <AlbumTimeListened albumId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <AlbumTimeDistribution albumId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-fit lg:col-span-2">
        <TopTracks id={numericId} />
      </div>
      <div className="h-fit lg:col-span-2">
        <AlbumRecentPlays id={numericId} />
      </div>
    </div>
  );
};

export default ClientPage;
