import { Info } from "lucide-react";

import { LoginForm } from "@/app/auth/login/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const REPO_ISSUES = "https://github.com/M4rshe1/spotify/issues";

export function RegistrationClosedView({
  googleAuthEnabled,
}: {
  googleAuthEnabled: boolean;
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <Alert className="border-info/40 bg-info/10 py-3 dark:border-info/30 dark:bg-info/15">
        <Info className="text-info-foreground size-4 shrink-0" aria-hidden />
        <AlertTitle className="font-heading text-sm">
          Registration is closed
        </AlertTitle>
        <AlertDescription className="text-muted-foreground mt-1 space-y-2 text-xs">
          <p>
            New Spotify Stats accounts are not being created. If you already
            have an account, sign in below.
          </p>
          <p>
            Need access? Ask an administrator. You can also open an issue on{" "}
            <a
              href={REPO_ISSUES}
              className="text-foreground underline underline-offset-2 hover:text-primary"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <p className="text-muted-foreground text-center text-[10px] font-medium tracking-wide uppercase">
          Existing account
        </p>
        <LoginForm googleAuthEnabled={googleAuthEnabled} />
      </div>
    </div>
  );
}
