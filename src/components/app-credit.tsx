import { ArrowUpCircle } from "lucide-react";
import Link from "next/link";

import {
  APP_AUTHOR_HANDLE,
  APP_AUTHOR_NAME,
  APP_AUTHOR_URL,
  APP_REPO_URL,
  APP_VERSION,
} from "@/lib/consts/app";
import type { LatestReleaseInfo } from "@/lib/github-release";
import { cn } from "@/lib/utils";

type AppCreditProps = {
  className?: string;
  variant?: "sidebar" | "footer";
  latestRelease?: LatestReleaseInfo | null;
};

export function AppCredit({
  className,
  variant = "footer",
  latestRelease,
}: AppCreditProps) {
  const isSidebar = variant === "sidebar";
  const hasUpdate = Boolean(latestRelease?.isNewer);
  const versionLabel = `v${APP_VERSION}`;

  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-col items-center gap-0.5 text-[10px] leading-tight",
        isSidebar
          ? "px-2 py-1 group-data-[collapsible=icon]:hidden"
          : "py-2 text-center",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <a
          href={APP_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground font-mono tracking-tight transition-colors"
          aria-label={`Spotify Stats version ${APP_VERSION}`}
        >
          {versionLabel}
        </a>
        {hasUpdate && latestRelease ? (
          <a
            href={latestRelease.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "group/update border-success/40 bg-success/10 text-success-foreground hover:bg-success/20 inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 font-mono text-[9px] font-medium transition-colors",
              "dark:border-success/30 dark:bg-success/15",
            )}
            title={`Update available: v${latestRelease.version}`}
            aria-label={`Update available: version ${latestRelease.version}`}
          >
            <span
              className="bg-success size-1.5 shrink-0 animate-pulse rounded-full"
              aria-hidden
            />
            <ArrowUpCircle
              className="size-2.5 shrink-0 transition-transform group-hover/update:-translate-y-0.5"
              aria-hidden
            />
            <span>v{latestRelease.version}</span>
          </a>
        ) : null}
      </div>
      <p>
        <span aria-hidden>© </span>
        <Link
          href={APP_AUTHOR_URL}
          target="_blank"
          className="hover:text-foreground transition-colors"
        >
          {APP_AUTHOR_NAME}{" "}
        </Link>
        <span className="text-muted-foreground/70">
          (aka.{" "}
          <Link
            href={`https://github.com/${APP_AUTHOR_HANDLE}`}
            target="_blank"
            className="hover:text-foreground font-mono transition-colors"
          >
            {APP_AUTHOR_HANDLE}
          </Link>
          )
        </span>
      </p>
    </div>
  );
}
