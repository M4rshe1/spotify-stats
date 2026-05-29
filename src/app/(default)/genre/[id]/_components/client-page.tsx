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

const ClientPage = ({ id }: { id: number }) => {
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <GenreCard id={id} period={selectedPeriod} />
      <div className="h-fit">
        <FirstLastPlayed id={id} />
      </div>
      <div className="h-72">
        <GenreTimeListened genreId={id} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <GenreTimeDistribution genreId={id} period={selectedPeriod} />
      </div>
      <div className="h-fit">
        <TopTracks id={id} />
      </div>
      <div className="h-fit">
        <TopArtists id={id} />
      </div>
      <div className="h-fit">
        <TopAlbums id={id} />
      </div>
      <div className="h-fit">
        <GenreRecentPlays id={id} />
      </div>
    </div>
  );
};

export default ClientPage;
