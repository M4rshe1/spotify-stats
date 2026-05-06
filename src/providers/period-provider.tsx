"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { periods, type Period } from "@/lib/consts/periods";
import { cn } from "@/lib/utils";
import { MAX_PINNED_PERIODS } from "@/lib/consts/favorite-periods";
import { userSettings } from "@/lib/consts/settings";
import { api, type RouterOutputs } from "@/trpc/react";
import { authClient } from "@/server/better-auth/client";

type PreferredSnapshot = RouterOutputs["user"]["getPreferredPeriod"];

type PeriodContextValue = {
  selectedPeriod: Period;
  openPeriodSelectDialog: () => void;
  selectPeriod: (period: Period) => void;
  headerFavoritePeriods: Period[];
};

const defaultPeriod = userSettings.PREFERRED_PERIOD.defaultValue as Period;
const periodOrder = Object.keys(periods) as Period[];
const selectablePeriods = periodOrder.filter(
  (period): period is Exclude<Period, "custom"> => period !== "custom",
);
const periodSet = new Set<Period>(periodOrder);

const isPeriod = (value: unknown): value is Period =>
  typeof value === "string" && periodSet.has(value as Period);

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(defaultPeriod);

  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);

  const utils = api.useUtils();

  const preferredPeriodQuery = api.user.getPreferredPeriod.useQuery(undefined, {
    staleTime: 60_000,
  });

  const setPreferredPeriodMutation = api.user.setPreferredPeriod.useMutation({
    onMutate: async (input) => {
      await utils.user.getPreferredPeriod.cancel();
      const prev: PreferredSnapshot | undefined =
        utils.user.getPreferredPeriod.getData();
      if (prev) {
        utils.user.getPreferredPeriod.setData(undefined, {
          ...prev,
          period: input.period,
          ...(input.customStart !== undefined
            ? { customStart: input.customStart }
            : {}),
          ...(input.customEnd !== undefined ? { customEnd: input.customEnd } : {}),
        });
      }
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      const prev = ctx?.prev;
      if (prev !== undefined) {
        utils.user.getPreferredPeriod.setData(undefined, prev);
      }
    },
    onSettled: () => {
      void utils.user.getPreferredPeriod.invalidate();
    },
  });

  const toggleFavoritePeriodMutation =
    api.user.toggleFavoritePeriod.useMutation({
      onMutate: async ({ period }) => {
        await utils.user.getPreferredPeriod.cancel();
        const prev: PreferredSnapshot | undefined =
          utils.user.getPreferredPeriod.getData();
        if (!prev) return { prev };

        const fav = prev.favoritePeriods ?? [];
        const isRemoving = fav.includes(period);
        const next = isRemoving
          ? fav.filter((p) => p !== period)
          : [...fav, period];

        utils.user.getPreferredPeriod.setData(undefined, {
          ...prev,
          favoritePeriods: next,
        });
        return { prev };
      },
      onError: (err, _input, ctx) => {
        const prev = ctx?.prev;
        if (prev !== undefined) {
          utils.user.getPreferredPeriod.setData(undefined, prev);
        }
        toast.error(err.message ?? "Could not update favorites");
      },
      onSettled: () => {
        void utils.user.getPreferredPeriod.invalidate();
      },
    });

  useEffect(() => {
    const nextPeriod = preferredPeriodQuery.data?.period;
    if (isPeriod(nextPeriod)) {
      setSelectedPeriod(nextPeriod);
    }
  }, [preferredPeriodQuery.data]);

  const favoritePeriodsOrdered = useMemo(() => {
    const fav = preferredPeriodQuery.data?.favoritePeriods ?? [];
    const rank = (p: Period) => periodOrder.indexOf(p);
    return [...fav].sort((a, b) => rank(a) - rank(b));
  }, [preferredPeriodQuery.data?.favoritePeriods]);

  const headerFavoritePeriods = useMemo(
    () => favoritePeriodsOrdered.slice(0, MAX_PINNED_PERIODS),
    [favoritePeriodsOrdered],
  );

  const favoriteSet = useMemo(
    () => new Set(preferredPeriodQuery.data?.favoritePeriods ?? []),
    [preferredPeriodQuery.data?.favoritePeriods],
  );

  const openPeriodSelectDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const applyPreferredPeriod = useCallback(
    (period: Period, options?: { closeDialog?: boolean }) => {
      if (!isPeriod(period)) return;
      setSelectedPeriod(period);
      setPreferredPeriodMutation.mutate({ period });
      if (options?.closeDialog) setIsDialogOpen(false);
    },
    [setPreferredPeriodMutation],
  );

  const handlePeriodChange = useCallback(
    (period: string) => {
      if (!isPeriod(period)) return;
      applyPreferredPeriod(period, { closeDialog: true });
    },
    [applyPreferredPeriod],
  );

  const selectPeriod = useCallback(
    (period: Period) => {
      applyPreferredPeriod(period);
    },
    [applyPreferredPeriod],
  );

  const handleToggleFavorite = useCallback(
    (period: Period, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const fav =
        utils.user.getPreferredPeriod.getData()?.favoritePeriods ?? [];
      const isRemoving = fav.includes(period);
      if (!isRemoving && fav.length >= MAX_PINNED_PERIODS) {
        toast.error(`You can pin at most ${MAX_PINNED_PERIODS} periods`);
        return;
      }

      toggleFavoritePeriodMutation.mutate({ period });
    },
    [toggleFavoritePeriodMutation, utils.user.getPreferredPeriod],
  );

  const value = useMemo(
    () => ({
      selectedPeriod,
      openPeriodSelectDialog,
      selectPeriod,
      headerFavoritePeriods,
    }),
    [
      headerFavoritePeriods,
      openPeriodSelectDialog,
      selectPeriod,
      selectedPeriod,
    ],
  );

  return (
    <PeriodContext.Provider value={value}>
      {children}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select period</DialogTitle>
            <DialogDescription>
              Choose the date range used across the app. Sign in to pin up to{" "}
              {MAX_PINNED_PERIODS} periods (shown in the header).
            </DialogDescription>
          </DialogHeader>
          {favoritePeriodsOrdered.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-wide">
                Favorites
              </p>
              <div className="flex flex-wrap gap-2">
                {favoritePeriodsOrdered.map((period) => (
                  <Button
                    key={period}
                    type="button"
                    size="sm"
                    variant={selectedPeriod === period ? "default" : "outline"}
                    className="h-8"
                    onClick={() => handlePeriodChange(period)}
                  >
                    {periods[period].label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-wide">
              All periods
            </p>
            <ul className="max-h-[min(50vh,20rem)] space-y-0.5 overflow-y-auto overscroll-contain border border-border px-1 py-1 ring-foreground/10">
              {selectablePeriods.map((period) => {
                const starred = favoriteSet.has(period);
                return (
                  <li key={period} className="flex items-stretch gap-0.5">
                    <Button
                      type="button"
                      variant={
                        selectedPeriod === period ? "secondary" : "ghost"
                      }
                      className="h-auto min-h-8 flex-1 justify-start rounded-none px-2 py-1.5 text-left font-normal"
                      onClick={() => handlePeriodChange(period)}
                    >
                      {periods[period].label}
                    </Button>
                    {isSignedIn ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 shrink-0 rounded-none text-muted-foreground hover:text-amber-600"
                        aria-label={
                          starred
                            ? `Remove ${periods[period].label} from favorites`
                            : `Add ${periods[period].label} to favorites`
                        }
                        onClick={(e) => handleToggleFavorite(period, e)}
                      >
                        <StarIcon
                          className={cn(
                            "size-4",
                            starred && "fill-amber-500 text-amber-600",
                          )}
                        />
                      </Button>
                    ) : (
                      <div className="w-9 shrink-0" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
}
