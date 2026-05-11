import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
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
    <>
      <PageBreadcrumbs
        trail={[
          { label: "User", href: "/user/account" },
          { label: "Settings", href: "/user/settings" },
        ]}
      />
      <HydrateClient>
        <SettingsPage />
      </HydrateClient>
    </>
  );
});
