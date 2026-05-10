import { AdminDatabaseStudio } from "@/components/admin-database-studio";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAdmin } from "@/lib/hoc-pages";
import { WarningCard } from "./_components/wraning-card";

async function AdminDatabasePage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin/database" },
          { label: "Database", href: "/admin/database" },
        ]}
      />
      <WarningCard />
      <AdminDatabaseStudio />
    </div>
  );
}

export default withAdmin(AdminDatabasePage);
