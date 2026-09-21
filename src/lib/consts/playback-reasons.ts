export const PLAYBACK_REASON_LABELS: Record<string, string> = {
  trackdone: "Track finished",
  fwdbtn: "Skip forward",
  backbtn: "Back",
  clickrow: "Clicked",
  playbtn: "Play button",
  appload: "App opened",
  remote: "Remote",
  endplay: "Stopped",
  logout: "Logged out",
  "unexpected-exit": "App closed",
  "unexpected-exit-while-paused": "Closed while paused",
  trackerror: "Error",
  nextbtn: "Next",
  prevbtn: "Previous",
  unknown: "Unknown",
  autoplay: "Autoplay",
  followplay: "Auto-play next",
};

export function playbackReasonLabel(reason: string) {
  const key = reason.trim().toLowerCase();
  return PLAYBACK_REASON_LABELS[key] ?? reason;
}

export function countryDisplayName(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized || normalized === "ZZ") return "Unknown";
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(normalized) ??
      normalized
    );
  } catch {
    return normalized;
  }
}
