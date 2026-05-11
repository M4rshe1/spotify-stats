import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { HydrateClient, api } from "@/trpc/server";
import { withAuth } from "@/lib/hoc-pages";
import ImportPage from "./_components/import-page";

export default withAuth(async () => {
  await api.import.list.prefetch();

  return (
    <>
      <PageBreadcrumbs
        trail={[
          { label: "User", href: "/user/account" },
          { label: "Import", href: "/user/import" },
        ]}
      />
      <HydrateClient>
        <ImportPage />
      </HydrateClient>
    </>
  );
});
