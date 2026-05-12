import { logger } from "@/lib/logger";
import { env } from "@/env";
import { db } from "@/server/db";
import { tryCatch } from "@/lib/try-catch";
import type { AccessToken } from "./types";
import { PlayerEndpoint } from "./endpoints/player";
import { UserEndpoint } from "./endpoints/user";
import { ArtistEndpoint } from "./endpoints/artist";
import { AlbumEndpoint } from "./endpoints/album";
import { TrackEndpoint } from "./endpoints/track";
import { PlaylistEndpoint } from "./endpoints/playlist";

export { SpotifyHttpError } from "./endpoints/endpoint";

const REFRESH_TOKEN_BEFORE_EXPIRATION = 1000 * 60 * 5; // 5 minutes

export class Spotify {
  private readonly userId: string;
  private lastLastAccessToken: AccessToken | null = null;

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
    if (
      this.lastLastAccessToken &&
      this.lastLastAccessToken.expires &&
      this.lastLastAccessToken.expires >
        Date.now() + REFRESH_TOKEN_BEFORE_EXPIRATION
    ) {
      return this.lastLastAccessToken;
    }
    return this.getOrCreateAccessToken();
  }

  private async getOrCreateAccessToken(): Promise<AccessToken> {
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
    const token: AccessToken = {
      access_token: account.accessToken ?? "",
      token_type: "Bearer",
      expires_in: Math.floor(
        (account.accessTokenExpiresAt.getTime() - Date.now()) / 1000,
      ),
      refresh_token: account.refreshToken ?? "",
      expires: account.accessTokenExpiresAt.getTime(),
    };
    this.lastLastAccessToken = token;
    return token;
  }

  private async refreshToken(refresh_token?: string): Promise<AccessToken> {
    if (!refresh_token) {
      logger.error("[Spotify] No refresh_token available.");
      return {} as AccessToken;
    }

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
      this.lastLastAccessToken = token;
      return token;
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
