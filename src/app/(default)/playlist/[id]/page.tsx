import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api } from "@/trpc/server";
import ClientPage from "./_components/client-page";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await props.params;
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      return {
        title: "Playlist",
        description: "Playlist listening stats and charts in Spotify Stats.",
      };
    }
    const periodInput = await getPreferredMetricsInput();
    const playlist = await api.playlist.get({
      id: numericId,
      ...periodInput,
    });
    return {
      title: playlist.name,
      description: `Top tracks and listening stats for the playlist "${playlist.name}".`,
    };
  } catch {
    return {
      title: "Playlist",
      description: "Playlist listening stats and charts in Spotify Stats.",
    };
  }
}

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const periodInput = await getPreferredMetricsInput();
  const playlist = await api.playlist.get({ id: numericId, ...periodInput });

  void api.playlist.firstLastPlayed.prefetch({ id: numericId });
  void api.playlist.recentPlaybacks.prefetch({ id: numericId });
  void api.playlist.getTopTracks.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.playlist.getTopAlbums.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.playlist.getTopGenres.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.chart.getPlaylistTimeListened.prefetch({
    playlistId: numericId,
    ...periodInput,
  });
  void api.chart.getPlaylistTimeDistribution.prefetch({
    playlistId: numericId,
    ...periodInput,
  });

  return (
    <div>
      <PageBreadcrumbs
        trail={[
          { label: "Playlists", href: "/top/playlists" },
          { label: playlist.name, href: `/playlist/${playlist.id}` },
        ]}
      />
      <ClientPage id={id} />
    </div>
  );
});

export default Page;
