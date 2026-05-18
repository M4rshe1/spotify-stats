import { logger } from "../../src/lib/logger";
import { platform } from "../../src/lib/platform";
import { tryCatch } from "../../src/lib/try-catch";
import { db } from "@/server/db";
import type { SpotifyApi } from "@/server/spotify";
import type {
  Artist,
  Context,
  PlaybackState,
  PlayHistory,
  Playlist,
} from "@/server/spotify/types";
import { Batches } from "./batches";
import { getQueueManager } from "./queue";

export function getIdFromUri(uri: string): string | null {
  if (typeof uri !== "string" || uri.length === 0) return null;
  const idPart = uri.split(":")[2];
  return idPart && idPart.length > 0 ? idPart : null;
}

function normalizeLabel(
  value: string | null | undefined,
  fallback = "Unknown",
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function resolvePlaybackContext(
  playbackContext: Context | null | undefined,
  favoritePlaylist?: Playlist | null,
) {
  let contextId = playbackContext?.uri
    ? getIdFromUri(playbackContext.uri)
    : null;

  const isFavorite = favoritePlaylist?.id === contextId;
  const context = isFavorite
    ? "collection"
    : normalizeLabel(playbackContext?.type);
  const contextUri = isFavorite
    ? `spotify:user:${favoritePlaylist.owner.id}:collection`
    : (playbackContext?.uri ?? null);
  if (isFavorite) {
    contextId = favoritePlaylist.owner.id;
  }

  return { context, contextUri, contextId };
}

function resolvePlaybackDevice(state: PlaybackState) {
  const deviceType = normalizeLabel(state.device?.type);
  return {
    device: normalizeLabel(state.device?.name),
    platform: deviceType,
    originalPlatform: deviceType,
  };
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

export async function createGenres(force: boolean = false) {
  const queue = getQueueManager().genres;
  if (queue.size() === 0) return;
  if (!force) {
    const existingGenres = await tryCatch(
      db.genre.findMany({
        where: { name: { in: queue.toArray() } },
      }),
    );
    if (existingGenres.error) {
      logger.error(existingGenres.error);
      return;
    }
    for (const genre of existingGenres.data) {
      queue.complete(genre.name);
    }
  }

  const results = await Promise.all(
    queue.toArray().map((name) =>
      tryCatch(
        db.genre.upsert({
          where: { name },
          create: { name },
          update: {},
        }),
      ),
    ),
  );
  for (const result of results) {
    if (result.error) {
      logger.error(result.error);
      continue;
    }
    queue.complete(result.data.name);
  }
}

export async function createArtists(
  spotify: SpotifyApi,
  force: boolean = false,
) {
  const queue = getQueueManager().artists;
  if (queue.size() === 0) return;
  if (!force) {
    const existingArtist = await tryCatch(
      db.artist.findMany({
        where: { spotifyId: { in: queue.toArray() } },
      }),
    );
    if (existingArtist.error) {
      logger.error(existingArtist.error);
      return;
    }
    for (const artist of existingArtist.data) {
      queue.complete(artist.spotifyId);
    }
  }

  const queues = getQueueManager();
  const batches = new Batches()
    .withSize(20)
    .fromArray(queues.artists.toArray());
  for (const batch of batches) {
    const newArtists: Artist[] = [];
    for (const id of batch) {
      const artistData = await tryCatch(spotify.artists.get(id));
      if (artistData.error) {
        logger.error(artistData.error);
        continue;
      }
      (artistData.data.genres || []).forEach((genre) => {
        queues.genres.add(genre);
      });
      newArtists.push(artistData.data);
    }
    await createGenres(force);

    const results = await Promise.all(
      newArtists.map((artist) =>
        tryCatch(
          db.artist.upsert({
            where: { spotifyId: artist.id },
            create: {
              spotifyId: artist.id,
              name: artist.name,
              image: artist.images[0]?.url,
              genres: {
                create: (artist.genres || []).map((genre) => ({
                  genre: { connect: { name: genre } },
                })),
              },
            },
            update: {
              name: artist.name,
              image: artist.images[0]?.url,
              genres: {
                deleteMany: {},
                create: (artist.genres || []).map((genre) => ({
                  genre: { connect: { name: genre } },
                })),
              },
            },
          }),
        ),
      ),
    );
    for (const result of results) {
      if (result.error) {
        logger.error(result.error);
        continue;
      }
      queue.complete(result.data.spotifyId);
    }
  }
}

export async function createAlbums(
  spotify: SpotifyApi,
  force: boolean = false,
) {
  const queue = getQueueManager().albums;
  if (queue.size() === 0) return;

  const existingAlbums = await tryCatch(
    db.album.findMany({
      where: { spotifyId: { in: queue.toArray() } },
    }),
  );
  if (existingAlbums.error) {
    logger.error(existingAlbums.error);
    return;
  }
  if (!force) {
    for (const album of existingAlbums.data) {
      queue.complete(album.spotifyId);
    }
  }

  for (const id of queue.toArray()) {
    const albumData = await tryCatch(spotify.albums.get(id));
    if (albumData.error) {
      logger.error("Album not found");
      continue;
    }
    const album = albumData.data;
    const upsertedAlbum = await tryCatch(
      db.album.upsert({
        where: { spotifyId: album.id },
        create: {
          spotifyId: album.id,
          name: album.name,
          releaseDate: album.release_date,
          releaseDatePrecision: album.release_date_precision,
          image: album.images[0]?.url,
          artists: {
            create: album.artists.map((artist) => ({
              artist: { connect: { spotifyId: artist.id } },
              role: "primary",
            })),
          },
        },
        update: {
          name: album.name,
          releaseDate: album.release_date,
          releaseDatePrecision: album.release_date_precision,
          image: album.images[0]?.url,
          artists: {
            deleteMany: {},
            create: album.artists.map((artist) => ({
              artist: { connect: { spotifyId: artist.id } },
              role: "primary",
            })),
          },
        },
      }),
    );
    if (upsertedAlbum.error) {
      logger.error(upsertedAlbum.error);
      return;
    }
    queue.complete(album.id);
  }
}

export async function createTracks(
  spotify: SpotifyApi,
  force: boolean = false,
) {
  const queue = getQueueManager().tracks;
  if (queue.size() === 0) return;

  if (!force) {
    const existingTracks = await tryCatch(
      db.track.findMany({
        where: { spotifyId: { in: queue.toArray() } },
      }),
    );
    if (existingTracks.error) {
      logger.error(existingTracks.error);
      return;
    }

    for (const track of existingTracks.data) {
      queue.complete(track.spotifyId);
    }
  }

  for (const id of queue.toArray()) {
    const trackData = await tryCatch(spotify.tracks.get(id));
    if (trackData.error) {
      logger.error("Track not found");
      continue;
    }
    const track = trackData.data;
    const trackArtists = {
      create: track.artists.map((artist, index) => ({
        artist: { connect: { spotifyId: artist.id } },
        role: index === 0 ? "primary" : "featured",
      })),
    };
    const newTrack = {
      name: track.name,
      releaseDate: track.album.release_date,
      releaseDatePrecision: track.album.release_date_precision,
      image: track.album.images[0]?.url,
      uri: track.uri,
      type: track.type,
      explicit: track.explicit,
      duration: track.duration_ms,
      disc_number: track.disc_number,
      track_number: track.track_number,
      is_local: track.is_local,
      href: track.href,
    };
    const upsertedTrack = await tryCatch(
      db.track.upsert({
        where: { spotifyId: track.id },
        create: {
          spotifyId: track.id,
          ...newTrack,
          album: { connect: { spotifyId: track.album.id } },
          artists: trackArtists,
        },
        update: {
          ...newTrack,
          album: { connect: { spotifyId: track.album.id } },
          artists: {
            deleteMany: {},
            ...trackArtists,
          },
        },
      }),
    );
    if (upsertedTrack.error) {
      logger.error(upsertedTrack.error);
      continue;
    }
    queue.complete(track.id);
  }
}

export async function createPlaylists(
  spotify: SpotifyApi,
  force: boolean = false,
) {
  let favoritePlaylist = null;
  const queue = getQueueManager().playlists;

  if (queue.size() === 0) return;

  if (!force) {
    const existingPlaylists = await tryCatch(
      db.playlist.findMany({
        where: { spotifyId: { in: queue.toArray() }, type: "playlist" },
      }),
    );
    if (existingPlaylists.error) {
      logger.error(existingPlaylists.error);
      return;
    }
    for (const playlist of existingPlaylists.data) {
      queue.complete(playlist.spotifyId);
    }
  }

  for (const playlistId of queue.toArray()) {
    const playlistData = await tryCatch(spotify.playlists.get(playlistId));
    if (playlistData.error) {
      logger.error("Playlist not found");
      continue;
    }
    if (!playlistData.data) {
      logger.error("Playlist not found");
      continue;
    }

    const isFavorite =
      playlistData.data.images[0]?.url?.includes("liked-songs");
    if (isFavorite) {
      favoritePlaylist = playlistData.data;
      continue;
    }
    const upsertedPlaylist = await tryCatch(
      db.playlist.upsert({
        where: { spotifyId: getIdFromUri(playlistId) ?? "" },
        create: {
          spotifyId: getIdFromUri(playlistId) ?? "",
          name: playlistData.data.name,
          type: "playlist",
          image: playlistData.data.images[0]?.url,
        },
        update: {
          name: playlistData.data.name,
          type: "playlist",
          image: playlistData.data.images[0]?.url,
        },
      }),
    );
    if (upsertedPlaylist.error) {
      logger.error(upsertedPlaylist.error);
      continue;
    }
    queue.complete(playlistId);
  }
  return favoritePlaylist;
}

export async function createPlaybacks(
  userId: string,
  playbacks: PlayHistory[],
  state: PlaybackState,
  favoritePlaylist?: Playlist | null,
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

    const { context, contextUri, contextId } = resolvePlaybackContext(
      playback.context,
      favoritePlaylist,
    );
    const { device, platform, originalPlatform } =
      resolvePlaybackDevice(state);

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
          context,
          contextUri,
          contextId,
          device,
          platform,
          originalPlatform,
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
          .map((item) => getIdFromUri(item.spotify_track_uri))
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
    let errorsInBatch = 0;
    for (const item of batch) {
      const spotifyId = getIdFromUri(item.spotify_track_uri);
      if (!spotifyId) continue;
      const trackId = trackIdBySpotifyId.get(spotifyId);
      if (!trackId) continue;
      const playback = {
        userId,
        duration: item.ms_played ?? 0,
        device: "Unknown",
        context: "Unknown",
        platform: platform(item.platform),
        originalPlatform: normalizeLabel(item.platform),
        trackId: trackId,
        playedAt: item.ts,
      };

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
        errorsInBatch++;
      }
    }
    totalEntriesAdded += batch.length - errorsInBatch;
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
