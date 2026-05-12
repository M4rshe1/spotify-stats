import { logger } from "@/lib/logger";
import type { Spotify } from "..";

export class SpotifyHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly headers: Headers;

  constructor(
    message: string,
    status: number,
    body: unknown,
    headers: Headers,
  ) {
    super(message);
    this.name = "SpotifyHttpError";
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

async function readJsonBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function retryOnRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000,
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof SpotifyHttpError && error.status === 429) {
        const retryAfter = error.headers.get("retry-after");
        const delay =
          retryAfter !== null
            ? Math.max(parseInt(retryAfter, 10) * 1000, retryDelay)
            : retryDelay;
        logger.warn(
          { attempt, delay, error: error.message },
          "Spotify rate limited; retrying after delay",
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        lastError = error;
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export class Endpoint {
  constructor(protected readonly spotify: Spotify) {}

  protected buildQuery(
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    if (!params) return "";
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  }

  protected async getJson<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const qs = this.buildQuery(query);
    return retryOnRateLimit<T>(() =>
      this.requestJson<T>("GET", `${path}${qs}`),
    );
  }

  protected async postVoid(path: string): Promise<void> {
    await retryOnRateLimit<void>(async () => {
      const token = (await this.spotify.getAccessToken()).access_token;
      if (!token) {
        throw new SpotifyHttpError(
          "Missing Spotify access token",
          401,
          null,
          new Headers(),
        );
      }

      const response = await fetch(`https://api.spotify.com/v1/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 429) {
        throw new SpotifyHttpError(
          "Spotify rate limited",
          429,
          null,
          response.headers,
        );
      }

      if (!response.ok) {
        const body = await readJsonBody(response);
        logger.error(
          { status: response.status, body, path },
          "Spotify API error",
        );
        throw new SpotifyHttpError(
          `Spotify API ${response.status}: ${path}`,
          response.status,
          body,
          response.headers,
        );
      }
    });
  }

  protected async requestJson<T>(method: "GET", path: string): Promise<T> {
    const token = (await this.spotify.getAccessToken()).access_token;
    if (!token) {
      throw new SpotifyHttpError(
        "Missing Spotify access token",
        401,
        null,
        new Headers(),
      );
    }

    const response = await fetch(`https://api.spotify.com/v1/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 429) {
      throw new SpotifyHttpError(
        "Spotify rate limited",
        429,
        null,
        response.headers,
      );
    }

    if (!response.ok) {
      const body = await readJsonBody(response);
      logger.error(
        { status: response.status, body, path },
        "Spotify API error",
      );
      throw new SpotifyHttpError(
        `Spotify API ${response.status}: ${path}`,
        response.status,
        body,
        response.headers,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (e) {
      logger.error({ error: e, path }, "Invalid JSON from Spotify");
      throw new SpotifyHttpError(
        `Invalid JSON from Spotify: ${path}`,
        502,
        null,
        response.headers,
      );
    }
  }
}
