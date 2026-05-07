"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { endOfDay, startOfDay } from "date-fns";
import { StarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
const periodRank = new Map(periodOrder.map((period, index) => [period, index]));
const emptyFavoritePeriods: Period[] = [];

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
    enabled: isSignedIn,
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
          ...(input.customEnd !== undefined
            ? { customEnd: input.customEnd }
            : {}),
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
  }, [preferredPeriodQuery.data?.period]);

  const favoritePeriodsOrdered = useMemo(() => {
    const fav = preferredPeriodQuery.data?.favoritePeriods ?? emptyFavoritePeriods;
    return [...fav].sort(
      (a, b) => (periodRank.get(a) ?? 0) - (periodRank.get(b) ?? 0),
    );
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
    (
      period: Period,
      options?: {
        closeDialog?: boolean;
        customStart?: Date | null;
        customEnd?: Date | null;
      },
    ) => {
      if (!isPeriod(period)) return;
      setSelectedPeriod(period);
      setPreferredPeriodMutation.mutate({
        period,
        customStart: options?.customStart,
        customEnd: options?.customEnd,
      });
      if (options?.closeDialog) setIsDialogOpen(false);
    },
    [setPreferredPeriodMutation],
  );

  const handlePeriodChange = useCallback((period: string) => {
    if (!isPeriod(period)) return;
    applyPreferredPeriod(period, { closeDialog: true });
  }, [applyPreferredPeriod]);

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
      {isDialogOpen ? (
        <PeriodSelectDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          selectedPeriod={selectedPeriod}
          isSignedIn={isSignedIn}
          favoritePeriodsOrdered={favoritePeriodsOrdered}
          favoriteSet={favoriteSet}
          customStart={preferredPeriodQuery.data?.customStart ?? null}
          customEnd={preferredPeriodQuery.data?.customEnd ?? null}
          onPresetSelect={handlePeriodChange}
          onToggleFavorite={handleToggleFavorite}
          onApplyCustomRange={(range) =>
            applyPreferredPeriod("custom", {
              closeDialog: true,
              customStart: startOfDay(range.from),
              customEnd: endOfDay(range.to),
            })
          }
        />
      ) : null}
    </PeriodContext.Provider>
  );
}

type PeriodSelectDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPeriod: Period;
  isSignedIn: boolean;
  favoritePeriodsOrdered: Period[];
  favoriteSet: Set<Period>;
  customStart: Date | null;
  customEnd: Date | null;
  onPresetSelect: (period: string) => void;
  onToggleFavorite: (period: Period, e: React.MouseEvent) => void;
  onApplyCustomRange: (range: { from: Date; to: Date }) => void;
};

const PeriodSelectDialog = memo(function PeriodSelectDialog({
  isOpen,
  onOpenChange,
  selectedPeriod,
  isSignedIn,
  favoritePeriodsOrdered,
  favoriteSet,
  customStart,
  customEnd,
  onPresetSelect,
  onToggleFavorite,
  onApplyCustomRange,
}: PeriodSelectDialogProps) {
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    if (customStart && customEnd) {
      setCustomRange({
        from: new Date(customStart),
        to: new Date(customEnd),
      });
      return;
    }
    setCustomRange(undefined);
  }, [customEnd, customStart, isOpen]);

  const handleApply = useCallback(() => {
    if (!customRange?.from || !customRange?.to) {
      toast.error("Pick a start and end date first");
      return;
    }
    onApplyCustomRange({
      from: customRange.from,
      to: customRange.to,
    });
  }, [customRange, onApplyCustomRange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[52rem]">
        <div className="grid h-[min(80vh,36rem)] min-h-[30rem] grid-cols-1 md:grid-cols-[16rem_1fr]">
          <div className="border-border flex min-h-0 flex-col border-b p-4 md:border-r md:border-b-0">
            <p className="text-sm font-medium">Common ranges</p>
            {isSignedIn ? (
              <div className="mt-2 space-y-1">
                <p className="text-muted-foreground text-xs">
                  Favorites: {favoritePeriodsOrdered.length}/{MAX_PINNED_PERIODS}
                </p>
              </div>
            ) : null}
            <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {selectablePeriods.map((period) => {
                const starred = favoriteSet.has(period);
                return (
                  <li key={period} className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant={selectedPeriod === period ? "secondary" : "ghost"}
                      className="h-9 flex-1 justify-start px-2.5 font-normal"
                      onClick={() => onPresetSelect(period)}
                    >
                      {periods[period].label}
                    </Button>
                    {isSignedIn ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground size-8 shrink-0 hover:text-amber-600"
                        aria-label={
                          starred
                            ? `Remove ${periods[period].label} from favorites`
                            : `Add ${periods[period].label} to favorites`
                        }
                        onClick={(e) => onToggleFavorite(period, e)}
                      >
                        <StarIcon
                          className={cn(
                            "size-4",
                            starred && "fill-amber-500 text-amber-600",
                          )}
                        />
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex min-h-0 flex-col p-4">
            <p className="text-base font-medium">Custom date range</p>
            <div className="mt-3 flex-1 p-1">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={1}
                className="mx-auto w-full max-w-[min(100%,24rem)] [--cell-size:clamp(1.85rem,1.6vw,2.1rem)]"
              />
            </div>
            <div className="mt-auto pt-4">
              <Button
                type="button"
                className="w-full md:w-auto"
                disabled={!customRange?.from || !customRange?.to}
                onClick={handleApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
}
