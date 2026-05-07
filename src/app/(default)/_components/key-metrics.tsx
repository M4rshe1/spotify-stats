"use client";

import { TotalTracks } from "@/components/cards/total-tracks";
import { TotalTime } from "@/components/cards/total-time";
import { DiffArtists } from "@/components/cards/diff-artists";
import type { ProviderPeriod } from "@/lib/consts/periods";

export default function KeyMetrics({ period }: { period: ProviderPeriod }) {
  return (
    <>
      <TotalTracks period={period} />
      <TotalTime period={period} />
      <DiffArtists period={period} />
    </>
  );
}
