import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import FirstListenPage from "../_components/first-listen-page";

export const metadata: Metadata = {
  title: "First time listened genres",
  description:
    "Your first time listened genres for the selected period, sorted by the first listening time.",
};

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.first.getFirstListenGenres.prefetch({
    ...metricsInput,
  });

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "First Time Listened", href: "/first-listen" },
          { label: "Genres", href: "/first-listen/genres" },
        ]}
      />
      <HydrateClient>
        <FirstListenPage type="genres" />
      </HydrateClient>
    </>
  );
});
