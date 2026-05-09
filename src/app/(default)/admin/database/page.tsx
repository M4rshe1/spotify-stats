import { AdminDatabaseStudio } from "@/components/admin-database-studio";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAdmin } from "@/lib/hoc-pages";

async function AdminDatabasePage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin/database" },
          { label: "Database", href: "/admin/database" },
        ]}
      />
      <AdminDatabaseStudio />
    </div>
  );
}

export default withAdmin(AdminDatabasePage);
