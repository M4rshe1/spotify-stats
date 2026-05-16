import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import AllStatsPage from "./_components/all-stats-page";

export const metadata: Metadata = {
  title: "All stats",
  description:
    "Deeper breakdowns of your listening across platforms, devices, and categories.",
};

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();

  await Promise.all([
    api.chart.getTimeListened.prefetch(metricsInput),
    api.chart.getTimeDistribution.prefetch(metricsInput),
    api.chart.getDayOfWeekDistribution.prefetch(metricsInput),
    api.chart.getPlatformDistribution.prefetch(metricsInput),
    api.chart.getDeviceDistribution.prefetch(metricsInput),
    api.chart.getContextDistribution.prefetch(metricsInput),
    api.chart.getArtistCountDistribution.prefetch(metricsInput),
    api.chart.getGenreDistribution.prefetch(metricsInput),
    api.chart.getExplicitDistribution.prefetch(metricsInput),
    api.chart.getTrackLengthDistribution.prefetch(metricsInput),
    api.chart.getReleaseDecadeDistribution.prefetch(metricsInput),
    api.chart.getReleaseYearDistribution.prefetch(metricsInput),
  ]);

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "Dashboard", href: "/" },
          { label: "All Stats", href: "/all-stats" },
        ]}
      />
      <HydrateClient>
        <AllStatsPage />
      </HydrateClient>
    </>
  );
});
