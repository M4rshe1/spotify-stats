"use client";

import * as React from "react";
import { CalendarIcon, ChevronsUpDownIcon, GlobeIcon } from "lucide-react";
import { toast } from "sonner";

import { ThemeSwitcherRow } from "@/components/theme-switcher";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { periods } from "@/lib/consts/periods";
import type { ProviderPeriod } from "@/lib/consts/periods";
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
            Theme applies on this device and matches your sidebar controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitcherRow />
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
