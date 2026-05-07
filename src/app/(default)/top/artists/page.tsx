import { withAuth } from "@/lib/hoc-pages";
import { HydrateClient } from "@/trpc/server";
import TopEntityPage from "../_components/top-entity-page";

export default withAuth(async () => {
  return (
    <HydrateClient>
      <TopEntityPage type="artists" />
    </HydrateClient>
  );
});
