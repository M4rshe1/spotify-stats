"use client";

import { useState } from "react";

import { NoDataCard } from "@/components/cards/no-data-card";
import { TopListItem } from "@/components/top/top-list-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Disc3Icon, UserIcon } from "lucide-react";

type SortBy = "count" | "duration";

const TopArtists = ({ id }: { id: number }) => {
  const [sortBy, setSortBy] = useState<SortBy>("duration");
  const { selectedPeriod } = usePeriod();
  const periodInput = providerPeriodToQueryInput(selectedPeriod);

  const { data, isLoading: isLoadingTopArtists } =
    api.genre.getTopArtists.useQuery({
      id,
      sortBy,
      ...periodInput,
    });

  if (isLoadingTopArtists) {
    return <Loading />;
  }
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalDuration = data?.totalDuration ?? 0;

  if (!items.length) {
    return (
      <NoDataCard
        title="Top artists"
        icon={<UserIcon />}
        emptyTitle="No artists found"
        description="We couldn't find any artists for this genre in the selected period."
      />
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top artists</CardTitle>
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
        {items.map((artist, index) => {
          const countPercentage =
            totalCount > 0 ? (artist.count / totalCount) * 100 : 0;
          const durationPercentage =
            totalDuration > 0 ? (artist.duration / totalDuration) * 100 : 0;
          return (
            <TopListItem
              key={artist.id}
              rank={index + 1}
              type="artists"
              item={artist}
              countPercentage={countPercentage}
              durationPercentage={durationPercentage}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TopArtists;
