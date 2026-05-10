import { logger } from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import { db } from "@/server/db";
import getSpotifyApi from "@/server/spotify";
import {
  createArtists,
  createAlbums,
  createTracks,
  createPlaybacks,
  addToCreationQueues,
  cleanQueues,
  retrySpotifyCall,
  createPlaylists,
  getIdFromUri,
} from "@/lib/spotify";

function enqueueTrackDependencies(track: {
  id: string;
  artists: { id: string }[];
  album: { id: string; artists: { id: string }[]; genres?: string[] };
}) {
  track.artists.forEach((artist) => addToCreationQueues("artists", artist.id));
  track.album.artists.forEach((artist) =>
    addToCreationQueues("artists", artist.id),
  );
  track.album.genres?.forEach((genre) => addToCreationQueues("genres", genre));
  addToCreationQueues("albums", track.album.id);
  addToCreationQueues("tracks", track.id);
}

async function fetchPlaybackStats() {
  logger.info("Fetching playback stats");
  cleanQueues();
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
    const recentlyPlayed = await retrySpotifyCall(
      () => spotify.player.getRecentlyPlayedTracks(50),
      "player.getRecentlyPlayedTracks",
    );

    if (recentlyPlayed.error || !recentlyPlayed.data) {
      logger.error(recentlyPlayed.error);
      continue;
    }

    const filteredPlaybacks = recentlyPlayed.data.items.filter(
      (playback) => Date.parse(playback.played_at) > lastPlayedAtMs,
    );
    logger.info(
      {
        count: filteredPlaybacks.length,
      },
      "Found filtered playbacks",
    );
    filteredPlaybacks.forEach((playback) =>
      enqueueTrackDependencies(playback.track),
    );
    const state = await retrySpotifyCall(
      () => spotify.player.getPlaybackState(),
      "player.getPlaybackState",
    );
    if (state.error || !state.data) {
      logger.error(state.error);
      continue;
    }
    if (state.data.context?.uri.startsWith("spotify:playlist:")) {
      addToCreationQueues(
        "playlists",
        getIdFromUri(state.data.context.uri) ?? "",
      );
    }
    await createArtists(spotify);
    await createAlbums(spotify);
    await createTracks(spotify);
    await createPlaylists(spotify);
    await createPlaybacks(user.id, filteredPlaybacks, state.data);
  }
  logger.info("Playback stats fetched");
}

setInterval(fetchPlaybackStats, 1000 * 60 * 5);
fetchPlaybackStats();
