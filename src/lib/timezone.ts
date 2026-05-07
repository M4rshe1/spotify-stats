export const DEFAULT_IANA_TIMEZONE = "Etc/UTC";

export function isValidIanaTimezone(value: string): boolean {
  try {
    // Intl throws RangeError for invalid IANA time zone identifiers.
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeIanaTimezone(value: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions()
    .timeZone;
}
