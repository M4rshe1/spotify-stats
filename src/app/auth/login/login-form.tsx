"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/server/better-auth/client";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  googleAuthEnabled = false,
}: {
  className?: string;
  googleAuthEnabled?: boolean;
}) {
  const [pending, setPending] = useState<null | "spotify" | "google">(null);

  async function handleSpotifySignIn() {
    setPending("spotify");
    try {
      const { data, error } = await authClient.signIn.social({
        provider: "spotify",
        callbackURL: "/",
      });

      if (error) {
        toast.error(error.message ?? "Could not start Spotify sign-in.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } finally {
      setPending(null);
    }
  }

  async function handleGoogleSignIn() {
    setPending("google");
    try {
      const { data, error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });

      if (error) {
        toast.error(error.message ?? "Could not start Google sign-in.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <Card
      className={cn(
        "w-full max-w-md border-border bg-card shadow-md",
        className,
      )}
      size="sm"
    >
      <CardHeader className="space-y-1.5 pb-2">
        <CardTitle className="font-heading text-xl">Sign in</CardTitle>
        <CardDescription>
          {googleAuthEnabled ? (
            <>Spotify for new accounts. Google only if you linked it before.</>
          ) : (
            <>Spotify opens your dashboard and stats.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          type="button"
          variant="default"
          className="h-10 font-semibold"
          onClick={handleSpotifySignIn}
          disabled={pending !== null}
        >
          {pending === "spotify" ? "Redirecting…" : "Continue with Spotify"}
        </Button>
        {googleAuthEnabled ? (
          <>
            <div className="flex items-center gap-3 py-1">
              <div className="bg-border h-px flex-1 shrink-0" />
              <span className="text-muted-foreground text-xs">or</span>
              <div className="bg-border h-px flex-1 shrink-0" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="bg-background"
              onClick={handleGoogleSignIn}
              disabled={pending !== null}
            >
              {pending === "google" ? "Redirecting…" : "Continue with Google"}
            </Button>
          </>
        ) : null}
      </CardContent>
      <CardFooter className="justify-center border-t-0 pt-0">
        <Button variant="link" className="text-muted-foreground h-auto p-0" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
