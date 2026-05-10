import { AdminUsersPageClient } from "./_components/admin-users-page";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAdmin } from "@/lib/hoc-pages";

async function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin/users" },
          { label: "Users", href: "/admin/users" },
        ]}
      />
      <AdminUsersPageClient />
    </div>
  );
}

export default withAdmin(AdminUsersPage);
