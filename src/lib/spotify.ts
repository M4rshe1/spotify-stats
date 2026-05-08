import { logger } from "./logger";
import { tryCatch } from "./try-catch";
import { db } from "@/server/db";
import type {
  Artist,
  PlaybackState,
  PlayHistory,
  SpotifyApi,
} from "@spotify/web-api-ts-sdk";

export function getTrackIdFromUri(uri: string): string | null {
  if (typeof uri !== "string" || uri.length === 0) return null;
  const idPart = uri.split(":")[2];
  return idPart && idPart.length > 0 ? idPart : null;
}

export type HistoryItem = {
  ts: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  ip_addr: string;
  master_metadata_track_name: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name: string;
  spotify_track_uri: string;
  episode_name: string | null;
  episode_show_name: string | null;
  spotify_episode_uri: string | null;
  audiobook_title: string | null;
  audiobook_uri: string | null;
  audiobook_chapter_uri: string | null;
  audiobook_chapter_title: string | null;
  reason_start: string;
  reason_end: string;
  shuffle: boolean;
  skipped: boolean;
  offline: boolean;
  offline_timestamp: number;
  incognito_mode: boolean;
};

export class Batches {
  private batchSize: number = 20;
  public withSize(size: number): this {
    this.batchSize = size;
    return this;
  }
  public batch<T>(array: T[], batchSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      result.push(array.slice(i, i + batchSize));
    }
    return result;
  }

  public fromQueue(queue: keyof typeof creationQueues): string[][] {
    return this.batch(Array.from(creationQueues[queue]), this.batchSize);
  }
  public fromSet(set: Set<string>): string[][] {
    return this.batch(Array.from(set), this.batchSize);
  }
  public fromArray<T>(array: T[]): T[][] {
    return this.batch(array, this.batchSize);
  }
}

const SPOTIFY_RETRY_LIMIT = 5;
const SPOTIFY_RETRY_DELAY_MS = 2000;

const creationQueues = {
  genres: new Set<string>(),
  artists: new Set<string>(),
  albums: new Set<string>(),
  tracks: new Set<string>(),
};
const createdEntities = {
  genres: new Set<string>(),
  artists: new Set<string>(),
  albums: new Set<string>(),
  tracks: new Set<string>(),
};

export function getQueueSize(entity: keyof typeof creationQueues) {
  return creationQueues[entity].size;
}
export function getCreatedEntitySize(entity: keyof typeof createdEntities) {
  return createdEntities[entity].size;
}

export function addToCreationQueues(
  entity: keyof typeof creationQueues,
  id: string,
) {
  if (!createdEntities[entity].has(id)) {
    creationQueues[entity].add(id);
  }
}

export function createEntity(entity: keyof typeof createdEntities, id: string) {
  creationQueues[entity].delete(id);
  createdEntities[entity].add(id);
}

export function cleanQueues() {
  for (const key of Object.keys(creationQueues) as Array<
    keyof typeof creationQueues
  >) {
    creationQueues[key].clear();
  }
  for (const key of Object.keys(createdEntities) as Array<
    keyof typeof createdEntities
  >) {
    createdEntities[key].clear();
  }
}

export async function retrySpotifyCall<T>(
  fn: () => Promise<T>,
  operationName: string,
): Promise<{ error?: any; data?: T }> {
  let attempts = 0;
  let waitTime = SPOTIFY_RETRY_DELAY_MS;
  while (attempts < SPOTIFY_RETRY_LIMIT) {
    try {
      const res = await fn();
      return { data: res };
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status === 429) {
        const retryAfter =
          typeof err?.response?.headers?.get === "function"
            ? parseInt(err.response.headers.get("Retry-After") || "0", 10)
            : 0;
        const effectiveWait = retryAfter ? retryAfter * 1000 : waitTime;
        logger.warn(
          { operation: operationName, attempts, wait: effectiveWait },
          `Spotify API rate limit hit for ${operationName}. Retrying in ${effectiveWait} ms`,
        );
        await new Promise((res) => setTimeout(res, effectiveWait));
        attempts++;
        waitTime *= 2;
      } else {
        logger.error(
          { operation: operationName, error: err },
          `Spotify API error in ${operationName}`,
        );
        return { error: err };
      }
    }
  }
  const errorMsg = `Exceeded retry limit for Spotify API in ${operationName}`;
  logger.error({ operation: operationName }, errorMsg);
  return { error: new Error(errorMsg) };
}

