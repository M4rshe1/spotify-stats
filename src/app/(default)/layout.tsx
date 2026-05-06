import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PeriodProvider } from "@/providers/period-provider";
import Header from "@/components/header";
import { getSession } from "@/server/better-auth/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <SidebarProvider>
      <PeriodProvider>
        <AppSidebar user={session?.user ?? null} />
        <SidebarInset>
          <Header />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </PeriodProvider>
    </SidebarProvider>
  );
}
