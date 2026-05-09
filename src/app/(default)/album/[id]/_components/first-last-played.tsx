"use client";

import { NoDataCard } from "@/components/cards/no-data-card";
import { FirstLastTrackRow } from "@/components/first-last-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { api } from "@/trpc/react";
import { ClockIcon } from "lucide-react";

const FirstLastPlayed = ({ id }: { id: number }) => {
  const { data: firstLastPlayed, isLoading: isLoadingFirstLastPlayed } =
    api.album.firstLastPlayed.useQuery({ id });

  if (isLoadingFirstLastPlayed) {
    return <Loading />;
  }

  if (!firstLastPlayed) {
    return (
      <NoDataCard
        title="First and last listened"
        icon={<ClockIcon />}
        emptyTitle="No data"
        description="No playback history from this album yet."
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
        description="No playback history from this album yet."
      />
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>First and last time listened</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {hasFirst && firstLastPlayed.firstPlayed ? (
          <FirstLastTrackRow kind="first" row={firstLastPlayed.firstPlayed} />
        ) : null}
        {hasLast && firstLastPlayed.lastPlayed ? (
          <FirstLastTrackRow kind="last" row={firstLastPlayed.lastPlayed} />
        ) : null}
      </CardContent>
    </Card>
  );
};

export default FirstLastPlayed;
