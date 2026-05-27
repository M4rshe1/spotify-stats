"use client";

import type { MouseEvent } from "react";
import { toast } from "sonner";

import {
  dismissPlayTrackToast,
  showPlayTrackToast,
} from "@/components/play-track-toast";
import { api } from "@/trpc/react";

type PlayCallbacks = {
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export type PlayTrackHandler = (
  trackId: number,
  event: MouseEvent<HTMLButtonElement>,
) => void;

export function usePlayTrack() {
  const skipToNext = api.control.skipToNext.useMutation({
    onError: ({ message }) => {
      toast.error(message);
    },
  });

  const play = api.control.play.useMutation({
    onError: ({ message }) => {
      toast.error(message);
    },
  });

  function playTrack(
    trackId: number,
    event: MouseEvent<HTMLButtonElement>,
    callbacks?: PlayCallbacks,
  ) {
    play.mutate(
      { trackId, noSkip: event.shiftKey },
      {
        onSuccess: (data) => {
          if (callbacks?.onSuccess) {
            callbacks.onSuccess();
            return;
          }

          showPlayTrackToast(data.track, data.queued, {
            onPlayNow: data.queued
              ? () => {
                  skipToNext.mutate(undefined, {
                    onSuccess: () => {
                      dismissPlayTrackToast(data.track.id);
                      showPlayTrackToast(data.track, false);
                    },
                  });
                }
              : undefined,
          });
        },
        onError: ({ message }) => {
          if (callbacks?.onError) {
            callbacks.onError(message);
          }
        },
      },
    );
  }

  return { playTrack, play, skipToNext };
}
