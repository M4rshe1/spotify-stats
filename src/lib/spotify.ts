import { logger } from "./logger";
import { tryCatch } from "./try-catch";
import { db } from "@/server/db";
import type {
  Artist,
  PlaybackState,
  PlayHistory,
  SpotifyApi,
} from "@spotify/web-api-ts-sdk";

type HistoryItem = {
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
  public fromQueue(queue: keyof typeof creationQueues): string[][] {
    return batch(Array.from(creationQueues[queue]), this.batchSize);
  }
  public fromSet(set: Set<string>): string[][] {
    return batch(Array.from(set), this.batchSize);
  }
  public fromArray<T>(array: T[]): T[][] {
    return batch(array, this.batchSize);
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
  creationQueues.genres.clear();
  creationQueues.artists.clear();
  creationQueues.albums.clear();
  creationQueues.tracks.clear();
  createdEntities.genres.clear();
  createdEntities.artists.clear();
  createdEntities.albums.clear();
  createdEntities.tracks.clear();
}

export function batch<T>(array: T[], batchSize: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += batchSize) {
    result.push(array.slice(i, i + batchSize) as T[]);
  }
  return result as T[][];
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
  const existingGenres = await tryCatch(
    db.genre.findMany({
      where: { name: { in: Array.from(creationQueues.genres) } },
    }),
  );
  if (existingGenres.error) {
    logger.error(existingGenres.error);
    return;
  }
  if (existingGenres.data.length === creationQueues.genres.size) {
    return;
  }

  existingGenres.data.forEach((genre) => {
    createEntity("genres", genre.name);
  });

  const newGenres = Array.from(creationQueues.genres);
  const createdGenres = await tryCatch(
    db.genre.createManyAndReturn({
      data: newGenres.map((genre) => ({ name: genre })),
    }),
  );
  if (createdGenres.error) {
    logger.error(createdGenres.error);
    return;
  }
  createdGenres.data.forEach((genre) => {
    createEntity("genres", genre.name);
  });
}

export async function createArtists(spotify: SpotifyApi) {
  const existingArtist = await tryCatch(
    db.artist.findMany({
      where: { spotifyId: { in: Array.from(creationQueues.artists) } },
    }),
  );
  if (existingArtist.error) {
    logger.error(existingArtist.error);
    return;
  }
  if (existingArtist.data.length === creationQueues.artists.size) {
    return;
  }
  existingArtist.data.forEach((artist) => {
    createEntity("artists", artist.spotifyId);
  });
  const batches = new Batches().fromQueue("artists");
  const newArtists: Artist[] = [];
  for (const batchIds of batches) {
    const { error, data: artistsData } = await retrySpotifyCall(
      () => spotify.artists.get(Array.from(batchIds) as string[]),
      "artists.get",
    );
    if (error || !artistsData) {
      logger.error(error);
      return;
    }
    artistsData.forEach((artist: Artist) => {
      artist.genres?.forEach((genre) => {
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
              create: artist.genres.map((genre) => ({
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
  const existingAlbums = await tryCatch(
    db.album.findMany({
      where: { spotifyId: { in: Array.from(creationQueues.albums) } },
    }),
  );
  if (existingAlbums.error) {
    logger.error(existingAlbums.error);
    return;
  }
  if (existingAlbums.data.length === creationQueues.albums.size) {
    return;
  }
  existingAlbums.data.forEach((album) => {
    createEntity("albums", album.spotifyId);
  });
  const batches = new Batches().fromQueue("albums");
  for (const batchIds of batches) {
    const { error, data: albumsData } = await retrySpotifyCall(
      () => spotify.albums.get(Array.from(batchIds) as string[]),
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
  const existingTracks = await tryCatch(
    db.track.findMany({
      where: { spotifyId: { in: Array.from(creationQueues.tracks) } },
    }),
  );
  if (existingTracks.error) {
    logger.error(existingTracks.error);
    return;
  }
  if (existingTracks.data.length === creationQueues.tracks.size) {
    return;
  }
  existingTracks.data.forEach((track) => {
    createEntity("tracks", track.spotifyId);
  });
  const batches = new Batches().fromQueue("tracks");
  for (const batchIds of batches) {
    const { error, data: tracksData } = await retrySpotifyCall(
      () => spotify.tracks.get(Array.from(batchIds) as string[]),
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
    const createdPlayback = await tryCatch(
      db.playback.create({
        data: {
          user: {
            connect: { id: userId },
          },
          track: { connect: { spotifyId: playback.track.id } },
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
  spotify: SpotifyApi,
  userId: string,
  importId: number,
  history: HistoryItem[],
) {
  const length = history.length;
  const batchSize = Math.ceil(length / 100);
  const batches = new Batches()
    .withSize(batchSize)
    .fromArray<HistoryItem>(history);
  const totalBatches = batches.length;
  let completedBatches = 0;
  for (const batch of batches) {
    completedBatches++;
    batch.forEach(async (item) => {
      const createdPlayback = await tryCatch(
        db.playback.create({
          data: {
            user: { connect: { id: userId } },
            track: {
              connect: {
                spotifyId: item.spotify_track_uri.split(":")[2] ?? "",
              },
            },
            duration: item.ms_played ?? 0,
            device: "Unknown",
            platform: item.platform,
            playedAt: new Date(item.ts),
          },
        }),
      );
      if (createdPlayback.error) {
        logger.error(createdPlayback.error);
        return;
      }
      tryCatch(
        db.import.update({
          where: { id: importId },
          data: {
            progress: completedBatches / totalBatches,
          },
        }),
      );
    });
  }
}
