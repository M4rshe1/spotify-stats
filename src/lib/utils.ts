import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatNumber } from "./number";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

class Duration {
  private durationMs: number = 0;
  fromMs(durationMs: number) {
    this.durationMs = durationMs;
    return this;
  }

  toDays() {
    return Math.floor(this.durationMs / 86_400_000);
  }

  toHours() {
    return Math.floor(this.durationMs / 3_600_000);
  }

  toMinutes() {
    return Math.floor(this.durationMs / 60_000);
  }

  toSeconds() {
    return Math.floor(this.durationMs / 1_000);
  }

  toString() {
    return `${this.toHours().toLocaleString()}h ${this.toMinutes().toLocaleString()}m ${this.toSeconds().toLocaleString()}s`.trim();
  }

  toHoursLeft() {
    return Math.floor((this.durationMs % 86_400_000) / 3_600_000);
  }
  toMinLeft() {
    return Math.floor((this.durationMs % 3_600_000) / 60_000);
  }

  toSecLeft() {
    return Math.floor((this.durationMs % 60_000) / 1_000);
  }

  toMsLeft() {
    return this.durationMs % 1_000;
  }

  private formatNumber(number: number, short: boolean, level: 1 | 2 | 3 = 1) {
    return short ? formatNumber(number, level) : number.toLocaleString();
  }

  toFormattedString(
    format: string,
    short: boolean = true,
    level: 1 | 2 | 3 = 1,
  ) {
    const formatMap: Record<string, string> = {
      "{H}": this.formatNumber(this.toHours(), short, level),
      "{M}": this.formatNumber(this.toMinutes(), short, level),
      "{S}": this.formatNumber(this.toSeconds(), short, level),
      "{MS}": this.formatNumber(this.durationMs, short, level),
      "{h}": this.formatNumber(this.toHoursLeft(), short, level),
      "{m}": this.formatNumber(this.toMinLeft(), short, level),
      "{s}": this.formatNumber(this.toSecLeft(), short, level),
      "{ms}": this.formatNumber(this.toMsLeft(), short, level),
      "{D}": this.formatNumber(this.toDays(), short, level),
    };

    let formatted = format;
    for (const [key, value] of Object.entries(formatMap)) {
      formatted = formatted.replace(key, value);
    }
    return formatted;
  }

  toBestDurationString(short: boolean = false, level: 1 | 2 | 3 = 1): string {
    const days = this.toDays();
    const hours = this.toHours();
    const minutes = this.toMinutes();
    if (days > 0) {
      return this.toFormattedString("{D}d {h}h {m}m {s}s", short, level);
    } else if (hours > 0) {
      return this.toFormattedString("{h}h {m}m {s}s", short, level);
    } else if (minutes > 0) {
      return this.toFormattedString("{m}m {s}s", short, level);
    } else {
      return this.toFormattedString("{s}s", short, level);
    }
  }
}

export function duration(durationMs: number) {
  return new Duration().fromMs(durationMs);
}

export function msToMin(durationMs: number) {
  return Math.floor(durationMs / 60000);
}

export function formatPercent(percentage: number) {
  if (percentage == Infinity) {
    return "∞";
  }
  if (!Number.isFinite(percentage)) return "0%";
  return `${percentage.toFixed(2)}%`;
}

export const TOP_CARD_ENTITY_NAME_MAX = 32;

export function truncateText(text: string, maxLetters: number): string {
  if (maxLetters < 1) return "";
  const chars = [...text];
  if (chars.length <= maxLetters) return text;
  return `${chars.slice(0, maxLetters).join("")}…`;
}
