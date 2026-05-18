import { logger } from "@/lib/logger";
import { env } from "@/env";
import { ioRedis } from "@/server/cache";
import { db } from "@/server/db";
import { tryCatch } from "@/lib/try-catch";
import type { AccessToken } from "./types";
import { PlayerEndpoint } from "./endpoints/player";
import { UserEndpoint } from "./endpoints/user";
import { ArtistEndpoint } from "./endpoints/artist";
import { AlbumEndpoint } from "./endpoints/album";
import { TrackEndpoint } from "./endpoints/track";
import { PlaylistEndpoint } from "./endpoints/playlist";
import { getSpotifyRateLimiter, type SpotifyRateLimiter } from "./rate-limiter";

export { SpotifyHttpError } from "./endpoints/endpoint";

const REFRESH_TOKEN_BEFORE_EXPIRATION = 1000 * 60 * 5; // 5 minutes
const REFRESH_LOCK_TTL_SEC = 30;
const REFRESH_WAIT_MAX_MS = 25_000;
const REFRESH_WAIT_INTERVAL_MS = 500;

const accessTokenByUserId = new Map<string, AccessToken>();
const accessTokenLoadByUserId = new Map<string, Promise<AccessToken>>();

function isAccessTokenFresh(token: AccessToken): boolean {
  return Boolean(
    token.expires &&
      token.expires > Date.now() + REFRESH_TOKEN_BEFORE_EXPIRATION,
  );
}

function accountToAccessToken(account: {
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshToken: string | null;
}): AccessToken | null {
  if (!account.accessToken || !account.accessTokenExpiresAt) {
    return null;
  }
  return {
    access_token: account.accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(
      (account.accessTokenExpiresAt.getTime() - Date.now()) / 1000,
    ),
    refresh_token: account.refreshToken ?? "",
    expires: account.accessTokenExpiresAt.getTime(),
  };
}

export class Spotify {
  private readonly userId: string;

  public readonly rateLimiter: SpotifyRateLimiter;

  public readonly player: PlayerEndpoint;
  public readonly user: UserEndpoint;
  public readonly artists: ArtistEndpoint;
  public readonly albums: AlbumEndpoint;
  public readonly tracks: TrackEndpoint;
  public readonly playlists: PlaylistEndpoint;

  public readonly currentUser: {
    profile: () => ReturnType<UserEndpoint["profile"]>;
  };

  constructor(userId: string) {
    this.userId = userId;
    this.rateLimiter = getSpotifyRateLimiter();
    this.player = new PlayerEndpoint(this);
    this.user = new UserEndpoint(this);
    this.artists = new ArtistEndpoint(this);
    this.albums = new AlbumEndpoint(this);
    this.tracks = new TrackEndpoint(this);
    this.playlists = new PlaylistEndpoint(this);

    this.currentUser = {
      profile: () => this.user.profile(),
    };
  }

  public async getAccessToken(): Promise<AccessToken> {
    const cached = accessTokenByUserId.get(this.userId);
    if (cached && isAccessTokenFresh(cached)) {
      return cached;
    }

    const inFlight = accessTokenLoadByUserId.get(this.userId);
    if (inFlight) {
      return inFlight;
    }

    const loadPromise = this.loadAccessToken();
    accessTokenLoadByUserId.set(this.userId, loadPromise);

    try {
      const token = await loadPromise;
      if (token.access_token) {
        accessTokenByUserId.set(this.userId, token);
      }
      return token;
    } finally {
      if (accessTokenLoadByUserId.get(this.userId) === loadPromise) {
        accessTokenLoadByUserId.delete(this.userId);
      }
    }
  }

  private cacheAccessToken(token: AccessToken): AccessToken {
    if (token.access_token) {
      accessTokenByUserId.set(this.userId, token);
    }
    return token;
  }

