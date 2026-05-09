import { withAuth } from "@/lib/hoc-pages";
import { api } from "@/trpc/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

const Page = withAuth(async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const artist = await api.artist.get({ id: parseInt(id) });
  return (
    <div>
      <PageBreadcrumbs
        trail={[
          { label: "Artists", href: "/top/artists" },
          { label: artist.name, href: `/artist/${artist.id}` },
        ]}
      />
    </div>
  );
});

export default Page;
