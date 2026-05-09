import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api } from "@/trpc/server";
import ClientPage from "./_components/client-page";

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const artist = await api.artist.get({ id: numericId });
  const periodInput = await getPreferredMetricsInput();

  void api.artist.firstLastPlayed.prefetch({ id: numericId });
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
