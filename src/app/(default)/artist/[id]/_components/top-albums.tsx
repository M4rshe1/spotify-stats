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
import { Disc3Icon } from "lucide-react";

type SortBy = "count" | "duration";

function toListItem(album: {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
}): TopListItemData {
  return {
    id: album.id,
    title: album.name,
    image: album.image,
    duration: album.duration,
    count: album.count,
  };
}

const TopAlbums = ({ id }: { id: number }) => {
  const [sortBy, setSortBy] = useState<SortBy>("duration");
  const { selectedPeriod } = usePeriod();
  const periodInput = providerPeriodToQueryInput(selectedPeriod);

  const { data, isLoading: isLoadingTopAlbums } =
    api.artist.getTopAlbums.useQuery({
      id,
      sortBy,
      ...periodInput,
    });

  if (isLoadingTopAlbums) {
    return <Loading />;
  }

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalDuration = data?.totalDuration ?? 0;

  if (!items.length) {
    return (
      <NoDataCard
        title="Top albums"
        icon={<Disc3Icon />}
        emptyTitle="No albums found"
        description="We couldn't find any albums for this artist in the selected period."
      />
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top albums</CardTitle>
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
        {items.map((album, index) => {
          const item = toListItem(album);
          const countPercentage =
            totalCount > 0 ? (item.count / totalCount) * 100 : 0;
          const durationPercentage =
            totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0;
          return (
            <TopListItem
              key={item.id}
              rank={index + 1}
              type="albums"
              item={item}
              countPercentage={countPercentage}
              durationPercentage={durationPercentage}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TopAlbums;
