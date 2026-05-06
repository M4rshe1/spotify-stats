import { ioRedis } from '@/server/cache';
import { Worker } from 'bullmq';
import { logger } from '@/lib/logger';

logger.info('Stats worker started');

const worker = new Worker('import', async (job) => {

}, { connection: ioRedis() });

worker.on('completed', (job) => {
    logger.info(`Job ${job?.id} completed`);
});

worker.on('failed', (job, error) => {
    logger.error(`Job ${job?.id} failed: ${error.message}`);
});

worker.on('error', (error) => {
    logger.error(`Worker error: ${error.message}`);
});