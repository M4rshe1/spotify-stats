"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  REGISTRATION_MODES,
  registrationModeUi,
  type RegistrationMode,
} from "@/lib/consts/registration";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { tryCatchSync } from "@/lib/try-catch";

export function AdminSettingsPageClient() {
  const utils = api.useUtils();
  const {
    data: settings,
    isLoading,
    isError,
    error,
  } = api.admin.getSettings.useQuery();
  const [mode, setMode] = useState<RegistrationMode>("closed");
  const [allowedEmails, setAllowedEmails] = useState("");

  useEffect(() => {
    if (settings) {
      setMode(settings.REGISTRATION_MODE as RegistrationMode);
      setAllowedEmails(
        (settings.ALLOWED_EMAILS as unknown as string[])?.join(","),
      );
    }
  }, [settings]);

  const mutation = api.admin.setSettings.useMutation({
    onSuccess: () => {
      toast.success("Registration settings saved");
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not save settings");
    },
    onSettled: () => {
      void utils.admin.getSettings.invalidate();
    },
  });

  async function saveSettings() {
    const emails = allowedEmails.split(",").map((email) => email.trim());
    const allowedEmailsJson = tryCatchSync(() => JSON.stringify(emails));

    if (allowedEmailsJson.error) {
      toast.error("Could not parse allowed emails");
      return;
    }

    await mutation.mutateAsync({
      settings: {
        REGISTRATION_MODE: mode,
        ALLOWED_EMAILS: allowedEmailsJson.data,
      },
    });
  }

  const dirty =
    settings != null &&
    (mode !== settings.mode || allowedEmails !== settings.allowedEmails);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
          <CardDescription>
            Control the registration mode and allowed emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Loading…
            </div>
          ) : isError ? (
            <p className="text-destructive text-sm">
              {error.message ?? "Could not load settings"}
            </p>
          ) : (
            <>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as RegistrationMode)}
                disabled={mutation.isPending}
                className="gap-3"
              >
                {REGISTRATION_MODES.map((value) => {
                  const { label, description } = registrationModeUi[value];
                  return (
                    <Label
                      key={value}
                      htmlFor={`registration-mode-${value}`}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-medium"
                    >
                      <RadioGroupItem
                        value={value}
                        id={`registration-mode-${value}`}
                        aria-label={label}
                        defaultChecked={value === mode}
                      />
                      <div className="grid gap-1 leading-none">
                        {label}
                        <p className="text-muted-foreground text-sm">
                          {description}
                        </p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="allowed-emails">Allowed emails</Label>
                <Textarea
                  id="allowed-emails"
                  placeholder="alice@example.com, bob@example.com"
                  value={allowedEmails}
                  onChange={(e) => setAllowedEmails(e.target.value)}
                  disabled={mutation.isPending || mode !== "restricted"}
                  rows={4}
                  className="font-mono text-sm"
                />
                {mode !== "restricted" ? (
                  <p className="text-muted-foreground text-xs">
                    Allowlist applies only when registration is set to
                    Restricted.
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                disabled={!dirty || mutation.isPending}
                onClick={() => {
                  void saveSettings();
                }}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
