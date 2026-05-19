import { logger } from "@/lib/logger";
import {
  computeBackoffDelayMs,
  isRetryableSpotifyError,
  MAX_SPOTIFY_RETRIES,
  sleep,
} from "./backoff";

const RATE_LIMIT = 90;
const WINDOW_MS = 30_000;

const PROCESS_PERCENT = {
  worker: 0.7,
  app: 0.2,
  buffer: 0.1,
} as const;

type ProcessKind = keyof typeof PROCESS_PERCENT;
type ActiveProcessKind = Exclude<ProcessKind, "buffer">;

function detectProcessKind(): ActiveProcessKind {
  const entry = process.argv[1] ?? "";
  return entry.includes("/worker/") || entry.includes("\\worker\\")
    ? "worker"
    : "app";
}

let sharedLimiter: SpotifyRateLimiter | undefined;

export function getSpotifyRateLimiter(): SpotifyRateLimiter {
  sharedLimiter ??= new SpotifyRateLimiter(detectProcessKind());
  return sharedLimiter;
}

export class SpotifyRateLimiter {
  private readonly maxRequests: number;
  private readonly timestamps: number[] = [];
  private acquireChain: Promise<void> = Promise.resolve();

  constructor(processKind: ActiveProcessKind) {
    this.maxRequests = Math.floor(RATE_LIMIT * PROCESS_PERCENT[processKind]);
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;

    while (true) {
      await this.acquire();
      try {
        return await fn();
      } catch (error) {
        if (
          !isRetryableSpotifyError(error) ||
          attempt >= MAX_SPOTIFY_RETRIES - 1
        ) {
          throw error;
        }

        const [delayMs, retryAfter] = computeBackoffDelayMs(
          attempt,
          error.headers,
        );
        attempt += 1;

        logger.warn(
          { status: error.status, attempt, delayMs, retryAfter },
          "Spotify API rate limited or unavailable, retrying",
        );

        await sleep(delayMs);
      }
    }
  }

  private acquire(): Promise<void> {
    const next = this.acquireChain.then(() => this.waitForSlot());
    this.acquireChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async waitForSlot(): Promise<void> {
    while (true) {
      const now = Date.now();
      const cutoff = now - WINDOW_MS;

      while (this.timestamps.length > 0 && this.timestamps[0]! <= cutoff) {
        this.timestamps.shift();
      }

      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }

      const oldest = this.timestamps[0]!;
      const waitMs = Math.max(1, oldest + WINDOW_MS - now + 1);
      await sleep(waitMs);
    }
  }
}
