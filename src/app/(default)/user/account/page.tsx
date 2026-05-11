import type { Metadata } from "next";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAuth } from "@/lib/hoc-pages";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { HydrateClient, api } from "@/trpc/server";
import AccountPage from "./_components/account-page";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Manage your Spotify connection, plan details, and account sign-out.",
};

export default withAuth(async () => {
  await api.user.getSpotifyPlan.prefetch();

  return (
    <>
      <PageBreadcrumbs trail={[{ label: "Account", href: "/user/account" }]} />
      <HydrateClient>
        <AccountPage googleAuthEnabled={isGoogleAuthConfigured()} />
      </HydrateClient>
    </>
  );
});
