import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import FirstListenPage from "../_components/first-listen-page";

export const metadata: Metadata = {
  title: "First listen tracks",
  description:
    "Your first listened tracks for the selected period, sorted by the first listening time.",
};

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.first.getFirstListenTracks.prefetch({
    ...metricsInput,
  });

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "First Listen", href: "/first-listen" },
          { label: "First Listen Tracks", href: "/first-listen/tracks" },
        ]}
      />
      <HydrateClient>
        <FirstListenPage type="tracks" />
      </HydrateClient>
    </>
  );
});
