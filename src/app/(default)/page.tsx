import { api, HydrateClient } from "@/trpc/server";
import { withAuth } from "@/lib/hoc-pages";
import ClientPage from "./_components/client-page";

export default withAuth(async () => {
  const { period, customStart, customEnd } =
    await api.user.getPreferredPeriod();
  const metricsInput = {
    period,
    from: customStart ?? undefined,
    to: customEnd ?? undefined,
  };
  void api.dashboard.getTracksMetric.prefetch(metricsInput);
  void api.dashboard.getDurationMetric.prefetch(metricsInput);
  void api.dashboard.getArtistsMetric.prefetch(metricsInput);

  return (
    <HydrateClient>
      <ClientPage />
    </HydrateClient>
  );
});
