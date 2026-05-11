"use client";

import { GenreTimeDistribution } from "@/components/charts/genre-time-distribution";
import { GenreTimeListened } from "@/components/charts/genre-time-listened";
import { GenreRecentPlays } from "@/components/recent-plays";
import { usePeriod } from "@/providers/period-provider";

import GenreCard from "./genre-card";
import FirstLastPlayed from "./first-last-played";
import TopAlbums from "./top-albums";
import TopTracks from "./top-tracks";
import TopArtists from "./top-artists";

const ClientPage = ({ id }: { id: string }) => {
  const numericId = parseInt(id, 10);
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <GenreCard id={numericId} />
      <div className="h-fit">
        <FirstLastPlayed id={numericId} />
      </div>
      <div className="h-72">
        <GenreTimeListened genreId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <GenreTimeDistribution genreId={numericId} period={selectedPeriod} />
      </div>
      <div className="h-fit">
        <TopTracks id={numericId} />
      </div>
      <div className="h-fit">
        <TopArtists id={numericId} />
      </div>
      <div className="h-fit">
        <TopAlbums id={numericId} />
      </div>
      <div className="h-fit">
        <GenreRecentPlays id={numericId} />
      </div>
    </div>
  );
};

export default ClientPage;
