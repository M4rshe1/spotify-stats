import "server-only";
import pkg from "../../package.json";
import { APP_REPO_URL, APP_VERSION } from "@/lib/consts/app";
import { logger } from "@/lib/logger";
import { subDays } from "date-fns";

const RELEASES_API_URL =
  "https://api.github.com/repos/M4rshe1/spotify/releases/latest";
const RELEASE_FALLBACK_URL = `${APP_REPO_URL}/releases/latest`;
const REVALIDATE_SECONDS = 60 * 60;

const LATEST_RELEASE_VERSION = {
  version: pkg.version,
  htmlUrl: `${APP_REPO_URL}/releases/latest`,
  publishedAt: new Date().toISOString(),
  isNewer: true,
};

const LAST_UPDATED_AT = subDays(new Date(), 1);
const UPDATE_INTERVAL = 1000 * 60 * 60;

export type LatestReleaseInfo = {
  version: string;
  htmlUrl: string;
  publishedAt: string | null;
  isNewer: boolean;
};

type GithubReleasePayload = {
  tag_name?: string;
  name?: string;
  html_url?: string;
  published_at?: string | null;
  draft?: boolean;
  prerelease?: boolean;
};

function parseSemver(input: string): number[] | null {
  const cleaned = input.trim().replace(/^v/i, "").split(/[-+]/)[0];
  if (!cleaned) return null;
  const parts = cleaned.split(".");
  if (parts.length === 0) return null;
  const nums: number[] = [];
  for (const part of parts) {
    const n = Number.parseInt(part, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    nums.push(n);
  }
  while (nums.length < 3) nums.push(0);
  return nums;
}

export function isVersionNewer(latest: string, current: string): boolean {
  const a = parseSemver(latest);
  const b = parseSemver(current);
  if (!a || !b) return false;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}

export async function getLatestRelease(): Promise<LatestReleaseInfo | null> {
  if (new Date().getTime() - LAST_UPDATED_AT.getTime() < UPDATE_INTERVAL) {
    return LATEST_RELEASE_VERSION;
  }
  const response = await fetch(RELEASES_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: REVALIDATE_SECONDS, tags: ["github-latest-release"] },
  });

  if (!response.ok) {
    logger.debug(
      { status: response.status },
      "GitHub latest release responded with non-OK",
    );
    return null;
  }
  try {
    const response = await fetch(RELEASES_API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: REVALIDATE_SECONDS, tags: ["github-latest-release"] },
    });

    if (!response.ok) {
      logger.debug(
        { status: response.status },
        "GitHub latest release responded with non-OK",
      );
      return null;
    }

    const payload = (await response.json()) as GithubReleasePayload;

    if (payload.draft || payload.prerelease) return null;

    const tag = payload.tag_name?.trim();
    if (!tag) return null;

    const version = tag.replace(/^v/i, "");
    if (!parseSemver(version)) return null;

    const LATEST_RELEASE_VERSION = {
      version,
      htmlUrl: payload.html_url?.trim() || RELEASE_FALLBACK_URL,
      publishedAt: payload.published_at ?? null,
      isNewer: isVersionNewer(version, APP_VERSION),
    };
    LAST_UPDATED_AT.setTime(new Date().getTime());
    return LATEST_RELEASE_VERSION;
  } catch (error) {
    logger.debug({ err: error }, "Failed to fetch latest GitHub release");
    return LATEST_RELEASE_VERSION;
  }
}
