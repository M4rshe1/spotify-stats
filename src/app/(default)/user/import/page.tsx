import { HydrateClient, api } from "@/trpc/server";
import { withAuth } from "@/lib/hoc-pages";
import ImportPage from "./_components/import-page";

export default withAuth(async () => {
  await api.import.list.prefetch();

  return (
    <HydrateClient>
      <ImportPage />
    </HydrateClient>
  );
});
