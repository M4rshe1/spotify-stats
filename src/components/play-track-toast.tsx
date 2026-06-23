"use client";

import { ProxyImage } from "@/components/proxy-image";
import { toast } from "sonner";

export type PlayedTrackInfo = {
  id: number;
  name: string;
  image: string | null;
  artists: { name: string }[];
};

function playTrackToastId(trackId: number) {
  return `play-track-${trackId}`;
}

function formatArtistNames(artists: PlayedTrackInfo["artists"]) {
  return artists.map((artist) => artist.name).join(", ") || "Unknown artist";
}

function formatDescription(track: PlayedTrackInfo) {
  const artists = formatArtistNames(track.artists);
  return `${track.name} — ${artists}`;
}

function TrackCoverIcon({ image }: { image: string | null }) {
  return (
    <div className="bg-muted relative size-full shrink-0 overflow-hidden rounded-sm border border-border/60">
      <ProxyImage
        src={image}
        alt=""
        className="h-full w-full object-cover"
        fallback={
          <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
            ?
          </div>
        }
      />
    </div>
  );
}

type ShowPlayTrackToastOptions = {
  onPlayNow?: () => void;
};

export function showPlayTrackToast(
  track: PlayedTrackInfo,
  queued: boolean,
  options?: ShowPlayTrackToastOptions,
) {
  const id = playTrackToastId(track.id);
  const toastOptions = {
    id,
    className: "cn-toast-play-track",
    description: formatDescription(track),
    descriptionClassName: "line-clamp-2",
    icon: <TrackCoverIcon image={track.image} />,
    duration: queued ? 10_000 : 5000,
    action:
      queued && options?.onPlayNow
        ? {
            label: "Play now",
            onClick: options.onPlayNow,
          }
        : undefined,
  };

  if (queued) {
    toast.info("Added to queue", toastOptions);
  } else {
    toast.success("Now playing", toastOptions);
  }
}

export function dismissPlayTrackToast(trackId: number) {
  toast.dismiss(playTrackToastId(trackId));
}
