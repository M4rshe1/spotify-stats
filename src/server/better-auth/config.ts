import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { DEFAULT_IANA_TIMEZONE } from "@/lib/timezone";
import { db } from "@/server/db";
import { admin } from "better-auth/plugins";
import { getSettings } from "@/lib/settings";

function parseAllowedEmails(emails: string[]): Set<string> {
  return new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean));
}

async function registrationAllowed(email: string | null): Promise<boolean> {
  const settings = await getSettings();
  if (settings.REGISTRATION_MODE === "closed") {
    return false;
  }
  if (settings.REGISTRATION_MODE === "restricted") {
    if (!email || !new Set(settings.ALLOWED_EMAILS as string[]).has(email)) {
      return false;
    }
  }
  return true;
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
      disableImplicitLinking: true,
    },
  },
  plugins: [admin()],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!(await registrationAllowed(user.email))) {
            throw new APIError("FORBIDDEN", {
              message:
                "Registration is closed. Ask an administrator if you need access.",
              code: "REGISTRATION_NOT_ALLOWED",
            });
          }
        },
        after: async (user) => {
          const adminCount = await db.user.count({ where: { role: "admin" } });
          const role = adminCount === 0 ? "admin" : "user";
          await db.user.update({
            where: { id: user.id },
            data: { role },
          });
          await db.playlist.create({
            data: {
              spotifyId: user.id,
              name: "Favorites",
              image: "/favorites.png",
              type: "favorite",
            },
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
      disableImplicitSignUp: !(await registrationAllowed(null)),
    },
    ...(googleCreds
      ? {
          google: {
            ...googleCreds,
            redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
            disableImplicitSignUp: true,
          },
        }
      : {}),
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
