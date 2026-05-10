import { Queue } from "bullmq";

import { ioRedis } from "@/server/cache";

export type MasterDataJobData = {
  spotifyUserId: string;
};

let masterDataQueue: Queue<MasterDataJobData> | null = null;

export function getMasterDataQueue() {
  masterDataQueue ??= new Queue<MasterDataJobData>("master-data", {
    connection: ioRedis(),
  });
  return masterDataQueue;
}
