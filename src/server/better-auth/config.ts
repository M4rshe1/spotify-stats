import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { DEFAULT_IANA_TIMEZONE } from "@/lib/timezone";
import { db } from "@/server/db";
import { admin } from "better-auth/plugins";

function parseAllowedEmails(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Blocks new-user creation when signup is restricted and email is not whitelisted. */
function assertRegistrationAllowed(email: unknown) {
  if (env.ALLOW_REGISTER) return;
  const normalized =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalized || !parseAllowedEmails(env.ALLOWED_EMAILS).has(normalized)) {
    throw new APIError("FORBIDDEN", {
      message:
        "Registration is closed. Ask an administrator if you need access.",
      code: "REGISTRATION_NOT_ALLOWED",
    });
  }
}

function googleOAuthCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = env.BETTER_AUTH_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.BETTER_AUTH_GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

const googleCreds = googleOAuthCredentials();

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
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["spotify", "google"],
      /** Google sign-in on the login page only works if this provider is already linked (via Account → Link Google). */
      disableImplicitLinking: true,
    },
  },
  plugins: [admin()],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          assertRegistrationAllowed(user.email);
        },
        after: async (user) => {
          const usersCount = await db.user.count();
          const role = usersCount === 0 ? "admin" : "user";
          await db.user.update({
            where: { id: user.id },
            data: { role },
          });
        },
      },
    },
  },
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
  socialProviders: {
    spotify: {
      scope: spotifyScopes,
      clientId: env.BETTER_AUTH_SPOTIFY_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_SPOTIFY_CLIENT_SECRET,
      redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/spotify`,
    },
    ...(googleCreds
      ? {
          google: {
            ...googleCreds,
            redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
            /** No new users via Google OAuth on the login screen. */
            disableImplicitSignUp: true,
          },
        }
      : {}),
  },
});

export type Session = typeof auth.$Infer.Session;
