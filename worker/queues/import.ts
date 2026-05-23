import { Worker } from "bullmq";
import Bun from "bun";

import {
  createAlbums,
  createArtists,
  createGenres,
  createHistory,
  createTracks,
  getIdFromUri,
  type HistoryItem,
} from "worker/lib/create";
import { hydrateCreationQueuesFromSpotifyTrackCatalog } from "worker/lib/master-data";
import { type ImportStatusLabel } from "@/lib/consts/import";
import { logger } from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import { ioRedis } from "@/server/cache";
import { db } from "@/server/db";
import getSpotifyApi from "@/server/spotify";

import type { RunExclusive } from "../lib/run-exclusive";
import { getQueueManager } from "worker/lib/queue";

type ImportJobData = { id: number };

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

export function createImportWorker(runExclusive: RunExclusive) {
  const worker = new Worker<ImportJobData>(
    "import",
    async (job) => {
      await runExclusive(async () => {
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
        const queues = getQueueManager();
        queues.clear();
        logger.info(`Collecting track ids`);
        for (const item of history.data) {
          const trackId = getIdFromUri(item.spotify_track_uri);
          if (!trackId) {
            continue;
          }
          queues.tracks.add(trackId);
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

  worker.on("completed", (job) => {
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

  worker.on("failed", (job, error) => {
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

  worker.on("error", (error) => {
    logger.error(`Import worker error: ${error.message}`);
  });

  return worker;
}
