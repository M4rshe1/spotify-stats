import type { SpotifyApi } from "@/server/spotify";

import { logger } from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import {
  createAlbums,
  createArtists,
  createGenres,
  createTracks,
} from "worker/lib/create";
import { db } from "@/server/db";
import { getQueueManager } from "./queue";

export async function hydrateCreationQueuesFromSpotifyTrackCatalog(
  spotify: SpotifyApi,
): Promise<void> {
  const queues = getQueueManager();
  for (const id of queues.tracks.toArray()) {
    const trackData = await tryCatch(spotify.tracks.get(id));
    if (trackData.error) {
      logger.error("Track not found");
      return;
    }
    const track = trackData.data;

    queues.albums.add(track.album.id);
    track.artists.forEach((artist) => {
      queues.artists.add(artist.id);
    });
    track.album.artists.forEach((artist) => {
      queues.artists.add(artist.id);
    });
    track.album.genres?.forEach((genre) => {
      queues.genres.add(genre);
    });
  }
}

export async function rebuildMasterDataQueuesFromExistingTracks(
  spotify: SpotifyApi,
): Promise<void> {
  const queues = getQueueManager();
  queues.clear();

  const rows = await tryCatch(
    db.track.findMany({
      select: { spotifyId: true },
      distinct: ["spotifyId"],
    }),
  );
  if (rows.error) {
    logger.error(rows.error);
    throw rows.error;
  }

  for (const row of rows.data) {
    queues.tracks.add(row.spotifyId);
  }

  await hydrateCreationQueuesFromSpotifyTrackCatalog(spotify);
}

/** After {@link rebuildMasterDataQueuesFromExistingTracks}, persist missing genres, artists, albums, and tracks. */
export async function createQueuedMasterDataFromSpotify(
  spotify: SpotifyApi,
): Promise<void> {
  await createGenres();
  logger.info("Updated genres");
  await createArtists(spotify);
  logger.info("Updated artists");
  await createAlbums(spotify);
  logger.info("Updated albums");
  await createTracks(spotify);
  logger.info("Updated tracks");
}
