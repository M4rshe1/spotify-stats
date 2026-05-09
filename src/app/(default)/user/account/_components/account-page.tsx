"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";

const DISPLAY_NAME_MAX = 120;

type LinkedAccountRow = {
  id: string;
  providerId: string;
  accountId: string;
  userId: string;
  scopes: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AuthSessionRow = {
  id: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function formatDateTime(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function shortenUa(ua: string | null | undefined, max = 72) {
  if (!ua?.trim()) return "—";
  const t = ua.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export default function AccountPage({
  googleAuthEnabled = false,
}: {
  googleAuthEnabled?: boolean;
}) {
  const router = useRouter();
  const { data: sessionData, refetch: refetchSession } =
    authClient.useSession();
  const user = sessionData?.user;
  const currentSessionId = sessionData?.session?.id;

  const utils = api.useUtils();

  const spotifyPlanQuery = api.user.getSpotifyPlan.useQuery(undefined, {
    staleTime: 60_000,
  });

  const revokeSessionMutation = api.user.revokeSessionById.useMutation({
    onError: (err) => {
      toast.error(err.message ?? "Could not revoke session.");
    },
  });

  const [name, setName] = React.useState("");
  const [accounts, setAccounts] = React.useState<LinkedAccountRow[]>([]);
  const [accountsLoaded, setAccountsLoaded] = React.useState(false);
  const [sessions, setSessions] = React.useState<AuthSessionRow[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = React.useState(false);
  const [savePending, setSavePending] = React.useState(false);
  const [spotifyPending, setSpotifyPending] = React.useState(false);
  const [googlePending, setGooglePending] = React.useState(false);
  const [revokeOthersPending, setRevokeOthersPending] = React.useState(false);
  const [revokingSessionId, setRevokingSessionId] = React.useState<
    string | null
  >(null);

  const loadSessions = React.useCallback(async () => {
    const res = await authClient.listSessions();
    if (!res.error && Array.isArray(res.data)) {
      const rows = [...(res.data as AuthSessionRow[])].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setSessions(rows);
    }
    setSessionsLoaded(true);
  }, []);

  React.useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  React.useEffect(() => {
    let cancelled = false;
    void authClient.listAccounts().then((res) => {
      if (cancelled || res.error || !res.data) return;
      setAccounts(res.data as LinkedAccountRow[]);
      setAccountsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const spotifyAccount = accounts.find((a) => a.providerId === "spotify");
  const googleAccount = accounts.find((a) => a.providerId === "google");

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Display name cannot be empty.");
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX) {
      toast.error(
        `Display name must be at most ${DISPLAY_NAME_MAX} characters.`,
      );
      return;
    }

    setSavePending(true);
    try {
      const { error } = await authClient.updateUser({
        name: trimmed,
      });
      if (error) {
        toast.error(error.message ?? "Could not update display name.");
        return;
      }
      toast.success("Display name updated.");
      await refetchSession();
      router.refresh();
    } finally {
      setSavePending(false);
    }
  }

  async function handleReconnectSpotify() {
    setSpotifyPending(true);
    try {
      const { error } = await authClient.linkSocial({
        provider: "spotify",
        callbackURL: "/user/account",
      });
      if (error) {
        toast.error(error.message ?? "Could not start Spotify authorization.");
      }
    } finally {
      setSpotifyPending(false);
    }
  }

  async function handleGoogleLinkOrReconnect() {
    setGooglePending(true);
    try {
      const { error } = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/user/account",
      });
      if (error) {
        toast.error(error.message ?? "Could not start Google authorization.");
      }
    } finally {
      setGooglePending(false);
    }
  }

  async function handleRevokeOtherSessions() {
    setRevokeOthersPending(true);
    try {
      const { error } = await authClient.revokeOtherSessions();
      if (error) {
        toast.error(error.message ?? "Could not sign out other sessions.");
        return;
      }
      toast.success("Signed out other sessions.");
      await refetchSession();
      await loadSessions();
      router.refresh();
    } finally {
      setRevokeOthersPending(false);
    }
  }

  async function handleRevokeSession(row: AuthSessionRow) {
    const isCurrent = Boolean(currentSessionId && row.id === currentSessionId);
    const msg = isCurrent
      ? "Sign out this browser? You will need to log in again."
      : "Sign out this session? That device will be logged out.";
    if (typeof window !== "undefined" && !window.confirm(msg)) return;

    setRevokingSessionId(row.id);
    try {
      await revokeSessionMutation.mutateAsync({ sessionId: row.id });
      toast.success(isCurrent ? "Signed out." : "Session signed out.");
      await loadSessions();
      if (isCurrent) {
        void authClient.signOut();
        void utils.invalidate();
        router.push("/auth/login");
        return;
      }
      await refetchSession();
      router.refresh();
    } finally {
      setRevokingSessionId(null);
    }
  }

  if (!user) {
    return null;
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dirty = name.trim() !== user.name.trim();

  const otherSessionCount = currentSessionId
    ? sessions.filter((s) => s.id !== currentSessionId).length
    : sessions.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Profile details and Spotify access for this app.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <Avatar className="size-14 rounded-lg">
            <AvatarImage src={user.image ?? undefined} alt="" />
            <AvatarFallback className="rounded-lg text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="leading-snug">{user.name}</CardTitle>
            <CardDescription className="break-all">
              {user.email}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSaveName}
            className="flex max-w-md flex-col gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                name="display-name"
                autoComplete="nickname"
                maxLength={DISPLAY_NAME_MAX}
                value={name}
                onChange={(ev) => setName(ev.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Shown in the app sidebar and menus. Your Spotify login email
                stays the same.
              </p>
            </div>
            <Button
              type="submit"
              className="gap-2"
              disabled={savePending || !dirty}
            >
              {savePending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save display name"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spotify subscription</CardTitle>
          <CardDescription>
            Plan type from Spotify&apos;s API when linked. Opens in sync when
            you load this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {spotifyPlanQuery.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Loading subscription…
            </p>
          ) : spotifyPlanQuery.isError ? (
            <p className="text-muted-foreground text-sm">
              Could not load subscription info.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-medium">
                  {spotifyPlanQuery.data?.label ?? "—"}
                </span>
                {spotifyPlanQuery.data?.source === "live" ? (
                  <Badge variant="secondary">Live</Badge>
                ) : (
                  <Badge variant="outline">Cached</Badge>
                )}
              </div>
              {spotifyPlanQuery.data?.source === "cached" ? (
                <p className="text-muted-foreground text-xs">
                  Spotify couldn&apos;t be reached—showing the last known plan
                  from this app.{" "}
                  {spotifyAccount
                    ? "Try reconnecting Spotify below if this looks wrong."
                    : "Link Spotify below to refresh."}
                </p>
              ) : null}
              {spotifyPlanQuery.data?.product ? (
                <p className="text-muted-foreground font-mono text-xs">
                  API value: {spotifyPlanQuery.data.product}
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Active sessions</CardTitle>
            <CardDescription>
              Devices and browsers currently signed in to this account.
            </CardDescription>
          </div>
          {sessionsLoaded && otherSessionCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              disabled={revokeOthersPending}
              onClick={() => void handleRevokeOtherSessions()}
            >
              {revokeOthersPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Signing out…
                </>
              ) : (
                `Sign out other sessions (${otherSessionCount})`
              )}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {!sessionsLoaded ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Loading sessions…
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No active sessions found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[1%]"> </TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Started
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Expires
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                  <TableHead className="max-w-[18rem] min-w-[10rem]">
                    Browser / device
                  </TableHead>
                  <TableHead className="w-[1%] text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((row) => {
                  const isCurrent = Boolean(
                    currentSessionId && row.id === currentSessionId,
                  );
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="align-top">
                        {isCurrent ? (
                          <Badge variant="default" className="text-[10px]">
                            This session
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        {formatDateTime(row.updatedAt)}
                      </TableCell>
                      <TableCell className="hidden align-top sm:table-cell">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="hidden align-top md:table-cell">
                        {formatDateTime(row.expiresAt)}
                      </TableCell>
                      <TableCell className="hidden align-top font-mono text-[11px] lg:table-cell">
                        {row.ipAddress?.trim() || "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[18rem] align-top text-[11px] leading-snug wrap-break-word whitespace-normal"
                        title={row.userAgent ?? undefined}
                      >
                        {shortenUa(row.userAgent, 96)}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <Button
                          type="button"
                          variant="ghostDestructive"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={revokingSessionId !== null}
                          aria-label={
                            isCurrent
                              ? "Sign out this browser"
                              : "Sign out this session"
                          }
                          title={
                            isCurrent
                              ? "Sign out this browser"
                              : "Sign out this session"
                          }
                          onClick={() => void handleRevokeSession(row)}
                        >
                          {revokingSessionId === row.id ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {googleAuthEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Google</CardTitle>
            <CardDescription>
              Link Google once while signed in here to use &quot;Continue with
              Google&quot; on the login page. Sign-in with Google is only allowed
              after this link exists (same Google account).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {accountsLoaded ? (
              googleAccount ? (
                <p className="text-muted-foreground text-sm">
                  Google is linked (ID{" "}
                  <span className="text-foreground font-mono text-xs">
                    {googleAccount.accountId}
                  </span>
                  ). Reconnect to refresh tokens.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Google is not linked yet—link it to enable Google on the login
                  screen.
                </p>
              )
            ) : (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2Icon className="size-4 animate-spin" />
                Loading linked accounts…
              </p>
            )}
            <div>
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={googlePending}
                onClick={() => void handleGoogleLinkOrReconnect()}
              >
                {googlePending ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Opening Google…
                  </>
                ) : googleAccount ? (
                  "Reconnect with Google"
                ) : (
                  "Link Google"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Spotify</CardTitle>
          <CardDescription>
            Reauthorize if listening history or playback controls stopped
            working—this refreshes your Spotify tokens without signing you out
            of the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {accountsLoaded ? (
            spotifyAccount ? (
              <p className="text-muted-foreground text-sm">
                Spotify is linked to this account (ID{" "}
                <span className="text-foreground font-mono text-xs">
                  {spotifyAccount.accountId}
                </span>
                ).
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No Spotify provider linked yet—use the button below to connect.
              </p>
            )
          ) : (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Loading linked accounts…
            </p>
          )}
          <div>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={spotifyPending}
              onClick={() => void handleReconnectSpotify()}
            >
              {spotifyPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Opening Spotify…
                </>
              ) : (
                "Reconnect with Spotify"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
