"use client";

import * as React from "react";
import {
  CalendarIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  TimerIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ThemeSettings } from "./theme-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { periods } from "@/lib/consts/periods";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { userSettings } from "@/lib/consts/settings";
import { cn } from "@/lib/utils";
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";

function formatSelectedPeriod(selected: ProviderPeriod): string {
  if (selected.type === "custom") {
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
    return `${fmt.format(selected.from)} – ${fmt.format(selected.end)}`;
  }
  return periods[selected.type]?.label ?? selected.type;
}

function useSortedTimezones(): string[] {
  return React.useMemo(() => {
    try {
      return [...Intl.supportedValuesOf("timeZone")].sort((a, b) =>
        a.localeCompare(b),
      );
    } catch {
      return ["UTC"];
    }
  }, []);
}

export default function SettingsPage() {
  const { selectedPeriod, openPeriodSelectDialog } = usePeriod();
  const timezones = useSortedTimezones();
  const [tzOpen, setTzOpen] = React.useState(false);
  const utils = api.useUtils();

  const timezoneQuery = api.user.getTimezone.useQuery();
  const setTimezone = api.user.setTimezone.useMutation({
    onSuccess: () => {
      toast.success("Timezone updated");
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not update timezone");
    },
    onSettled: () => {
      void utils.user.getTimezone.invalidate();
    },
  });

  const currentTz = timezoneQuery.data?.timezone ?? "UTC";

  const defaultSessionGap = userSettings.SESSION_GAP_SECONDS
    .defaultValue as number;
  const sessionGapQuery = api.user.getSessionGapSeconds.useQuery();
  const [sessionGapInput, setSessionGapInput] = React.useState(
    String(defaultSessionGap),
  );

  React.useEffect(() => {
    if (sessionGapQuery.data?.seconds != null) {
      setSessionGapInput(String(sessionGapQuery.data.seconds));
    }
  }, [sessionGapQuery.data?.seconds]);

  const setSessionGap = api.user.setSessionGapSeconds.useMutation({
    onSuccess: (data) => {
      setSessionGapInput(String(data.seconds));
      toast.success("Session gap updated");
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not update session gap");
    },
    onSettled: () => {
      void utils.user.getSessionGapSeconds.invalidate();
      void utils.session.getLongestSessions.invalidate();
    },
  });

  const parsedSessionGap = Number.parseInt(sessionGapInput, 10);
  const savedSessionGap =
    sessionGapQuery.data?.seconds ?? defaultSessionGap;
  const canSaveSessionGap =
    Number.isInteger(parsedSessionGap) &&
    parsedSessionGap >= 1 &&
    parsedSessionGap <= 10_800 &&
    parsedSessionGap !== savedSessionGap;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control how the app looks and how your listening stats are interpreted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose light or dark mode and a color theme. Preferences are saved
            on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default stats period</CardTitle>
          <CardDescription>
            Preset used for charts and totals when you open the app. You can
            still switch temporarily from the header.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {formatSelectedPeriod(selectedPeriod)}
          </p>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => openPeriodSelectDialog()}
          >
            <CalendarIcon className="size-4" />
            Change default period
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TimerIcon className="size-4" />
            Listening session gap
          </CardTitle>
          <CardDescription>
            Plays within this many seconds of each other count as the same
            continuous listening session. Default is {defaultSessionGap}{" "}
            seconds (5 minutes).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Label htmlFor="session-gap-seconds">Gap (seconds)</Label>
            <Input
              id="session-gap-seconds"
              type="number"
              min={1}
              max={10800}
              step={1}
              inputMode="numeric"
              disabled={sessionGapQuery.isLoading || setSessionGap.isPending}
              value={sessionGapInput}
              onChange={(e) => setSessionGapInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSaveSessionGap) {
                  setSessionGap.mutate({ seconds: parsedSessionGap });
                }
              }}
              className="h-10"
            />
          </div>
          <Button
            type="button"
            disabled={!canSaveSessionGap || setSessionGap.isPending}
            onClick={() =>
              setSessionGap.mutate({ seconds: parsedSessionGap })
            }
          >
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="size-4" />
            Timezone
          </CardTitle>
          <CardDescription>
            Used when grouping plays by calendar day and for date boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Popover open={tzOpen} onOpenChange={setTzOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={tzOpen}
                disabled={timezoneQuery.isLoading || setTimezone.isPending}
                className="h-10 w-full max-w-md justify-between font-normal"
              >
                <span className="truncate">{currentTz}</span>
                <ChevronsUpDownIcon className="text-muted-foreground ml-2 size-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-2rem,var(--radix-popover-trigger-width))] max-w-md p-0">
              <Command>
                <CommandInput placeholder="Search timezone…" />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {timezones.map((tz) => (
                      <CommandItem
                        key={tz}
                        value={tz}
                        keywords={[tz.replace(/_/g, " ")]}
                        onSelect={() => {
                          setTimezone.mutate({ timezone: tz });
                          setTzOpen(false);
                        }}
                        className={cn(tz === currentTz && "bg-muted/60")}
                      >
                        {tz}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
    </div>
  );
}
