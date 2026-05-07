import {
    type AccessToken,
    type IAuthStrategy,
    type SdkConfiguration,
    type SdkOptions,
    SpotifyApi,
} from "@spotify/web-api-ts-sdk";
import { db } from "@/server/db";
import { tryCatch } from "@/lib/try-catch";
import { logger } from "@/lib/logger";
import { env } from "@/env";
import SpotifyResponseDeserializer from "@/server/spotify-response-deserializer";

class NextAuthStrategy implements IAuthStrategy {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    public getOrCreateAccessToken(): Promise<AccessToken> {
        return this.getAccessTokenWithRefresh();
    }

    public async getAccessToken(): Promise<AccessToken> {
        return this.getAccessTokenFromDB();
    }

    private async getAccessTokenFromDB(): Promise<AccessToken> {
        const result = await tryCatch(db.account.findFirst({
            where: {
                userId: this.userId,
                providerId: "spotify",
            },
        }));

        if (result.error) {
            logger.error({
                error: result.error,
            }, "[Spotify-SDK] Failed to get DB token");
            return {} as AccessToken;
        }

        const { data: account } = result;

        return {
            access_token: account?.accessToken ?? "",
            token_type: "Bearer",
            expires_in: account?.accessTokenExpiresAt
                ? Math.floor((account.accessTokenExpiresAt.getTime() - Date.now()) / 1000)
                : 0,
            expires: account?.accessTokenExpiresAt?.getTime() ?? 0,
            refresh_token: account?.refreshToken ?? "",
        } as AccessToken;
    }

    private async getAccessTokenWithRefresh(): Promise<AccessToken> {
        let token = await this.getAccessTokenFromDB();
        const now = Date.now();

        if (
            !token.access_token ||
            (token.expires && token.expires - now < 60000 * 60)
        ) {
            token = await this.refreshToken(token.refresh_token);
        }

        return token;
    }

    private async refreshToken(refresh_token?: string): Promise<AccessToken> {
        if (!refresh_token) {
            logger.error("[Spotify-SDK] No refresh_token available.");
            return {} as AccessToken;
        }

        try {
            const params = new URLSearchParams();
            params.append("grant_type", "refresh_token");
            params.append("refresh_token", refresh_token);

            const basicAuth = Buffer.from(`${env.BETTER_AUTH_SPOTIFY_CLIENT_ID}:${env.BETTER_AUTH_SPOTIFY_CLIENT_SECRET}`).toString("base64");

            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${basicAuth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params,
            });

            if (!response.ok) {
                logger.error({
                    error: await response.json(),
                }, "[Spotify-SDK] Token refresh failed");
                return {} as AccessToken;
            }

            const data = await response.json();

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
                        ...(data.refresh_token && { refreshToken: data.refresh_token }),
                    },
                })
            );

            return {
                access_token: data.access_token,
                token_type: data.token_type || "Bearer",
                expires_in: data.expires_in || 3600,
                expires: expiresAt.getTime(),
                refresh_token: data.refresh_token || refresh_token,
            } as AccessToken;

        } catch (err) {
            logger.error({
                error: err,
            }, "[Spotify-SDK] Error refreshing token");
            return {} as AccessToken;
        }
    }

    public removeAccessToken(): void {
        logger.warn("[Spotify-SDK] removeAccessToken not implemented");
    }

    public setConfiguration(configuration: SdkConfiguration): void {
        logger.warn("[Spotify-SDK] setConfiguration not implemented");
    }
}

export default function getSpotifyApi(userId: string, config?: SdkOptions) {
    const strategy = new NextAuthStrategy(userId);
    return new SpotifyApi(strategy, {
        deserializer: new SpotifyResponseDeserializer(),
        ...config,
    });
}