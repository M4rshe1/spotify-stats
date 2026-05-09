"use client";

import { format, isSameDay } from "date-fns";
import Link from "next/link";
import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";

/** Shape shared by artist / album / track first-last queries. */
export type FirstLastTrackPlaybackRow = {
  playedAt: Date | string | null;
  trackId: number | null;
  trackName: string | null;
  trackImage: string | null;
};

function formatListenedMeta(kind: "first" | "last", playedAt: Date) {
  const prefix = kind === "first" ? "First listened on" : "Last listened on";
  const today = new Date();
  if (isSameDay(playedAt, today)) {
    return `${prefix} ${format(playedAt, "HH:mm")}`;
  }
  return `${prefix} ${format(playedAt, "dd/MM/yyyy, HH:mm")}`;
}

export function FirstLastTrackRow({
  kind,
  row,
}: {
  kind: "first" | "last";
  row: FirstLastTrackPlaybackRow;
}) {
  const playedAt = row.playedAt ? new Date(row.playedAt) : null;
  const trackId = row.trackId;
  const title = row.trackName ?? "Unknown track";
  const image = row.trackImage;

  if (trackId == null || playedAt == null || Number.isNaN(playedAt.getTime())) {
    return null;
  }

  const href = `/track/${trackId}`;
  const meta = formatListenedMeta(kind, playedAt);

  return (
    <div className="relative isolate w-full overflow-hidden rounded-md border bg-muted/30">
      <CoverTintBackdrop coverUrl={image} className="rounded-md" />
      <div className="relative z-10 flex items-center gap-4 p-3">
        <Link href={href} className="block shrink-0">
          {image ? (
            <img
              src={image}
              alt={title}
              className="size-12 rounded-sm object-cover"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-sm text-[10px]">
              No img
            </div>
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <Link
            href={href}
            className="truncate text-sm font-semibold underline-offset-2 hover:underline"
          >
            {title}
          </Link>
          <p className="text-muted-foreground truncate text-xs">{meta}</p>
        </div>
      </div>
    </div>
  );
}
