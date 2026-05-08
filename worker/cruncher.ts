import { ioRedis } from "@/server/cache";
import { Worker } from "bullmq";
import { logger } from "@/lib/logger";
import Bun from "bun";
import { db } from "@/server/db";
import { tryCatch } from "@/lib/try-catch";
import { type ImportStatusLabel } from "@/lib/consts/import";
import {
  addToCreationQueues,
  createGenres,
  createAlbums,
  createArtists,
  retrySpotifyCall,
  createTracks,
  Batches,
  createHistory,
  getTrackIdFromUri,
  type HistoryItem,
} from "@/lib/spotify";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import getSpotifyApi from "@/server/spotify";

logger.info("Cruncher worker started");

async function getImportRecord(importId: number) {
  const importRecord = await tryCatch(
    db.import.findUnique({
      where: { id: importId, status: "pending" as ImportStatusLabel },
    }),
  );
  if (importRecord.error) {
    throw importRecord.error;
  }
  if (!importRecord.data) {
    throw new Error(`Import ${importId} not found`);
  }
  return importRecord.data;
}

async function buildQueues(spotify: SpotifyApi) {
  const batches = new Batches().fromQueue("tracks");
  for (const batch of batches) {
    const { error, data: tracksData } = await retrySpotifyCall(
      () => spotify.tracks.get(Array.from(batch) as string[]),
      "tracks.get",
    );
    if (error || !tracksData) {
      logger.error(error);
      return;
    }
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

const worker = new Worker(
  "import",
  async (job) => {
    const importRecord = await getImportRecord(job.data.id);
    await db.import.update({
      where: { id: importRecord.id },
      data: {
        status: "processing" as ImportStatusLabel,
        progress: 0,
        entriesAdded: 0,
        error: null,
        completedAt: null,
      },
    });
    logger.info(`Import ${importRecord.id} started`);
    const spotify = getSpotifyApi(importRecord.userId);
    const history = await tryCatch(
      Bun.file(`uploads/${importRecord.id}.json`).json() as Promise<
        HistoryItem[]
      >,
    );
    if (history.error) {
      throw history.error;
    }
    logger.info(`Found ${history.data.length} history items`);
    logger.info(`Collecting track ids`);
    for (const item of history.data) {
      const trackId = getTrackIdFromUri(item.spotify_track_uri);
      if (!trackId) {
        continue;
      }
      addToCreationQueues("tracks", trackId);
    }
    logger.info(`Building queues`);
    await buildQueues(spotify);
    logger.info(`Creating genres`);
    await createGenres();
    logger.info(`Creating artists`);
    await createArtists(spotify);
    logger.info(`Creating albums`);
    await createAlbums(spotify);
    logger.info(`Creating tracks`);
    await createTracks(spotify);
    logger.info(`Creating history`);
    await createHistory(importRecord.userId, importRecord.id, history.data);
    logger.info(`Import ${importRecord.id} completed`);
  },
  { connection: ioRedis(), concurrency: 1 },
);

worker.on("completed", async (job) => {
  logger.info(`Job ${job?.id} completed`);
  if (!job?.data?.id) {
    return;
  }
  await db.import.update({
    where: { id: job.data.id },
    data: {
      status: "completed" as ImportStatusLabel,
      progress: 1,
      error: null,
      completedAt: new Date(),
    },
  });
});

worker.on("failed", async (job, error) => {
  logger.error(`Job ${job?.id} failed: ${error.message}`);
  if (!job?.data?.id) {
    return;
  }
  await db.import.update({
    where: { id: job.data.id },
    data: {
      status: "failed" as ImportStatusLabel,
      error: error.message,
      completedAt: new Date(),
    },
  });
});

worker.on("error", async (error) => {
  logger.error(`Worker error: ${error.message}`);
});
