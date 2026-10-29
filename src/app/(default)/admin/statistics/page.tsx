import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAdmin } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";

import { AdminStatisticsPage } from "./_components/admin-statistics-page";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Listening statistics across every account.",
};

async function AdminStatisticsRoute() {
  const metricsInput = await getPreferredMetricsInput();
  const instanceInput = { ...metricsInput, scope: "all" as const };
  const rankedInput = { ...metricsInput, limit: 10 };

  await Promise.all([
    api.admin.statistics.getOverview.prefetch(metricsInput),
    api.admin.statistics.getListeningByUser.prefetch(metricsInput),
    api.admin.statistics.getTopTracks.prefetch(rankedInput),
    api.admin.statistics.getTopArtists.prefetch(rankedInput),
    api.chart.getTimeListened.prefetch(instanceInput),
    api.chart.getTimeDistribution.prefetch(instanceInput),
    api.chart.getDayOfWeekDistribution.prefetch(instanceInput),
    api.chart.getPlatformDistribution.prefetch(instanceInput),
    api.chart.getDeviceDistribution.prefetch(instanceInput),
    api.chart.getContextDistribution.prefetch(instanceInput),
    api.chart.getArtistCountDistribution.prefetch(instanceInput),
    api.chart.getGenreDistribution.prefetch(instanceInput),
    api.chart.getExplicitDistribution.prefetch(instanceInput),
    api.chart.getTrackLengthDistribution.prefetch(instanceInput),
    api.chart.getReleaseDecadeDistribution.prefetch(instanceInput),
    api.chart.getReleaseYearDistribution.prefetch(instanceInput),
    api.chart.getListeningCalendar.prefetch(instanceInput),
  ]);

  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Statistics", href: "/admin/statistics" },
        ]}
      />
      <HydrateClient>
        <AdminStatisticsPage />
      </HydrateClient>
    </div>
  );
}

export default withAdmin(AdminStatisticsRoute);
