import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { adminSubNavItems } from "@/lib/consts/admin-nav";
import { withAdmin } from "@/lib/hoc-pages";

async function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumbs trail={[{ label: "Admin", href: "/admin" }]} />
      <h1 className="text-lg font-semibold tracking-tight">Admin</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {adminSubNavItems.map(
          ({ title, url, description, icon: Icon, iconClassName }) => (
            <Link
              key={url}
              href={url}
              className="group focus-visible:ring-ring focus-visible:ring-offset-background block focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Card
                size="sm"
                className="hover:bg-muted/40 h-full transition-colors"
              >
                <CardContent className="flex flex-col gap-2 pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "bg-muted/80 ring-foreground/10 flex size-11 shrink-0 items-center justify-center ring-1",
                        iconClassName,
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-heading min-w-0 flex-1 text-sm font-medium">
                          {title}
                        </span>
                        <ChevronRight
                          className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs leading-snug">
                        {description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

export default withAdmin(AdminOverviewPage);
