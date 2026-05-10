"use client";

import * as React from "react";
import {
  Ban,
  CircleUserRound,
  Loader2Icon,
  MoreHorizontal,
  Shield,
  UserMinus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/server/better-auth/client";

const PAGE_SIZE = 25;

type ListedUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
  createdAt?: Date | string;
};

function formatDateTime(value: Date | string | null | undefined) {
  if (value == null) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function AdminUsersPageClient() {
  const { data: sessionData, refetch: refetchSession } =
    authClient.useSession();

  const currentUserId = sessionData?.user?.id;
  const sessionRecord = sessionData?.session as
    | { impersonatedBy?: string | null }
    | undefined;
  const impersonatedBy = sessionRecord?.impersonatedBy;

  const [users, setUsers] = React.useState<ListedUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchApplied, setSearchApplied] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [stopImpersonatingPending, setStopImpersonatingPending] =
    React.useState(false);

  const [banTarget, setBanTarget] = React.useState<ListedUser | null>(null);
  const [banReason, setBanReason] = React.useState("");
  const [banPending, setBanPending] = React.useState(false);

  const [impersonateTarget, setImpersonateTarget] =
    React.useState<ListedUser | null>(null);
  const [impersonatePending, setImpersonatePending] = React.useState(false);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await authClient.admin.listUsers({
        query: {
          limit: PAGE_SIZE,
          offset,
          sortBy: "createdAt",
          sortDirection: "desc",
          ...(searchApplied.trim()
            ? {
                searchValue: searchApplied.trim(),
                searchField: "email" as const,
                searchOperator: "contains" as const,
              }
            : {}),
        },
      });
      if (res.error) {
        toast.error(res.error.message ?? "Could not load users.");
        setUsers([]);
        setTotal(0);
        return;
      }
      const body = res.data as
        | { users?: ListedUser[]; total?: number }
        | undefined;
      setUsers(body?.users ?? []);
      setTotal(body?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [offset, searchApplied]);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setSearchApplied(searchInput);
  }

  async function handleStopImpersonating() {
    setStopImpersonatingPending(true);
    try {
      const res = await authClient.admin.stopImpersonating();
      if (res.error) {
        toast.error(res.error.message ?? "Could not stop impersonating.");
        return;
      }
      toast.success("Returned to your account.");
      await refetchSession();
      window.location.assign("/admin/users");
    } finally {
      setStopImpersonatingPending(false);
    }
  }

  async function handleUnban(user: ListedUser) {
    const res = await authClient.admin.unbanUser({
      userId: user.id,
    });
    if (res.error) {
      toast.error(res.error.message ?? "Could not unban user.");
      return;
    }
    toast.success(`${user.email} is unbanned.`);
    void loadUsers();
  }

  async function handleBanConfirm() {
    if (!banTarget) return;
    setBanPending(true);
    try {
      const res = await authClient.admin.banUser({
        userId: banTarget.id,
        ...(banReason.trim() ? { banReason: banReason.trim() } : {}),
      });
      if (res.error) {
        toast.error(res.error.message ?? "Could not ban user.");
        return;
      }
      toast.success(`${banTarget.email} has been banned.`);
      setBanTarget(null);
      setBanReason("");
      void loadUsers();
    } finally {
      setBanPending(false);
    }
  }

  async function handleImpersonateConfirm() {
    if (!impersonateTarget) return;
    setImpersonatePending(true);
    try {
      const res = await authClient.admin.impersonateUser({
        userId: impersonateTarget.id,
      });
      if (res.error) {
        toast.error(res.error.message ?? "Could not impersonate user.");
        return;
      }
      toast.success(`Now viewing as ${impersonateTarget.email}.`);
      setImpersonateTarget(null);
      window.location.assign("/");
    } finally {
      setImpersonatePending(false);
    }
  }

  async function handleRoleChange(user: ListedUser, nextRole: string) {
    if (!nextRole || nextRole === user.role) return;
    const res = await authClient.admin.setRole({
      userId: user.id,
      role: nextRole as "admin" | "user",
    });
    if (res.error) {
      toast.error(res.error.message ?? "Could not update role.");
      void loadUsers();
      return;
    }
    toast.success(`Role updated to ${nextRole}.`);
    void loadUsers();
    if (user.id === currentUserId && nextRole !== "admin") {
      toast.message("You are no longer an admin.", {
        description: "You will be signed out or lose admin access on refresh.",
      });
      await refetchSession();
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-4">
      {impersonatedBy ? (
        <Alert variant="default" className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <AlertTitle className="text-sm font-medium">
              Impersonation active
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
              You are signed in as another user. Stop impersonating to return to
              your admin session.
            </AlertDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={stopImpersonatingPending}
            onClick={() => void handleStopImpersonating()}
          >
            {stopImpersonatingPending ? (
              <>
                <Loader2Icon className="mr-1 size-3.5 animate-spin" />
                Stopping…
              </>
            ) : (
              <>
                <UserMinus className="mr-1 size-3.5" />
                Stop impersonating
              </>
            )}
          </Button>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Users</CardTitle>
          <CardDescription>
            Search accounts, assign roles, ban access, or sign in as a user for
            support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex max-w-xl flex-wrap items-end gap-2"
          >
            <div className="min-w-[12rem] flex-1 space-y-1.5">
              <Label htmlFor="admin-users-search">Search by email</Label>
              <Input
                id="admin-users-search"
                placeholder="contains…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {searchApplied ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchInput("");
                  setSearchApplied("");
                  setOffset(0);
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>

          <div className="rounded-none border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[3rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2Icon className="mx-auto size-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No users match this query.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentUserId;
                    const banned = u.banned === true;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8 rounded-md">
                              <AvatarImage src={u.image ?? undefined} />
                              <AvatarFallback className="rounded-md">
                                {(u.name || u.email)?.slice(0, 2)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {u.name}
                              </div>
                              <div className="truncate text-muted-foreground text-xs">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          {isSelf ? (
                            <Badge variant="outline" className="capitalize">
                              {u.role ?? "user"}
                            </Badge>
                          ) : (
                            <Select
                              value={(u.role ?? "user").toLowerCase()}
                              onValueChange={(v) =>
                                void handleRoleChange(u, v)
                              }
                            >
                              <SelectTrigger className="w-[7.25rem]" size="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">user</SelectItem>
                                <SelectItem value="admin">admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          {banned ? (
                            <div className="space-y-0.5">
                              <Badge variant="destructive">Banned</Badge>
                              {u.banReason ? (
                                <div className="max-w-[14rem] truncate text-muted-foreground text-xs">
                                  {u.banReason}
                                </div>
                              ) : null}
                              {u.banExpires ? (
                                <div className="text-muted-foreground text-xs">
                                  Until {formatDateTime(u.banExpires)}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs align-middle">
                          {formatDateTime(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label="User actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {banned ? (
                                <DropdownMenuItem
                                  disabled={isSelf}
                                  onSelect={() => void handleUnban(u)}
                                >
                                  <Shield className="text-muted-foreground" />
                                  Unban
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  disabled={isSelf}
                                  onSelect={() => {
                                    setBanTarget(u);
                                    setBanReason("");
                                  }}
                                >
                                  <Ban className="text-muted-foreground" />
                                  Ban…
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isSelf}
                                onSelect={() => setImpersonateTarget(u)}
                              >
                                <CircleUserRound className="text-muted-foreground" />
                                Impersonate…
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {total > PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
              <span>
                {total} user{total === 1 ? "" : "s"} · page {currentPage} of{" "}
                {pageCount}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total || loading}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={banTarget !== null} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Ban {banTarget?.email}</DialogTitle>
            <DialogDescription>
              They won’t be able to sign in until the ban is removed or expires.
              You cannot ban your own account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Input
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Abuse of imports"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBanTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={banPending}
              onClick={() => void handleBanConfirm()}
            >
              {banPending ? (
                <>
                  <Loader2Icon className="mr-1 size-4 animate-spin" />
                  Banning…
                </>
              ) : (
                "Ban user"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={impersonateTarget !== null}
        onOpenChange={(o) => !o && setImpersonateTarget(null)}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Impersonate {impersonateTarget?.email}?</DialogTitle>
            <DialogDescription>
              You will be redirected to the app as this user. Use “Stop
              impersonating” from this page or your account menu when finished
              (if available).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImpersonateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={impersonatePending}
              onClick={() => void handleImpersonateConfirm()}
            >
              {impersonatePending ? (
                <>
                  <Loader2Icon className="mr-1 size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <UserRound className="mr-1 size-4" />
                  Impersonate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
