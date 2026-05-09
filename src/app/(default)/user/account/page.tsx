import type { Metadata } from "next";

import { withAuth } from "@/lib/hoc-pages";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { HydrateClient, api } from "@/trpc/server";
import AccountPage from "./_components/account-page";

export const metadata: Metadata = {
  title: "Account",
};

export default withAuth(async () => {
  await api.user.getSpotifyPlan.prefetch();

  return (
    <HydrateClient>
      <AccountPage googleAuthEnabled={isGoogleAuthConfigured()} />
    </HydrateClient>
  );
});
