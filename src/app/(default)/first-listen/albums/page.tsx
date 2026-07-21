import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import FirstListenPage from "../_components/first-listen-page";

export const metadata: Metadata = {
  title: "First time listened albums",
  description:
    "Your first time listened albums for the selected period, sorted by the first listening time.",
};

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.first.getFirstListenAlbums.prefetch({
    ...metricsInput,
  });

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "First Time Listened", href: "/first-listen" },
          { label: "Albums", href: "/first-listen/albums" },
        ]}
      />
      <HydrateClient>
        <FirstListenPage type="albums" />
      </HydrateClient>
    </>
  );
});
