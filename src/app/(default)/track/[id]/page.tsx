import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api } from "@/trpc/server";
import ClientPage from "./_components/client-page";

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const track = await api.track.get({ id: numericId });
  const periodInput = await getPreferredMetricsInput();

  void api.track.firstLastPlayed.prefetch({ id: numericId });
  void api.track.recentPlaybacks.prefetch({ id: numericId });
  void api.chart.getTrackTimeListened.prefetch({
    trackId: numericId,
    ...periodInput,
  });
  void api.chart.getTrackTimeDistribution.prefetch({
    trackId: numericId,
    ...periodInput,
  });

  return (
    <div>
      <PageBreadcrumbs
        trail={[
          { label: "Tracks", href: "/top/tracks" },
          { label: track.name, href: `/track/${track.id}` },
        ]}
      />
      <ClientPage id={id} />
    </div>
  );
});

export default Page;
