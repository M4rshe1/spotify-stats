import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getMasterDataQueue } from "@/server/queues/master-data";
import { getSettings, setSettings } from "@/lib/settings";
import { createTRPCRouter, adminProcedure } from "../trpc";

export const adminRouter = createTRPCRouter({
  getSettings: adminProcedure.query(async () => {
    return await getSettings();
  }),

  setSettings: adminProcedure
    .input(
      z.object({
        settings: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      await setSettings(input.settings);
    }),

  getMasterDataStats: adminProcedure.query(async ({ ctx }) => {
    const [
      artists,
      genres,
      albums,
      tracks,
      playlists,
      artistGenres,
      albumArtists,
      artistTracks,
    ] = await Promise.all([
      ctx.db.artist.count(),
      ctx.db.genre.count(),
      ctx.db.album.count(),
      ctx.db.track.count(),
      ctx.db.playlist.count(),
      ctx.db.artistGenres.count(),
      ctx.db.albumArtists.count(),
      ctx.db.artistTrack.count(),
    ]);

    return {
      artists,
      genres,
      albums,
      tracks,
      playlists,
      relations: {
        artistGenres,
        albumArtists,
        artistTracks,
      },
    };
  }),

  enqueueMasterDataRefetch: adminProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const account = await ctx.db.account.findFirst({
      where: { userId, providerId: "spotify" },
    });
    if (!account?.refreshToken && !account?.accessToken) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Your account has no linked Spotify credentials. Connect Spotify, then retry.",
      });
    }

    const queue = getMasterDataQueue();
    const job = await queue.add(
      "refetch",
      { spotifyUserId: userId },
      { attempts: 1, removeOnComplete: 100, removeOnFail: 500 },
    );

    return { jobId: job.id! };
  }),
});
