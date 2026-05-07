import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { DEFAULT_IANA_TIMEZONE } from "@/lib/timezone";
import { db } from "@/server/db";

const spotifyScopes = [
  // Images
  "ugc-image-upload",

  // Spotify Connect
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",

  // Playback
  "app-remote-control",
  "streaming",

  // Playlists
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",

  // Follow
  "user-follow-modify",
  "user-follow-read",

  // Listening History
  "user-read-playback-position",
  "user-top-read",
  "user-read-recently-played",

  // Library
  "user-library-modify",
  "user-library-read",

  // Users
  "user-read-email",
  "user-read-private",
];

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        input: false,
        type: "string",
        default: "user",
        enum: ["user", "admin"],
      },
      product: {
        input: false,
        type: "string",
        default: "free",
      },
      timezone: {
        input: false,
        type: "string",
        default: DEFAULT_IANA_TIMEZONE,
      },
    },
  },
  account: {
    
  },
  socialProviders: {
    spotify: {
      scope: spotifyScopes,
      clientId: env.BETTER_AUTH_SPOTIFY_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_SPOTIFY_CLIENT_SECRET,
      redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/spotify`,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
