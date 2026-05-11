"use client";

import { useState } from "react";

import { NoDataCard } from "@/components/cards/no-data-card";
import {
  TopListItem,
  type TopListItemData,
} from "@/components/top/top-list-item";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";
import { Music2Icon } from "lucide-react";
import { toast } from "sonner";

type SortBy = "count" | "duration";

function toListItem(track: {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
}): TopListItemData {
  return {
    id: track.id,
    title: track.name,
    image: track.image,
    duration: track.duration,
    count: track.count,
  };
}

const TopTracks = ({ id }: { id: number }) => {
  const [sortBy, setSortBy] = useState<SortBy>("duration");
  const { selectedPeriod } = usePeriod();
  const periodInput = providerPeriodToQueryInput(selectedPeriod);

  const { data, isLoading: isLoadingTopTracks } =
    api.playlist.getTopTracks.useQuery({
      id,
      sortBy,
      ...periodInput,
    });

  const { mutate: playTrack } = api.control.play.useMutation();

  if (isLoadingTopTracks) {
    return <Loading />;
  }

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalDuration = data?.totalDuration ?? 0;

  if (!items.length) {
    return (
      <NoDataCard
        title="Top tracks"
        icon={<Music2Icon />}
        emptyTitle="No tracks found"
        description="We couldn't find any tracks for this playlist in the selected period."
      />
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top tracks</CardTitle>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortBy)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="duration">Sort by duration</SelectItem>
            <SelectItem value="count">Sort by play count</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((track, index) => {
          const item = toListItem(track);
          const countPercentage =
            totalCount > 0 ? (item.count / totalCount) * 100 : 0;
          const durationPercentage =
            totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0;
          return (
            <TopListItem
              key={item.id}
              rank={index + 1}
              type="tracks"
              item={item}
              countPercentage={countPercentage}
              durationPercentage={durationPercentage}
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
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TopTracks;
