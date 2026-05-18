import { logger } from "@/lib/logger";

import { createRunExclusive } from "./lib/run-exclusive";
import { createImportWorker } from "./queues/import";
import { createMasterDataWorker } from "./queues/master-data";
import { createPollWoker } from "./queues/poll";

logger.info("Worker started");

const runExclusive = createRunExclusive();

createImportWorker(runExclusive);
createMasterDataWorker(runExclusive);
createPollWoker(runExclusive);
