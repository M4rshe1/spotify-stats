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

export function LoginForm({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function handleSpotifySignIn() {
    setPending(true);
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
      setPending(false);
    }
  }

  return (
    <Card className={cn("w-full max-w-sm shadow-lg", className)} size="sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Sign in with your Spotify account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Button
          type="button"
          variant="default"
          onClick={handleSpotifySignIn}
          disabled={pending}
        >
          {pending ? "Redirecting…" : "Continue with Spotify"}
        </Button>
      </CardContent>
      <CardFooter className="justify-center border-t-0 pt-0">
        <Button variant="link" className="text-muted-foreground h-auto p-0" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
