import type { Metadata } from "next";

import { withAuth } from "@/lib/hoc-pages";
import { HydrateClient, api } from "@/trpc/server";
import SettingsPage from "./_components/settings-page";

export const metadata: Metadata = {
  title: "Settings",
};

export default withAuth(async () => {
  await Promise.all([
    api.user.getTimezone.prefetch(),
    api.user.getPreferredPeriod.prefetch(),
  ]);

  return (
    <HydrateClient>
      <SettingsPage />
    </HydrateClient>
  );
});
