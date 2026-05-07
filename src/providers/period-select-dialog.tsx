"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { StarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { periods, type Period } from "@/lib/consts/periods";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { cn } from "@/lib/utils";
import { MAX_PINNED_PERIODS } from "@/lib/consts/favorite-periods";
import { selectablePeriods } from "@/lib/preferred-period";

const RANGE_CALENDAR_CLASS =
  "mx-auto w-full max-w-[min(100%,24rem)] [--cell-size:clamp(1.85rem,1.6vw,2.1rem)]";

export type PeriodSelectDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPeriod: ProviderPeriod;
  isSignedIn: boolean;
  favoritePeriodsOrdered: Period[];
  favoriteSet: Set<Period>;
  customStart: Date | null;
  customEnd: Date | null;
  onPresetSelect: (period: Exclude<Period, "custom">) => void;
  onToggleFavorite: (
    period: Exclude<Period, "custom">,
    e: MouseEvent,
  ) => void;
  onApplyCustomRange: (range: { from: Date; to: Date }) => void;
};

function favoriteSetsEqual(a: Set<Period>, b: Set<Period>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

function periodsArraysEqual(a: readonly Period[], b: readonly Period[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function selectedPeriodsEqual(a: ProviderPeriod, b: ProviderPeriod): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "custom" && b.type === "custom") {
    return (
      a.from.getTime() === b.from.getTime() &&
      a.end.getTime() === b.end.getTime()
    );
  }
  return true;
}

function customBoundsEqual(
  aStart: Date | null,
  aEnd: Date | null,
  bStart: Date | null,
  bEnd: Date | null,
): boolean {
  const t = (d: Date | null) => d?.getTime() ?? null;
  return t(aStart) === t(bStart) && t(aEnd) === t(bEnd);
}

function periodSelectDialogPropsEqual(
  prev: PeriodSelectDialogProps,
  next: PeriodSelectDialogProps,
): boolean {
  return (
    prev.isOpen === next.isOpen &&
    prev.isSignedIn === next.isSignedIn &&
    selectedPeriodsEqual(prev.selectedPeriod, next.selectedPeriod) &&
    periodsArraysEqual(prev.favoritePeriodsOrdered, next.favoritePeriodsOrdered) &&
    favoriteSetsEqual(prev.favoriteSet, next.favoriteSet) &&
    customBoundsEqual(prev.customStart, prev.customEnd, next.customStart, next.customEnd) &&
    prev.onOpenChange === next.onOpenChange &&
    prev.onPresetSelect === next.onPresetSelect &&
    prev.onToggleFavorite === next.onToggleFavorite &&
    prev.onApplyCustomRange === next.onApplyCustomRange
  );
}

const RangeCalendar = memo(function RangeCalendar({
  selected,
  onSelect,
}: {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}) {
  return (
    <Calendar
      mode="range"
      selected={selected}
      onSelect={onSelect}
      numberOfMonths={1}
      className={RANGE_CALENDAR_CLASS}
    />
  );
});

type PresetRowProps = {
  period: Exclude<Period, "custom">;
  selected: boolean;
  starred: boolean;
  isSignedIn: boolean;
  onSelect: (period: Exclude<Period, "custom">) => void;
  onToggleFavorite: (period: Exclude<Period, "custom">, e: MouseEvent) => void;
};

const PresetRow = memo(function PresetRow({
  period,
  selected,
  starred,
  isSignedIn,
  onSelect,
  onToggleFavorite,
}: PresetRowProps) {
  const handleClick = useCallback(() => {
    onSelect(period);
  }, [onSelect, period]);

  const handleStarClick = useCallback(
    (e: MouseEvent) => {
      onToggleFavorite(period, e);
    },
    [onToggleFavorite, period],
  );

  return (
    <li className="flex items-center gap-1">
      <Button
        type="button"
        variant={selected ? "secondary" : "ghost"}
        className="h-9 flex-1 justify-start px-2.5 font-normal"
        onClick={handleClick}
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
          onClick={handleStarClick}
        >
          <StarIcon
            className={cn("size-4", starred && "fill-amber-500 text-amber-600")}
          />
        </Button>
      ) : null}
    </li>
  );
});

const PresetPeriodList = memo(function PresetPeriodList({
  selectedType,
  isSignedIn,
  favoritePeriodsOrdered,
  favoriteSet,
  onPresetSelect,
  onToggleFavorite,
}: {
  selectedType: Period;
  isSignedIn: boolean;
  favoritePeriodsOrdered: Period[];
  favoriteSet: Set<Period>;
  onPresetSelect: (period: Exclude<Period, "custom">) => void;
  onToggleFavorite: (
    period: Exclude<Period, "custom">,
    e: MouseEvent,
  ) => void;
}) {
  const favoritesHint = useMemo(
    () =>
      isSignedIn ? (
        <div className="mt-2 space-y-1">
          <p className="text-muted-foreground text-xs">
            Favorites: {favoritePeriodsOrdered.length}/{MAX_PINNED_PERIODS}
          </p>
        </div>
      ) : null,
    [favoritePeriodsOrdered.length, isSignedIn],
  );

  return (
    <div className="border-border flex min-h-0 flex-col border-b p-4 md:border-r md:border-b-0">
      <p className="text-sm font-medium">Common ranges</p>
      {favoritesHint}
      <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {selectablePeriods.map((period) => (
          <PresetRow
            key={period}
            period={period}
            selected={selectedType === period}
            starred={favoriteSet.has(period)}
            isSignedIn={isSignedIn}
            onSelect={onPresetSelect}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </ul>
    </div>
  );
});

function PeriodSelectDialogInner({
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
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const boundsRef = useRef<{ start: number | null; end: number | null }>({
    start: null,
    end: null,
  });
  boundsRef.current = {
    start: customStart?.getTime() ?? null,
    end: customEnd?.getTime() ?? null,
  };

  useEffect(() => {
    if (!isOpen) return;
    const { start, end } = boundsRef.current;
    if (
      start !== null &&
      end !== null &&
      !Number.isNaN(start) &&
      !Number.isNaN(end)
    ) {
      setCustomRange({
        from: new Date(start),
        to: new Date(end),
      });
    } else {
      setCustomRange(undefined);
    }
  }, [isOpen]);

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

  const selectedType = selectedPeriod.type;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[52rem]">
        <div className="grid h-[min(80vh,36rem)] min-h-[30rem] grid-cols-1 md:grid-cols-[16rem_1fr]">
          <PresetPeriodList
            selectedType={selectedType}
            isSignedIn={isSignedIn}
            favoritePeriodsOrdered={favoritePeriodsOrdered}
            favoriteSet={favoriteSet}
            onPresetSelect={onPresetSelect}
            onToggleFavorite={onToggleFavorite}
          />
          <div className="flex min-h-0 flex-col p-4">
            <p className="text-base font-medium">Custom date range</p>
            <div className="mt-3 flex-1 p-1">
              <RangeCalendar selected={customRange} onSelect={setCustomRange} />
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
}

export const PeriodSelectDialog = memo(
  PeriodSelectDialogInner,
  periodSelectDialogPropsEqual,
);
