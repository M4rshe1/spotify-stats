import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getMasterDataQueue } from "@/server/queues/master-data";
import { getSettings, setSettings } from "@/lib/settings";
import { createTRPCRouter, adminProcedure } from "../trpc";
import getSpotifyApi from "@/server/spotify";
import {
  createTracks,
  createArtists,
  createAlbums,
  createPlaylists,
} from "worker/lib/create";
import { tryCatch } from "@/lib/try-catch";
import { getQueueManager } from "worker/lib/queue";

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
      ctx.db.artistGenre.count(),
      ctx.db.albumArtist.count(),
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
  refreshMasterData: adminProcedure
    .input(
      z.object({
        id: z.number(),
        type: z.enum(["artist", "album", "track", "playlist"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, type } = input;

      const spotify = getSpotifyApi(ctx.session.user.id);
      const queues = getQueueManager();
      if (type === "artist") {
        const result = await tryCatch(
          ctx.db.artist.findFirst({ where: { id } }),
        );
        result.data ? queues.artists.add(result.data.spotifyId) : null;
      } else if (type === "album") {
        const result = await tryCatch(
          ctx.db.album.findFirst({ where: { id } }),
        );
        result.data ? queues.albums.add(result.data.spotifyId) : null;
      } else if (type === "track") {
        const result = await tryCatch(
          ctx.db.track.findFirst({ where: { id } }),
        );
        result.data ? queues.tracks.add(result.data.spotifyId) : null;
      } else if (type === "playlist") {
        const result = await tryCatch(
          ctx.db.playlist.findFirst({ where: { id } }),
        );
        result.data ? queues.playlists.add(result.data.spotifyId) : null;
      }
      await createArtists(spotify, true);
      await createAlbums(spotify, true);
      await createTracks(spotify, true);
      await createPlaylists(spotify, true);
      return { success: true };
    }),
});
