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
        title: "Track",
        description: "Track listening stats and charts in Spotify Stats.",
      };
    }
    const periodInput = await getPreferredMetricsInput();
    const track = await api.track.get({ id: numericId, ...periodInput });
    return {
      title: track.name,
      description: `Listening stats, charts, and history for "${track.name}" in your Spotify Stats.`,
    };
  } catch {
    return {
      title: "Track",
      description: "Track listening stats and charts in Spotify Stats.",
    };
  }
}

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const numericId = parseInt(id, 10);
  const periodInput = await getPreferredMetricsInput();
  const track = await api.track.get({ id: numericId, ...periodInput });

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
