import getSpotifyApi from "@/server/spotify";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import z from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "generated/prisma";

const trackForPlayInclude = {
  artists: {
    where: { role: "primary" },
    include: { artist: true },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.TrackInclude;

type TrackForPlay = Prisma.TrackGetPayload<{
  include: typeof trackForPlayInclude;
}>;

function toPlayedTrack(track: TrackForPlay) {
  return {
    id: track.id,
    name: track.name,
    image: track.image,
    artists: track.artists.map(({ artist }) => ({
      name: artist.name,
    })),
  };
}

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
        where: { id: input.trackId },
        include: trackForPlayInclude,
      });
      if (!track) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      }
      const spotify = getSpotifyApi(ctx.session.user.id);
      await spotify.player.addItemToPlaybackQueue(track.uri);
      if (!input.noSkip) {
        await spotify.player.skipToNext();
      }
      return {
        queued: input.noSkip,
        track: toPlayedTrack(track),
      };
    }),

  skipToNext: protectedProcedure.mutation(async ({ ctx }) => {
    const spotify = getSpotifyApi(ctx.session.user.id);
    await spotify.player.skipToNext();
  }),
});
