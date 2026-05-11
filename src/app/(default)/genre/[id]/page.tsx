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
        title: "Genre",
        description: "Genre listening stats and charts in Spotify Stats.",
      };
    }
    const periodInput = await getPreferredMetricsInput();
    const genre = await api.genre.get({ id: numericId, period: periodInput });
    return {
      title: genre.name,
      description: `Top tracks, artists, and albums for the ${genre.name} genre in your stats.`,
    };
  } catch {
    return {
      title: "Genre",
      description: "Genre listening stats and charts in Spotify Stats.",
    };
  }
}

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const periodInput = await getPreferredMetricsInput();
  const genre = await api.genre.get({ id: numericId, period: periodInput });

  void api.genre.firstLastPlayed.prefetch({ id: numericId });
  void api.genre.recentPlaybacks.prefetch({ id: numericId });
  void api.genre.getTopTracks.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.genre.getTopAlbums.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.genre.getTopArtists.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.chart.getGenreTimeListened.prefetch({
    genreId: numericId,
    ...periodInput,
  });
  void api.chart.getGenreTimeDistribution.prefetch({
    genreId: numericId,
    ...periodInput,
  });

  return (
    <div>
      <PageBreadcrumbs
        trail={[
          { label: "Genres", href: "/top/genres" },
          { label: genre.name, href: `/genre/${genre.id}` },
        ]}
      />
      <ClientPage id={id} />
    </div>
  );
});

export default Page;
