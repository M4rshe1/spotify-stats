import getSpotifyApi from "@/server/spotify";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { retrySpotifyCall } from "@/lib/spotify";

export const controlRouter = createTRPCRouter({
  play: protectedProcedure
    .input(
      z.object({
        trackId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const track = await ctx.db.track.findUnique({
        where: {
          id: input.trackId,
        },
      });
      if (!track) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      }
      const spotify = getSpotifyApi(ctx.session.user.id);
      const result = await retrySpotifyCall(
        () => spotify.player.addItemToPlaybackQueue(track.uri),
        "player.addItemToPlaybackQueue",
      );
      console.log(result);
      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to play track",
        });
      }
      const playbackState = await retrySpotifyCall(
        () => spotify.player.getPlaybackState(),
        "player.getPlaybackState",
      );
      if (playbackState.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get playback state",
        });
      }

      const nextTrack = await retrySpotifyCall(
        () => spotify.player.skipToNext(playbackState.data?.device?.id ?? ""),
        "player.skipToNext",
      );
      if (nextTrack.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get next track",
        });
      }
      return { success: true, message: "Track played" };
    }),
});
