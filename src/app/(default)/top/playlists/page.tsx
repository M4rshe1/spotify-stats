import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import TopEntityPage from "../_components/top-entity-page";

export const metadata: Metadata = {
  title: "Top playlists",
  description:
    "Playlists ranked by how much time you spent listening during the selected period.",
};

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.top.getTopPlaylists.prefetch({
    ...metricsInput,
    limit: 20,
    sortBy: "duration",
  });

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "Top", href: "/top" },
          { label: "Playlists", href: "/top/playlists" },
        ]}
      />
      <HydrateClient>
        <TopEntityPage type="playlists" />
      </HydrateClient>
    </>
  );
});
