"use client";

import { TotalTracks } from "@/components/cards/total-tracks";
import { TotalTime } from "@/components/cards/total-time";
import { DiffArtists } from "@/components/cards/diff-artists";
import type { Period } from "@/lib/consts/periods";

export default function KeyMetrics({ period }: { period: Period }) {
  return (
    <>
      <TotalTracks period={period} />
      <TotalTime period={period} />
      <DiffArtists period={period} />
    </>
  );
}
