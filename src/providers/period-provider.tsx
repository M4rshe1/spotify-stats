"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { endOfDay, startOfDay } from "date-fns";
import { toast } from "sonner";

import { type Period, type ProviderPeriod } from "@/lib/consts/periods";
import { MAX_PINNED_PERIODS } from "@/lib/consts/favorite-periods";
import {
  defaultProviderPeriod,
  isPeriod,
  periodRank,
  preferredSnapshotBase,
  snapshotToProviderPeriod,
  type PreferredPeriodSnapshot,
} from "@/lib/preferred-period";
import { PeriodSelectDialog } from "@/providers/period-select-dialog";
import { api } from "@/trpc/react";
import { authClient } from "@/server/better-auth/client";

export type { PreferredPeriodSnapshot };

export type PeriodContextValue = {
  selectedPeriod: ProviderPeriod;
  openPeriodSelectDialog: () => void;
  selectPeriod: (period: ProviderPeriod) => void;
  headerFavoritePeriods: Period[];
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

type PeriodProviderProps = {
  children: React.ReactNode;
  initialPreferredSnapshot?: PreferredPeriodSnapshot;
};

export function PeriodProvider({
  children,
  initialPreferredSnapshot,
}: PeriodProviderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);

  const utils = api.useUtils();

  const preferredPeriodQuery = api.user.getPreferredPeriod.useQuery(undefined, {
    staleTime: 60_000,
  });

  const preferredSnapshot =
    preferredPeriodQuery.data ?? initialPreferredSnapshot ?? null;

  const snapshotPeriodKey = preferredSnapshot?.period;
  const snapshotCustomStartMs =
    preferredSnapshot?.customStart?.getTime() ?? null;
  const snapshotCustomEndMs =
    preferredSnapshot?.customEnd?.getTime() ?? null;

  const selectedPeriod = useMemo(() => {
    const snapshot =
      preferredPeriodQuery.data ?? initialPreferredSnapshot ?? null;
    if (!snapshot) return defaultProviderPeriod();
    return snapshotToProviderPeriod(snapshot) ?? defaultProviderPeriod();
  }, [
    snapshotPeriodKey,
    snapshotCustomStartMs,
    snapshotCustomEndMs,
  ]);

  const setPreferredPeriodMutation = api.user.setPreferredPeriod.useMutation({
    onMutate: async (input) => {
      await utils.user.getPreferredPeriod.cancel();
      const prev = utils.user.getPreferredPeriod.getData();
      utils.user.getPreferredPeriod.setData(undefined, {
        ...preferredSnapshotBase(prev, initialPreferredSnapshot),
        period: input.period,
        ...(input.customStart !== undefined ? { customStart: input.customStart } : {}),
        ...(input.customEnd !== undefined ? { customEnd: input.customEnd } : {}),
      });
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
        const prev = utils.user.getPreferredPeriod.getData();
        const base = preferredSnapshotBase(prev, initialPreferredSnapshot);
        const fav = base.favoritePeriods ?? [];
        const isRemoving = fav.includes(period);
        const next = isRemoving ? fav.filter((p) => p !== period) : [...fav, period];

        utils.user.getPreferredPeriod.setData(undefined, {
          ...base,
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

  const favoritePeriodsOrdered = useMemo(() => {
    const fav = preferredPeriodQuery.data?.favoritePeriods ?? [];
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

      if (period === "custom") {
        const from = options?.customStart ?? null;
        const end = options?.customEnd ?? null;
        if (
          !from ||
          !end ||
          Number.isNaN(from.getTime()) ||
          Number.isNaN(end.getTime())
        ) {
          return;
        }
      }

      setPreferredPeriodMutation.mutate({
        period,
        customStart: options?.customStart,
        customEnd: options?.customEnd,
      });
      if (options?.closeDialog) setIsDialogOpen(false);
    },
    [setPreferredPeriodMutation],
  );

  const handlePeriodChange = useCallback(
    (period: Exclude<Period, "custom">) => {
      applyPreferredPeriod(period, { closeDialog: true });
    },
    [applyPreferredPeriod],
  );

  const selectPeriod = useCallback(
    (period: ProviderPeriod) => {
      applyPreferredPeriod(period.type, {
        customStart: period.type === "custom" ? period.from : undefined,
        customEnd: period.type === "custom" ? period.end : undefined,
      });
    },
    [applyPreferredPeriod],
  );

  const handleToggleFavorite = useCallback(
    (period: Period, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const fav =
        preferredSnapshotBase(
          utils.user.getPreferredPeriod.getData(),
          initialPreferredSnapshot,
        ).favoritePeriods ?? [];
      const isRemoving = fav.includes(period);
      if (!isRemoving && fav.length >= MAX_PINNED_PERIODS) {
        toast.error(`You can pin at most ${MAX_PINNED_PERIODS} periods`);
        return;
      }

      toggleFavoritePeriodMutation.mutate({ period });
    },
    [
      initialPreferredSnapshot,
      toggleFavoritePeriodMutation,
      utils.user.getPreferredPeriod,
    ],
  );

  const applyPreferredPeriodRef = useRef(applyPreferredPeriod);
  applyPreferredPeriodRef.current = applyPreferredPeriod;

  const handlePeriodChangeRef = useRef(handlePeriodChange);
  handlePeriodChangeRef.current = handlePeriodChange;

  const handleToggleFavoriteRef = useRef(handleToggleFavorite);
  handleToggleFavoriteRef.current = handleToggleFavorite;

  const onApplyCustomRange = useCallback((range: { from: Date; to: Date }) => {
    applyPreferredPeriodRef.current("custom", {
      closeDialog: true,
      customStart: startOfDay(range.from),
      customEnd: endOfDay(range.to),
    });
  }, []);

  const onPresetSelectStable = useCallback(
    (period: Exclude<Period, "custom">) => {
      handlePeriodChangeRef.current(period);
    },
    [],
  );

  const onToggleFavoriteStable = useCallback(
    (period: Exclude<Period, "custom">, e: React.MouseEvent) => {
      handleToggleFavoriteRef.current(period, e);
    },
    [],
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
          onPresetSelect={onPresetSelectStable}
          onToggleFavorite={onToggleFavoriteStable}
          onApplyCustomRange={onApplyCustomRange}
        />
      ) : null}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
}
