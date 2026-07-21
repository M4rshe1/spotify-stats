import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import FirstListenPage from "../_components/first-listen-page";

export const metadata: Metadata = {
  title: "First listen genres",
  description:
    "Your first listened genres for the selected period, sorted by the first listening time.",
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
          { label: "First Listen", href: "/first-listen" },
          { label: "First Listen Genres", href: "/first-listen/genres" },
        ]}
      />
      <HydrateClient>
        <FirstListenPage type="genres" />
      </HydrateClient>
    </>
  );
});
