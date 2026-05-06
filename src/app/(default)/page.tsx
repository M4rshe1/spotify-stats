import { api, HydrateClient } from "@/trpc/server";
import { withAuth } from "@/lib/hoc-pages";
import ClientPage from "./_components/client-page";

export default withAuth(async () => {
  const { period, customStart, customEnd } =
    await api.user.getPreferredPeriod();
  void api.dashboard.getKeyMetrics.prefetch({
    period,
    from: customStart ?? undefined,
    to: customEnd ?? undefined,
  });

  return (
    <HydrateClient>
      <ClientPage />
    </HydrateClient>
  );
});
