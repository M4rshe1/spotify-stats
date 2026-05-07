import { withAuth } from "@/lib/hoc-pages";
import { HydrateClient } from "@/trpc/server";
import LongestSessionPage from "./_components/longest-session-page";

export default withAuth(async () => {
  return (
    <HydrateClient>
      <LongestSessionPage />
    </HydrateClient>
  );
});