export async function createGenres() {
  const genreNames = Array.from(creationQueues.genres);
  if (genreNames.length === 0) return;

  const existingGenres = await tryCatch(
    db.genre.findMany({
      where: { name: { in: genreNames } },
    }),
  );
  if (existingGenres.error) {
    logger.error(existingGenres.error);
    return;
  }
  for (const genre of existingGenres.data) {
    createEntity("genres", genre.name);
  }

  const uncreatedGenres = genreNames.filter(
    (name) => !createdEntities.genres.has(name),
  );
  if (uncreatedGenres.length === 0) return;

  const createdGenres = await tryCatch(
    db.genre.createManyAndReturn({
      data: uncreatedGenres.map((genre) => ({ name: genre })),
    }),
  );
  if (createdGenres.error) {
    logger.error(createdGenres.error);
    return;
  }
  for (const genre of createdGenres.data) {
    createEntity("genres", genre.name);
  }
}

export async function createArtists(spotify: SpotifyApi) {
  const artistIds = Array.from(creationQueues.artists);
  if (artistIds.length === 0) return;

  const existingArtist = await tryCatch(
    db.artist.findMany({
      where: { spotifyId: { in: artistIds } },
    }),
  );
  if (existingArtist.error) {
    logger.error(existingArtist.error);
    return;
  }
  for (const artist of existingArtist.data) {
    createEntity("artists", artist.spotifyId);
  }
  const remainingIds = artistIds.filter(
    (id) => !createdEntities.artists.has(id),
  );
  if (remainingIds.length === 0) return;

  const batches = new Batches().withSize(20).fromArray(remainingIds);
  const newArtists: Artist[] = [];
  for (const batchIds of batches) {
    const { error, data: artistsData } = await retrySpotifyCall(
      () => spotify.artists.get(batchIds),
      "artists.get",
    );
    if (error || !artistsData) {
      logger.error(error);
      return;
    }
    artistsData.forEach((artist: Artist) => {
      (artist.genres || []).forEach((genre) => {
        addToCreationQueues("genres", genre);
      });
      newArtists.push(artist);
    });
  }
  await createGenres();

  const results = await Promise.all(
    newArtists.map((artist) => {
      return tryCatch(
        db.artist.create({
          data: {
            spotifyId: artist.id,
            name: artist.name,
            image: artist.images[0]?.url,
            genres: {
              create: (artist.genres || []).map((genre) => ({
                genre: { connect: { name: genre } },
              })),
            },
          },
        }),
      );
    }),
  );
  for (const result of results) {
    if (result.error) {
      logger.error(result.error);
      return;
    }
    createEntity("artists", result.data.spotifyId);
  }
}

export async function createAlbums(spotify: SpotifyApi) {
  const albumIds = Array.from(creationQueues.albums);
  if (albumIds.length === 0) return;

  const existingAlbums = await tryCatch(
    db.album.findMany({
      where: { spotifyId: { in: albumIds } },
    }),
  );
  if (existingAlbums.error) {
    logger.error(existingAlbums.error);
    return;
  }
  for (const album of existingAlbums.data) {
    createEntity("albums", album.spotifyId);
  }
  const remainingIds = albumIds.filter((id) => !createdEntities.albums.has(id));
  if (remainingIds.length === 0) return;

  const batches = new Batches().withSize(20).fromArray(remainingIds);
  for (const batchIds of batches) {
    const { error, data: albumsData } = await retrySpotifyCall(
      () => spotify.albums.get(batchIds),
      "albums.get",
    );
    if (error) {
      logger.error(error);
      return;
    }
    for (const album of albumsData ?? []) {
      const createdAlbum = await tryCatch(
        db.album.create({
          data: {
            spotifyId: album.id,
            name: album.name,
            image: album.images[0]?.url,
            artists: {
              create: album.artists.map((artist) => ({
                artist: { connect: { spotifyId: artist.id } },
                role: "primary",
              })),
            },
          },
        }),
      );
      if (createdAlbum.error) {
        logger.error(createdAlbum.error);
        return;
      }
      createEntity("albums", album.id);
    }
  }
}

