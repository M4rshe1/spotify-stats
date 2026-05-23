import { Worker } from "bullmq";

import {
  createQueuedMasterDataFromSpotify,
  rebuildMasterDataQueuesFromExistingTracks,
} from "worker/lib/master-data";
import { logger } from "@/lib/logger";
import { ioRedis } from "@/server/cache";
import type { MasterDataJobData } from "@/server/queues/master-data";
import getSpotifyApi from "@/server/spotify";

import type { RunExclusive } from "../lib/run-exclusive";

export function createMasterDataWorker(runExclusive: RunExclusive) {
  const worker = new Worker<MasterDataJobData>(
    "master-data",
    async (job) => {
      await runExclusive(async () => {
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

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      `Master-data job failed`,
    );
  });

  worker.on("error", (error) => {
    logger.error(`Master-data worker error: ${error.message}`);
  });

  return worker;
}
