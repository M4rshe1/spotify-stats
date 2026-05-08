import { Queue } from "bullmq";
import { ioRedis } from "@/server/cache";

type ImportJobData = {
  id: number;
};

let importQueue: Queue<ImportJobData> | null = null;

export function getImportQueue() {
  if (!importQueue) {
    importQueue = new Queue<ImportJobData>("import", {
      connection: ioRedis(),
    });
  }
  return importQueue;
}
