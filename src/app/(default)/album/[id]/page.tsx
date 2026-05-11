import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api } from "@/trpc/server";
import ClientPage from "./_components/client-page";

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const periodInput = await getPreferredMetricsInput();
  const album = await api.album.get({ id: numericId, ...periodInput });

  void api.album.firstLastPlayed.prefetch({ id: numericId });
  void api.album.recentPlaybacks.prefetch({ id: numericId });
  void api.album.getTopTracks.prefetch({
    id: numericId,
    sortBy: "duration",
    ...periodInput,
  });
  void api.chart.getAlbumTimeListened.prefetch({
    albumId: numericId,
    ...periodInput,
  });
  void api.chart.getAlbumTimeDistribution.prefetch({
    albumId: numericId,
    ...periodInput,
  });

  return (
    <div>
      <PageBreadcrumbs
        trail={[
          { label: "Albums", href: "/top/albums" },
          { label: album.name, href: `/album/${album.id}` },
        ]}
      />
      <ClientPage id={id} />
    </div>
  );
});

export default Page;
