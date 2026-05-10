import { Worker } from "bullmq";

import Bun from "bun";

import {
  addToCreationQueues,
  createAlbums,
  createArtists,
  createGenres,
  createHistory,
  createTracks,
  getIdFromUri,
  type HistoryItem,
  cleanQueues,
} from "@/lib/spotify";
import {
  createQueuedMasterDataFromSpotify,
  hydrateCreationQueuesFromSpotifyTrackCatalog,
  rebuildMasterDataQueuesFromExistingTracks,
} from "@/lib/spotify-master-data";
import { ioRedis } from "@/server/cache";
import { db } from "@/server/db";
import getSpotifyApi from "@/server/spotify";
import { type ImportStatusLabel } from "@/lib/consts/import";
import { logger } from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import type { MasterDataJobData } from "@/server/queues/master-data";

type ImportJobData = { id: number };

logger.info("Cruncher worker started");

let cruncherJobChain: Promise<unknown> = Promise.resolve();

function runCruncherExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = cruncherJobChain.then(fn);
  cruncherJobChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getImportRecord(importId: number) {
  const importRecord = await tryCatch(
    db.import.findUnique({
      where: { id: importId, status: "pending" satisfies ImportStatusLabel },
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

const importWorker = new Worker<ImportJobData>(
  "import",
  async (job) => {
    await runCruncherExclusive(async () => {
      const importRecord = await getImportRecord(job.data.id);
      await db.import.update({
        where: { id: importRecord.id },
        data: {
          status: "processing",
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
      cleanQueues();
      logger.info(`Collecting track ids`);
      for (const item of history.data) {
        const trackId = getIdFromUri(item.spotify_track_uri);
        if (!trackId) {
          continue;
        }
        addToCreationQueues("tracks", trackId);
      }
      await hydrateCreationQueuesFromSpotifyTrackCatalog(spotify);
      await createGenres();
      await createArtists(spotify);
      await createAlbums(spotify);
      await createTracks(spotify);
      await createHistory(importRecord.userId, importRecord.id, history.data);
      logger.info(`Import ${importRecord.id} completed`);
    });
  },
  { connection: ioRedis(), concurrency: 1 },
);

const masterDataWorker = new Worker<MasterDataJobData>(
  "master-data",
  async (job) => {
    await runCruncherExclusive(async () => {
      logger.info(
        {
          jobId: job.id,
          spotifyUserId: job.data.spotifyUserId,
        },
        "Master-data refetch started",
      );
      const spotify = getSpotifyApi(job.data.spotifyUserId);
      await rebuildMasterDataQueuesFromExistingTracks(spotify);
      await createQueuedMasterDataFromSpotify(spotify);
      logger.info({ jobId: job.id }, "Master-data refetch completed");
    });
  },
  { connection: ioRedis(), concurrency: 1 },
);

importWorker.on("completed", (job) => {
  logger.info(`Job ${job?.id} completed`);
  if (!job?.data?.id) {
    return;
  }
  void db.import
    .update({
      where: { id: job.data.id },
      data: {
        status: "completed",
        progress: 1,
        error: null,
        completedAt: new Date(),
      },
    })
    .catch((err: unknown) => {
      logger.error(err);
    });
});

importWorker.on("failed", (job, error) => {
  logger.error(`Job ${job?.id} failed: ${error.message}`);
  if (!job?.data?.id) {
    return;
  }
  void db.import
    .update({
      where: { id: job.data.id },
      data: {
        status: "failed",
        error: error.message,
        completedAt: new Date(),
      },
    })
    .catch((err: unknown) => {
      logger.error(err);
    });
});

masterDataWorker.on("failed", (job, error) => {
  logger.error(
    { jobId: job?.id, error: error.message },
    `Master-data job failed`,
  );
});

importWorker.on("error", (error) => {
  logger.error(`Import worker error: ${error.message}`);
});

masterDataWorker.on("error", (error) => {
  logger.error(`Master-data worker error: ${error.message}`);
});
