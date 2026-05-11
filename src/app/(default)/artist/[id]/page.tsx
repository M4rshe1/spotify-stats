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
        title: "Artist",
        description: "Artist listening stats and charts in Spotify Stats.",
      };
    }
    const periodInput = await getPreferredMetricsInput();
    const artist = await api.artist.get({ id: numericId, ...periodInput });
    return {
      title: artist.name,
      description: `Top tracks, albums, and listening stats for ${artist.name}.`,
    };
  } catch {
    return {
      title: "Artist",
      description: "Artist listening stats and charts in Spotify Stats.",
    };
  }
}

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const periodInput = await getPreferredMetricsInput();
  const artist = await api.artist.get({ id: numericId, ...periodInput });

  void api.artist.firstLastPlayed.prefetch({ id: numericId });
  void api.artist.recentPlaybacks.prefetch({ id: numericId });
  void api.artist.getTopTracks.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.artist.getTopAlbums.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.chart.getArtistTimeListened.prefetch({
    artistId: numericId,
    ...periodInput,
  });
  void api.chart.getArtistTimeDistribution.prefetch({
    artistId: numericId,
    ...periodInput,
  });

  return (
    <div>
      <PageBreadcrumbs
        trail={[
          { label: "Artists", href: "/top/artists" },
          { label: artist.name, href: `/artist/${artist.id}` },
        ]}
      />
      <ClientPage id={id} />
    </div>
  );
});

export default Page;
