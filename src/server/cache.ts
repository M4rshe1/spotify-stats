import { env } from "@/env";
import Redis from "ioredis";

let redis: Redis | null = null;

export function ioRedis() {
    if (!redis) {
        redis = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
        });
    }
    return redis;
}