import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { api, HydrateClient } from "@/trpc/server";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import ClientPage from "./_components/client-page";

export const metadata: Metadata = {
  title: { absolute: "Spotify Stats" },
  description:
    "Dashboard: your listening time, top tracks and artists, charts, and recently played music.",
};

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await Promise.all([
    api.dashboard.getTracksMetric.prefetch(metricsInput),
    api.dashboard.getDurationMetric.prefetch(metricsInput),
    api.dashboard.getArtistsMetric.prefetch(metricsInput),
    api.dashboard.getRecentlyPlayed.prefetch({
      ...metricsInput,
      limit: 20,
    }),
    api.dashboard.getTopTrack.prefetch(metricsInput),
    api.dashboard.getTopArtist.prefetch(metricsInput),
    api.chart.getTimeListened.prefetch(metricsInput),
    api.chart.getTimeDistribution.prefetch(metricsInput),
  ]);

  return (
    <>
      <PageBreadcrumbs trail={[{ label: "Dashboard", href: "/" }]} />
      <HydrateClient>
        <ClientPage />
      </HydrateClient>
    </>
  );
});