  private async loadAccessToken(): Promise<AccessToken> {
    const result = await tryCatch(
      db.account.findFirst({
        where: { userId: this.userId, providerId: "spotify" },
      }),
    );
    if (result.error) {
      logger.error(
        {
          error: result.error,
        },
        "[Spotify] Error getting access token",
      );
      return {} as AccessToken;
    }
    if (!result.data) {
      logger.error("[Spotify] No account found.");
      return {} as AccessToken;
    }
    const { data: account } = result;
    if (
      !account.accessTokenExpiresAt ||
      account.accessTokenExpiresAt.getTime() <
        Date.now() + REFRESH_TOKEN_BEFORE_EXPIRATION
    ) {
      return this.refreshToken(account?.refreshToken ?? undefined);
    }
    const token = accountToAccessToken(account);
    if (!token) {
      return {} as AccessToken;
    }
    return this.cacheAccessToken(token);
  }

  private async readFreshAccessTokenFromDb(): Promise<AccessToken | null> {
    const result = await tryCatch(
      db.account.findFirst({
        where: { userId: this.userId, providerId: "spotify" },
      }),
    );
    if (result.error || !result.data) {
      return null;
    }
    const token = accountToAccessToken(result.data);
    if (!token || !isAccessTokenFresh(token)) {
      return null;
    }
    return this.cacheAccessToken(token);
  }

  private async refreshToken(refresh_token?: string): Promise<AccessToken> {
    if (!refresh_token) {
      logger.error("[Spotify] No refresh_token available.");
      return {} as AccessToken;
    }

    return withRefreshLock(
      this.userId,
      () => this.requestRefreshedAccessToken(refresh_token),
      () => this.readFreshAccessTokenFromDb(),
    );
  }

  private async requestRefreshedAccessToken(
    refresh_token: string,
  ): Promise<AccessToken> {
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", refresh_token);

      const basicAuth = Buffer.from(
        `${env.BETTER_AUTH_SPOTIFY_CLIENT_ID}:${env.BETTER_AUTH_SPOTIFY_CLIENT_SECRET}`,
      ).toString("base64");

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!response.ok) {
        logger.error(
          {
            error: await response.json(),
          },
          "[Spotify] Token refresh failed",
        );
        return {} as AccessToken;
      }

      const data = (await response.json()) as AccessToken;

      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
      await tryCatch(
        db.account.updateMany({
          where: {
            userId: this.userId,
            providerId: "spotify",
          },
          data: {
            accessToken: data.access_token,
            accessTokenExpiresAt: expiresAt,
            refreshTokenExpiresAt: expiresAt,
            ...(data.refresh_token && { refreshToken: data.refresh_token }),
          },
        }),
      );

      const token: AccessToken = {
        access_token: data.access_token,
        token_type: data.token_type || "Bearer",
        expires_in: data.expires_in || 3600,
        expires: expiresAt.getTime(),
        refresh_token: data.refresh_token || refresh_token,
      };
      return this.cacheAccessToken(token);
    } catch (err) {
      logger.error(
        {
          error: err,
        },
        "[Spotify] Error refreshing token",
      );
      return {} as AccessToken;
    }
  }
}

export type SpotifyApi = Spotify;

export default function getSpotifyApi(userId: string) {
  return new Spotify(userId);
}

async function withRefreshLock<T>(
  userId: string,
  refresh: () => Promise<T>,
  waitForFreshToken: () => Promise<T | null>,
): Promise<T> {
  const redis = ioRedis();
  const lockKey = `spotify:token-refresh:${userId}`;
  const acquired = await redis.set(lockKey, "1", "EX", REFRESH_LOCK_TTL_SEC, "NX");

  if (acquired === null) {
    const deadline = Date.now() + REFRESH_WAIT_MAX_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) =>
        setTimeout(resolve, REFRESH_WAIT_INTERVAL_MS),
      );
      const waited = await waitForFreshToken();
      if (waited) {
        return waited;
      }
    }
    logger.warn(
      { userId },
      "[Spotify] Timed out waiting for token refresh in another process",
    );
  }

  try {
    return await refresh();
  } finally {
    if (acquired !== null) {
      await redis.del(lockKey).catch(() => undefined);
    }
  }
}
