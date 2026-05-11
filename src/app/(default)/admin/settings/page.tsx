import type { Metadata } from "next";

import { AdminSettingsPageClient } from "./_components/admin-settings-page";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { withAdmin } from "@/lib/hoc-pages";

export const metadata: Metadata = {
  title: "Admin settings",
  description:
    "Configure registration, imports, and other site-wide options for this instance.",
};

async function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <PageBreadcrumbs
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Settings", href: "/admin/settings" },
        ]}
      />
      <AdminSettingsPageClient />
    </div>
  );
}

export default withAdmin(AdminSettingsPage);
