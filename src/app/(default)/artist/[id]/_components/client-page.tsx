"use client";

import { ArtistTimeDistribution } from "@/components/charts/artist-time-distribution";
import { ArtistTimeListened } from "@/components/charts/artist-time-listened";
import { usePeriod } from "@/providers/period-provider";

import ArtistCard from "./artist-card";
import FirstLastPlayed from "./first-last-played";
import TopAlbums from "./top-albums";
import TopTracks from "./top-tracks";

const ClientPage = ({ id }: { id: string }) => {
  const numericId = parseInt(id, 10);
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ArtistCard id={numericId} />
      <div className="h-fit">
        <FirstLastPlayed id={numericId} />
      </div>
      <div className="h-72">
        <ArtistTimeListened artistId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <ArtistTimeDistribution artistId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-fit">
        <TopTracks id={numericId} />
      </div>
      <div className="h-fit">
        <TopAlbums id={numericId} />
      </div>
    </div>
  );
};

export default ClientPage;