export async function createTracks(spotify: SpotifyApi) {
  const trackIds = Array.from(creationQueues.tracks);
  if (trackIds.length === 0) return;

  const existingTracks = await tryCatch(
    db.track.findMany({
      where: { spotifyId: { in: trackIds } },
    }),
  );
  if (existingTracks.error) {
    logger.error(existingTracks.error);
    return;
  }
  for (const track of existingTracks.data) {
    createEntity("tracks", track.spotifyId);
  }
  const remainingIds = trackIds.filter((id) => !createdEntities.tracks.has(id));
  if (remainingIds.length === 0) return;

  const batches = new Batches().withSize(20).fromArray(remainingIds);
  for (const batchIds of batches) {
    const { error, data: tracksData } = await retrySpotifyCall(
      () => spotify.tracks.get(batchIds),
      "tracks.get",
    );
    if (error) {
      logger.error(error);
      return;
    }
    for (const track of tracksData ?? []) {
      const createdTrack = await tryCatch(
        db.track.create({
          data: {
            spotifyId: track.id,
            name: track.name,
            image: track.album.images[0]?.url,
            uri: track.uri,
            type: track.type,
            explicit: track.explicit,
            duration: track.duration_ms,
            disc_number: track.disc_number,
            track_number: track.track_number,
            is_local: track.is_local,
            href: track.href,
            album: { connect: { spotifyId: track.album.id } },
            artists: {
              create: track.artists.map((artist, index) => ({
                artist: { connect: { spotifyId: artist.id } },
                role: index === 0 ? "primary" : "featured",
              })),
            },
          },
        }),
      );
      if (createdTrack.error) {
        logger.error(createdTrack.error);
        return;
      }
      createEntity("tracks", track.id);
    }
  }
}

export async function createPlaybacks(
  userId: string,
  playbacks: PlayHistory[],
  state: PlaybackState,
) {
  for (const playback of playbacks) {
    const track = await tryCatch(
      db.track.findUnique({
        where: { spotifyId: playback.track.id },
        select: { id: true },
      }),
    );
    if (track.error) {
      logger.error(track.error);
      return;
    }
    if (!track.data) continue;

    const createdPlayback = await tryCatch(
      db.playback.upsert({
        where: {
          userId_playedAt: {
            userId,
            playedAt: new Date(playback.played_at),
          },
        },
        update: {
          duration: playback.track.duration_ms,
        },
        create: {
          user: {
            connect: { id: userId },
          },
          track: { connect: { id: track.data.id } },
          duration: playback.track.duration_ms,
          device: state.device?.name ?? "Unknown",
          platform: state.device?.type ?? "Unknown",
          playedAt: new Date(playback.played_at),
        },
      }),
    );
    if (createdPlayback.error) {
      logger.error(createdPlayback.error);
      return;
    }
  }
}

export async function createHistory(
  userId: string,
  importId: number,
  history: HistoryItem[],
) {
  const length = history.length;
  if (length === 0) {
    const updatedImport = await tryCatch(
      db.import.update({
        where: { id: importId },
        data: { progress: 1, entriesAdded: 0 },
      }),
    );
    if (updatedImport.error) {
      logger.error(updatedImport.error);
    }
    return;
  }
  const batchSize = Math.max(1, Math.ceil(length / 100));
  const batches = new Batches()
    .withSize(batchSize)
    .fromArray<HistoryItem>(history);

  let completedBatches = 0;
  let totalEntriesAdded = 0;
  const totalBatches = batches.length;

  for (const batch of batches) {
    const trackSpotifyIds = [
      ...new Set(
        batch
          .map((item) => getTrackIdFromUri(item.spotify_track_uri))
          .filter((trackId): trackId is string => !!trackId),
      ),
    ];
    const tracks = await tryCatch(
      db.track.findMany({
        where: { spotifyId: { in: trackSpotifyIds } },
        select: { id: true, spotifyId: true },
      }),
    );
    if (tracks.error) {
      logger.error("Error finding tracks");
      logger.debug(tracks.error);
      return;
    }
    const trackIdBySpotifyId = new Map(
      tracks.data.map((track) => [track.spotifyId, track.id]),
    );
    const playbackRows = batch.flatMap((item) => {
      const spotifyId = getTrackIdFromUri(item.spotify_track_uri);
      if (!spotifyId) return [];
      const trackId = trackIdBySpotifyId.get(spotifyId);
      if (!trackId) return [];
      return [
        {
          userId,
          duration: item.ms_played ?? 0,
          device: "Unknown",
          platform: item.platform,
          trackId,
          playedAt: item.ts,
        },
      ];
    });
    if (playbackRows.length > 0) {
      for (const playback of playbackRows) {
        const createdPlayback = await tryCatch(
          db.playback.upsert({
            where: {
              userId_playedAt: {
                userId,
                playedAt: playback.playedAt,
              },
            },
            create: playback,
            update: playback,
          }),
        );
        if (createdPlayback.error) {
          logger.error(createdPlayback.error);
        }
      }
      totalEntriesAdded += playbackRows.length;
    }
    completedBatches++;
    const updatedImport = await tryCatch(
      db.import.update({
        where: { id: importId },
        data: {
          progress: completedBatches / totalBatches,
          entriesAdded: totalEntriesAdded,
        },
      }),
    );
    if (updatedImport.error) {
      logger.error(updatedImport.error);
      return;
    }
  }
}
