import { env } from "@/env";

/** True when Google OAuth env vars are set (login UI + provider are enabled). */
export function isGoogleAuthConfigured(): boolean {
  const id = env.BETTER_AUTH_GOOGLE_CLIENT_ID?.trim();
  const secret = env.BETTER_AUTH_GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}
