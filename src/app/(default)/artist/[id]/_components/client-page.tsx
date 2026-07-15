"use client";

import { ArtistTimeDistribution } from "@/components/charts/artist-time-distribution";
import { ArtistTimeListened } from "@/components/charts/artist-time-listened";
import { usePeriod } from "@/providers/period-provider";

import { ArtistRecentPlays } from "@/components/recent-plays";

import ArtistCard from "./artist-card";
import FirstLastPlayed from "./first-last-played";
import TopAlbums from "./top-albums";
import TopTracks from "./top-tracks";

const ClientPage = ({ id }: { id: number }) => {
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ArtistCard id={id} period={selectedPeriod} />
      <div className="h-fit">
        <FirstLastPlayed id={id} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <ArtistTimeListened artistId={id} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <ArtistTimeDistribution artistId={id} period={selectedPeriod} />
      </div>
      <div className="h-fit">
        <TopTracks id={id} />
      </div>
      <div className="h-fit">
        <TopAlbums id={id} />
      </div>
      <div className="h-fit lg:col-span-2">
        <ArtistRecentPlays id={id} />
      </div>
    </div>
  );
};

export default ClientPage;
