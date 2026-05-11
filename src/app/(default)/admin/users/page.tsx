import type { Metadata } from "next";

import { AdminUsersPageClient } from "./_components/admin-users-page";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAdmin } from "@/lib/hoc-pages";

export const metadata: Metadata = {
  title: "Users",
  description: "View and manage registered users and their roles.",
};

async function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
        ]}
      />
      <AdminUsersPageClient />
    </div>
  );
}

export default withAdmin(AdminUsersPage);
