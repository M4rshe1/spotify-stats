import type { SpotifyApi } from "@spotify/web-api-ts-sdk";

import { logger } from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import {
  addToCreationQueues,
  Batches,
  cleanQueues,
  createAlbums,
  createArtists,
  createGenres,
  createTracks,
  retrySpotifyCall,
} from "@/lib/spotify";
import { db } from "@/server/db";

export async function hydrateCreationQueuesFromSpotifyTrackCatalog(
  spotify: SpotifyApi,
): Promise<void> {
  const batches = new Batches().fromQueue("tracks");
  for (const batch of batches) {
    const result = await retrySpotifyCall(
      () => spotify.tracks.get(batch),
      "tracks.get",
    );
    if (result.error || result.data === undefined) {
      logger.error(result.error);
      return;
    }
    const tracksData = result.data;
    for (const track of tracksData) {
      addToCreationQueues("albums", track.album.id);
      track.artists.forEach((artist) => {
        addToCreationQueues("artists", artist.id);
      });
      track.album.artists.forEach((artist) => {
        addToCreationQueues("artists", artist.id);
      });
      track.album.genres?.forEach((genre) => {
        addToCreationQueues("genres", genre);
      });
    }
  }
}

export async function rebuildMasterDataQueuesFromExistingTracks(
  spotify: SpotifyApi,
): Promise<void> {
  cleanQueues();

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
    addToCreationQueues("tracks", row.spotifyId);
  }

  await hydrateCreationQueuesFromSpotifyTrackCatalog(spotify);
}

/** After {@link rebuildMasterDataQueuesFromExistingTracks}, persist missing genres, artists, albums, and tracks. */
export async function createQueuedMasterDataFromSpotify(
  spotify: SpotifyApi,
): Promise<void> {
  await createGenres();
  await createArtists(spotify);
  await createAlbums(spotify);
  await createTracks(spotify);
}
