import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import TopEntityPage from "../_components/top-entity-page";

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.top.getTopAlbums.prefetch({
    ...metricsInput,
    limit: 20,
    sortBy: "duration",
  });

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "Top", href: "/top" },
          { label: "Top Albums", href: "/top/albums" },
        ]}
      />
      <HydrateClient>
        <TopEntityPage type="albums" />
      </HydrateClient>
    </>
  );
});
