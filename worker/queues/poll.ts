import { logger } from "@/lib/logger";

import type { RunExclusive } from "../lib/run-exclusive";
import { fetchPlaybacks } from "../lib/fetch-playbacks";
import { getPollQueue } from "@/server/queues/poll";
import { Worker } from "bullmq";
import { ioRedis } from "@/server/cache";

const STATS_INTERVAL_MS = 1000 * 60 * 5; // 5 min

export async function createPollWoker(runExclusive: RunExclusive) {
  const queue = getPollQueue();
  await queue.upsertJobScheduler(
    "poll",
    {
      every: STATS_INTERVAL_MS,
    },
    {
      name: "every-job",
    },
  );
  const worker = new Worker(
    "poll",
    async () => {
      await runExclusive(fetchPlaybacks);
    },
    { connection: ioRedis(), concurrency: 1 },
  );

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      `Stats polling failed`,
    );
  });

  worker.on("error", (error) => {
    logger.error(`Stats polling worker error: ${error.message}`);
  });
}
