import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type LoadingProps = {
  label?: string;
  className?: string;
};

export function Loading({ label = "Loading...", className }: LoadingProps) {
  return (
    <Card className={cn("h-full min-h-0", className)}>
      <CardContent className="text-muted-foreground flex h-full min-h-32 items-center justify-center gap-2 py-6 text-sm">
        <Spinner className="size-4" />
        <span>{label}</span>
      </CardContent>
    </Card>
  );
}
