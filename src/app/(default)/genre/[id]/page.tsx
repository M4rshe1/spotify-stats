import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api } from "@/trpc/server";
import ClientPage from "./_components/client-page";

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const genre = await api.genre.get({ id: numericId });
  const periodInput = await getPreferredMetricsInput();

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
