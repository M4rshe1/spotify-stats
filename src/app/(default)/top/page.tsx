import Link from "next/link";
import {
  ChevronRight,
  Disc3,
  Music2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { withAuth } from "@/lib/hoc-pages";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const topSections: {
  href: string;
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
}[] = [
  {
    href: "/top/tracks",
    title: "Tracks",
    icon: Music2,
    iconClassName: "text-sky-600 dark:text-sky-400",
  },
  {
    href: "/top/artists",
    title: "Artists",
    icon: Users,
    iconClassName: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/top/albums",
    title: "Albums",
    icon: Disc3,
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
];

export default withAuth(async () => {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight">Top</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {topSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group focus-visible:ring-ring focus-visible:ring-offset-background block focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Card
              size="sm"
              className="hover:bg-muted/40 h-full transition-colors"
            >
              <CardContent className="flex items-center gap-3 pt-3 pb-3">
                <div
                  className={cn(
                    "bg-muted/80 ring-foreground/10 flex size-11 shrink-0 items-center justify-center ring-1",
                    section.iconClassName,
                  )}
                >
                  <section.icon className="size-5" strokeWidth={1.75} />
                </div>
                <span className="font-heading min-w-0 flex-1 text-sm font-medium">
                  {section.title}
                </span>
                <ChevronRight
                  className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
});
