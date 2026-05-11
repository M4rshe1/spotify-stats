import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import TopEntityPage from "../_components/top-entity-page";

export const metadata: Metadata = {
  title: "Top tracks",
  description:
    "Your most listened-to tracks for the selected period, sorted by total listening time.",
};

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.top.getTopTracks.prefetch({
    ...metricsInput,
    limit: 20,
    sortBy: "duration",
  });

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "Top", href: "/top" },
          { label: "Top Tracks", href: "/top/tracks" },
        ]}
      />
      <HydrateClient>
        <TopEntityPage type="tracks" />
      </HydrateClient>
    </>
  );
});
