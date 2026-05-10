import { AdminMasterDataPageClient } from "./_components/admin-master-data-page";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAdmin } from "@/lib/hoc-pages";

async function AdminMasterDataPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Master Data", href: "/admin/master-data" },
        ]}
      />
      <AdminMasterDataPageClient />
    </div>
  );
}

export default withAdmin(AdminMasterDataPage);
