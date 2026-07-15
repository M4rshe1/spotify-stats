"use client";

import { NoDataCard } from "@/components/cards/no-data-card";
import { FirstLastTrackRow } from "@/components/first-last-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { periods } from "@/lib/consts/periods";
import { usePlayTrack } from "@/lib/play";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import { ClockIcon } from "lucide-react";

const FirstLastPlayed = ({
  id,
  period,
}: {
  id: number;
  period: ProviderPeriod;
}) => {
  const periodInput = providerPeriodToQueryInput(period);
  const { data: firstLastPlayed, isLoading: isLoadingFirstLastPlayed } =
    api.artist.firstLastPlayed.useQuery({ id, ...periodInput });
  const { playTrack } = usePlayTrack();
  const periodLabel = periods[period.type]?.label;

  if (isLoadingFirstLastPlayed) {
    return <Loading />;
  }

  if (!firstLastPlayed) {
    return (
      <NoDataCard
        title="First and last listened"
        icon={<ClockIcon />}
        emptyTitle="No data"
        description="No playback history for this artist in this period."
      />
    );
  }

  const hasFirst = Boolean(firstLastPlayed.firstPlayed?.trackId);
  const hasLast = Boolean(firstLastPlayed.lastPlayed?.trackId);

  if (!hasFirst && !hasLast) {
    return (
      <NoDataCard
        title="First and last listened"
        icon={<ClockIcon />}
        emptyTitle="No data"
        description="No playback history for this artist in this period."
      />
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>
          First and last time listened{" "}
          {periodLabel ? (
            <span className="text-muted-foreground text-sm">
              ({periodLabel})
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {hasFirst && firstLastPlayed.firstPlayed ? (
          <FirstLastTrackRow
            kind="first"
            row={firstLastPlayed.firstPlayed}
            onPlay={playTrack}
          />
        ) : null}
        {hasLast && firstLastPlayed.lastPlayed ? (
          <FirstLastTrackRow
            kind="last"
            row={firstLastPlayed.lastPlayed}
            onPlay={playTrack}
          />
        ) : null}
      </CardContent>
    </Card>
  );
};

export default FirstLastPlayed;
