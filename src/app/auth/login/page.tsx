import { type Metadata } from "next";

import { LoginForm } from "@/app/auth/login/login-form";
import { LoginHero } from "@/app/auth/login/login-hero";
import { RegistrationClosedView } from "@/app/auth/login/registration-closed-view";
import { AppCredit } from "@/components/app-credit";
import { ThemeSwitcherRow } from "@/components/theme-switcher";
import { getLatestRelease } from "@/lib/github-release";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { getSettings } from "@/lib/settings";
import { withAuth } from "@/lib/hoc-pages";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  if (settings.REGISTRATION_MODE === "closed") {
    return {
      title: "Registration closed",
      description:
        "New sign-ups are disabled for this Spotify Stats instance. Contact an administrator if you need access.",
    };
  }
  return {
    title: "Log in",
    description:
      "Sign in with Google to connect Spotify and view your personal listening statistics.",
  };
}

const Page = withAuth(async () => {
  const [settings, latestRelease] = await Promise.all([
    getSettings(),
    getLatestRelease(),
  ]);
  const googleAuthEnabled = isGoogleAuthConfigured();
  const registrationClosed = settings.REGISTRATION_MODE === "closed";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-primary/[0.1] via-background to-chart-2/18 dark:from-muted/35 dark:via-background dark:to-primary/12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "28px 28px",
          color: "var(--muted-foreground)",
        }}
        aria-hidden
      />
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcherRow />
      </div>

      {registrationClosed ? (
        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
          <RegistrationClosedView googleAuthEnabled={googleAuthEnabled} />
        </div>
      ) : (
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-4 py-20 pb-24 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-16 lg:pb-16">
          <div className="flex flex-1 flex-col justify-center py-6 lg:py-8 lg:pr-4">
            <LoginHero />
          </div>
          <div className="flex w-full shrink-0 flex-col items-center lg:w-[min(100%,380px)] lg:items-stretch">
            <LoginForm googleAuthEnabled={googleAuthEnabled} />
          </div>
        </div>
      )}

      <footer className="relative z-10 px-4 pb-6">
        <AppCredit latestRelease={latestRelease} />
      </footer>
    </main>
  );
}, true);

export default Page;
