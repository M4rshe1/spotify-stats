import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import TopEntityPage from "../_components/top-entity-page";

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.dashboard.getTopAlbums.prefetch({
    ...metricsInput,
    limit: 20,
    sortBy: "duration",
  });

  return (
    <HydrateClient>
      <TopEntityPage type="albums" />
    </HydrateClient>
  );
});
