import {
  createAlbums,
  createArtists,
  createPlaybacks,
  createPlaylists,
  createTracks,
  getIdFromUri,
} from "worker/lib/create";
import { logger } from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import { db } from "@/server/db";
import getSpotifyApi from "@/server/spotify";
import { getQueueManager } from "./queue";

function enqueueTrackDependencies(track: {
  id: string;
  artists: { id: string }[];
  album: { id: string; artists: { id: string }[]; genres?: string[] };
}) {
  const queues = getQueueManager();
  track.artists.forEach((artist) => queues.artists.add(artist.id));
  track.album.artists.forEach((artist) => queues.artists.add(artist.id));
  track.album.genres?.forEach((genre) => queues.genres.add(genre));
  queues.albums.add(track.album.id);
  queues.tracks.add(track.id);
}

export async function fetchPlaybacks() {
  logger.info("Fetching playback stats");
  const queues = getQueueManager();
  queues.clear();
  const users = await tryCatch(
    db.user.findMany({
      where: {
        banned: false,
      },
      include: {
        playbacks: {
          take: 1,
          orderBy: {
            playedAt: "desc",
          },
        },
      },
    }),
  );
  if (users.error) {
    logger.error(users.error);
    return;
  }
  logger.info(
    {
      count: users.data.length,
    },
    "Found users",
  );
  for (const user of users.data) {
    const lastPlayedAtMs = user.playbacks[0]?.playedAt?.getTime() ?? 0;
    const spotify = getSpotifyApi(user.id);
    const recentlyPlayed = await spotify.player.getRecentlyPlayedTracks(50);
    if (!recentlyPlayed) {
      logger.error("Recently played tracks not found");
      continue;
    }

    const filteredPlaybacks = recentlyPlayed.items.filter(
      (playback) => Date.parse(playback.played_at) > lastPlayedAtMs,
    );
    logger.info(
      {
        count: filteredPlaybacks.length,
      },
      "Found filtered playbacks",
    );
    filteredPlaybacks.forEach((playback) => {
      enqueueTrackDependencies(playback.track);
      if (playback.context?.uri?.startsWith("spotify:playlist:")) {
        const playlistId = getIdFromUri(playback.context.uri);
        if (playlistId) {
          queues.playlists.add(playlistId);
        }
      }
    });
    const state = await tryCatch(spotify.player.getPlaybackState());
    if (state.error) {
      logger.error("Playback state not found");
      continue;
    }
    if (state.data.context?.uri?.startsWith("spotify:playlist:")) {
      const playlistId = getIdFromUri(state.data.context.uri);
      if (playlistId) {
        queues.playlists.add(playlistId);
      }
    }
    await createArtists(spotify);
    await createAlbums(spotify);
    await createTracks(spotify);
    const favoritePlaylist = await createPlaylists(spotify);
    await createPlaybacks(
      user.id,
      filteredPlaybacks,
      state.data,
      favoritePlaylist,
    );
  }
  logger.info("Playback stats fetched");
}
