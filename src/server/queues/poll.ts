import { Queue } from "bullmq";

import { ioRedis } from "@/server/cache";

let masterDataQueue: Queue | null = null;

export function getPollQueue() {
  masterDataQueue ??= new Queue("poll", {
    connection: ioRedis(),
  });
  return masterDataQueue;
}
