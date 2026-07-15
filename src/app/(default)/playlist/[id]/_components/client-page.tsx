"use client";

import { PlaylistTimeDistribution } from "@/components/charts/playlist-time-distribution";
import { PlaylistTimeListened } from "@/components/charts/playlist-time-listened";
import { usePeriod } from "@/providers/period-provider";

import { PlaylistRecentPlays } from "@/components/recent-plays";

import PlaylistCard from "./playlist-card";
import FirstLastPlayed from "./first-last-played";
import TopTracks from "./top-tracks";
import TopArtists from "./top-artists";
import TopAlbums from "./top-albums";
import TopGenres from "./top-genres";

const ClientPage = ({ id }: { id: number }) => {
  const { selectedPeriod } = usePeriod();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <PlaylistCard id={id} period={selectedPeriod} />
      <div className="h-fit">
        <FirstLastPlayed id={id} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <PlaylistTimeListened playlistId={id} period={selectedPeriod} />
      </div>
      <div className="h-72">
        <PlaylistTimeDistribution playlistId={id} period={selectedPeriod} />
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
        <TopGenres id={id} />
      </div>
      <div className="h-fit lg:col-span-2">
        <PlaylistRecentPlays id={id} />
      </div>
    </div>
  );
};

export default ClientPage;
