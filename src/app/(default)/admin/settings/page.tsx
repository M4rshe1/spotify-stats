import { AdminSettingsPageClient } from "./_components/admin-settings-page";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAdmin } from "@/lib/hoc-pages";

async function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin/users" },
          { label: "Settings", href: "/admin/settings" },
        ]}
      />
      <AdminSettingsPageClient />
    </div>
  );
}

export default withAdmin(AdminSettingsPage);
