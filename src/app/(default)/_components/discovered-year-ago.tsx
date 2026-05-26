"use client";

import { FirstLastTrackRow } from "@/components/first-last-item";
import { NoDataCard } from "@/components/cards/no-data-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { api } from "@/trpc/react";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";

export default function DiscoveredYearAgo() {
  const { data, isLoading } =
    api.dashboard.getDiscoveredOnThisDayLastYear.useQuery({ limit: 20 });
  const { mutate: playTrack } = api.control.play.useMutation();

  if (isLoading) {
    return <Loading />;
  }

  const title = "Discovered today a year ago";
  const description = data?.anniversaryDate
    ? `Tracks you listened to for the first time on ${data.anniversaryDate}.`
    : "Tracks you listened to for the first time on this day one year ago.";

  if (!data?.items.length) {
    return (
      <NoDataCard
        title={title}
        className=""
        icon={<SparklesIcon />}
        emptyTitle="No discoveries that day"
        description={description}
      />
    );
  }

  return (
    <Card className="col-span-full h-full min-h-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardHeader>
      <CardContent className="max-h-96 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {data.items.map((row) => (
            <FirstLastTrackRow
              key={row.trackId ?? row.playedAt?.toString()}
              kind="first"
              row={row}
              onPlay={(trackId) =>
                playTrack(
                  { trackId },
                  {
                    onSuccess: () => toast.success("Track played"),
                    onError: () => toast.error("Failed to play track"),
                  },
                )
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
