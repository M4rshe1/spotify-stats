import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function NoDataCard({
  title,
  icon,
  emptyTitle,
  description,
  className,
}: {
  title: string;
  icon: ReactNode;
  emptyTitle: string;
  description: ReactNode;
  className?: string;
}) {
  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <Empty className={cn("min-h-0 flex-1", className)}>
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
