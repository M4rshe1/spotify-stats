import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api } from "@/trpc/server";
import ClientPage from "./_components/client-page";

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
