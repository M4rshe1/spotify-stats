import getSpotifyApi from "@/server/spotify";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import z from "zod";
import { TRPCError } from "@trpc/server";

export const controlRouter = createTRPCRouter({
  play: protectedProcedure
    .input(
      z.object({
        trackId: z.number(),
        noSkip: z.boolean().optional().default(false),
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
      await spotify.player.addItemToPlaybackQueue(track.uri);
      if (!input.noSkip) {
        await spotify.player.skipToNext();
      }
      return { success: true, message: "Track played" };
    }),
});
