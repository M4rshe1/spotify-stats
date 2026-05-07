"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { usePeriod } from "@/providers/period-provider";
import { duration } from "@/lib/utils";
import { api } from "@/trpc/react";
import Link from "next/link";

function formatTrackDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LongestSessionPage() {
  const { selectedPeriod } = usePeriod();
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(
    null,
  );
  const { data: preferredPeriod } = api.user.getPreferredPeriod.useQuery();
  const from =
    selectedPeriod === "custom"
      ? (preferredPeriod?.customStart ?? undefined)
      : undefined;
  const to =
    selectedPeriod === "custom"
      ? (preferredPeriod?.customEnd ?? undefined)
      : undefined;

  const { data, isLoading, isError } =
    api.dashboard.getLongestSessions.useQuery({
      period: selectedPeriod,
      from,
      to,
    });
  const sessionTracksQuery = api.dashboard.getSessionTracks.useQuery(
    {
      period: selectedPeriod,
      from,
      to,
      sessionId: expandedSessionId ?? 1,
    },
    {
      enabled: expandedSessionId !== null,
    },
  );

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Longest sessions</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive text-sm">
          Failed to load longest sessions.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader className="px-3 pt-3 pb-2">
        <CardTitle>Longest sessions</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0 pb-3">
        {!data?.length ? (
          <p className="text-muted-foreground text-sm">
            No listening sessions found in this time range.
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((session, index) => (
              <button
                key={session.sessionId}
                type="button"
                onClick={() =>
                  setExpandedSessionId((prev) =>
                    prev === session.sessionId ? null : session.sessionId,
                  )
                }
                className="hover:bg-muted/30 w-full cursor-pointer rounded-md border px-2.5 py-2 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Session #{index + 1}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(session.startAt), "PPp")} -{" "}
                      {format(new Date(session.endAt), "PPp")}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-medium">
                      {duration(session.duration).toFormattedString(
                        "{h}h {m}m",
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {session.plays} plays, {session.uniqueTracks} tracks
                    </p>
                  </div>
                </div>
                {expandedSessionId === session.sessionId ? (
                  <div className="mt-2 border-t pt-2">
                    {sessionTracksQuery.isLoading ? (
                      <p className="text-muted-foreground text-xs">
                        Loading tracks...
                      </p>
                    ) : sessionTracksQuery.isError ? (
                      <p className="text-destructive text-xs">
                        Failed to load tracks for this session.
                      </p>
                    ) : !sessionTracksQuery.data?.length ? (
                      <p className="text-muted-foreground text-xs">
                        No tracks found for this session.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sessionTracksQuery.data.map((track, trackIndex) => (
                          <div
                            key={track.playbackId}
                            className="bg-muted/30 flex items-center gap-2 rounded-md px-2 py-1.5"
                          >
                            <span className="text-muted-foreground w-5 shrink-0 text-xs">
                              {trackIndex + 1}
                            </span>
                            {track.image ? (
                              <img
                                src={track.image}
                                alt={track.title}
                                className="h-9 w-9 rounded object-cover"
                              />
                            ) : (
                              <div className="bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded text-[10px]">
                                No img
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/track/${track.trackId}`}
                                className="cursor-pointer truncate text-sm font-medium underline-offset-2 hover:underline"
                              >
                                {track.title}
                              </Link>
                              <p className="text-muted-foreground truncate text-xs">
                                {track.artists.length
                                  ? track.artists.map((artist, artistIndex) => {
                                      const artistId =
                                        track.artistIds[artistIndex];
                                      return artistId ? (
                                        <span key={artistId}>
                                          {artistIndex > 0 ? ", " : ""}
                                          <Link
                                            href={`/artist/${artistId}`}
                                            className="cursor-pointer underline-offset-2 hover:underline"
                                          >
                                            {artist}
                                          </Link>
                                        </span>
                                      ) : (
                                        <span key={`${artist}-${artistIndex}`}>
                                          {artistIndex > 0 ? ", " : ""}
                                          {artist}
                                        </span>
                                      );
                                    })
                                  : "Unknown Artist"}
                              </p>
                            </div>
                            <div className="text-muted-foreground text-right text-xs">
                              <p>{format(new Date(track.playedAt), "HH:mm")}</p>
                              <p>{formatTrackDuration(track.duration)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
