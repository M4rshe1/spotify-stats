import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { BreadcrumbProvider } from "@/providers/breadcrumb-provider";
import { PeriodProvider } from "@/providers/period-provider";
import Header from "@/components/header";
import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const initialPreferredPeriod = await api.user.getPreferredPeriod();
  return (
    <SidebarProvider>
      <PeriodProvider initialPreferredSnapshot={initialPreferredPeriod}>
        <AppSidebar user={session?.user ?? null} />
        <SidebarInset>
          <BreadcrumbProvider>
            <Header />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
          </BreadcrumbProvider>
        </SidebarInset>
      </PeriodProvider>
    </SidebarProvider>
  );
}
