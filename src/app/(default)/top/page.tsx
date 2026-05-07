import Link from "next/link";
import { withAuth } from "@/lib/hoc-pages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const topSections = [
  {
    href: "/top/tracks",
    title: "Top songs",
    description: "Most played songs with infinite scroll and quick play.",
  },
  {
    href: "/top/artists",
    title: "Top artists",
    description: "Artists ranked by play count or total listening time.",
  },
  {
    href: "/top/albums",
    title: "Top albums",
    description: "Albums ranked with count and duration percentages.",
  },
];

export default withAuth(async () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Top overview</h1>
        <p className="text-muted-foreground text-sm">
          Choose a ranking view to explore your top listening stats.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {topSections.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <Card className="hover:bg-muted/40 transition-colors">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm underline">Open</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
});
