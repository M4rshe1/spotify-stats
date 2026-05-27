"use client";

import { FirstLastTrackRow } from "@/components/first-last-item";
import { NoDataCard } from "@/components/cards/no-data-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { usePlayTrack } from "@/lib/play";
import { api } from "@/trpc/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCcwIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function DiscoveredYearAgo() {
  const [yearsAgo, setYearsAgo] = useState<number>(1);
  const { data, isLoading } =
    api.dashboard.getDiscoveredOnThisDayLastYear.useQuery({
      limit: 20,
      yearsAgo,
    });
  const { playTrack } = usePlayTrack();

  function handlePreviousYear() {
    setYearsAgo((prev) => prev + 1);
  }

  function handleNextYear() {
    setYearsAgo((prev) => Math.max(1, prev - 1));
  }

  if (isLoading) {
    return <Loading />;
  }

  const title = `Discovered today ${yearsAgo} ${yearsAgo === 1 ? "year" : "years"} ago`;
  const description = `Tracks you listened to for the first time on ${data?.anniversaryDate}.`;

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePreviousYear}>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={yearsAgo == 1}
          onClick={() => setYearsAgo(1)}
        >
          <RefreshCcwIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={yearsAgo == 1}
          onClick={handleNextYear}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
      {data?.items.length ? (
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
                  onPlay={playTrack}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <NoDataCard
          title={title}
          className=""
          icon={<SparklesIcon />}
          emptyTitle="No discoveries that day"
          description={description}
        />
      )}
    </div>
  );
}
