import { SpotifyHttpError } from "./endpoints/endpoint";

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
export const MAX_SPOTIFY_RETRIES = 5;

export function isRetryableSpotifyError(
  error: unknown,
): error is SpotifyHttpError {
  if (!(error instanceof SpotifyHttpError)) {
    return false;
  }
  if (error.status === 429) {
    return true;
  }
  return error.status >= 500 && error.status < 600;
}

export function parseRetryAfterMs(headers: Headers): number | null {
  const raw = headers.get("Retry-After");
  if (!raw) {
    return null;
  }

  const seconds = Number(raw);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  return 30000;
}

export function computeBackoffDelayMs(
  attempt: number,
  headers?: Headers,
): number {
  const retryAfter = headers ? parseRetryAfterMs(headers) : null;
  if (retryAfter !== null) {
    return Math.min(retryAfter, MAX_DELAY_MS);
  }

  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  const jitter = Math.random() * 0.25 * exponential;
  return exponential + jitter;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
