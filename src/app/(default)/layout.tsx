import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { BreadcrumbProvider } from "@/providers/breadcrumb-provider";
import { PeriodProvider } from "@/providers/period-provider";
import Header from "@/components/header";
import { getLatestRelease } from "@/lib/github-release";
import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, initialPreferredPeriod, latestRelease] = await Promise.all([
    getSession().catch(() => null),
    api.user.getPreferredPeriod().catch(() => null),
    getLatestRelease().catch(() => null),
  ]);
  if (!session || !initialPreferredPeriod || !latestRelease) {
    redirect("/auth/login");
  }
  return (
    <SidebarProvider>
      <PeriodProvider initialPreferredSnapshot={initialPreferredPeriod}>
        <AppSidebar
          user={session?.user ?? null}
          latestRelease={latestRelease}
        />
        <SidebarInset>
          <BreadcrumbProvider>
            <Header />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              {children}
            </div>
          </BreadcrumbProvider>
        </SidebarInset>
      </PeriodProvider>
    </SidebarProvider>
  );
}
