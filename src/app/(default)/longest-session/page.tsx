import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { getPreferredMetricsInput } from "@/lib/get-preferred-metrics-input";
import { withAuth } from "@/lib/hoc-pages";
import { api, HydrateClient } from "@/trpc/server";
import LongestSessionPage from "./_components/longest-session-page";

export default withAuth(async () => {
  const metricsInput = await getPreferredMetricsInput();
  await api.session.getLongestSessions.prefetch(metricsInput);

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "Dashboard", href: "/" },
          { label: "Longest Session", href: "/longest-session" },
        ]}
      />
      <HydrateClient>
        <LongestSessionPage />
      </HydrateClient>
    </>
  );
});
