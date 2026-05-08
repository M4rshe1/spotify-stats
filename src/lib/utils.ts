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

  private formatNumber(number: number, short: boolean, level: 1 | 2 | 3 = 1) {
    return short ? formatNumber(number, level) : number.toLocaleString();
  }

  toFormattedString(format: string, short: boolean = true, level: 1 | 2 | 3 = 1) {
    const hours = Math.floor(this.durationMs / 3_600_000);
    const minutes = Math.floor((this.durationMs % 3_600_000) / 60_000);
    const seconds = Math.floor((this.durationMs % 60_000) / 1_000);
    const milliseconds = this.durationMs % 1_000;

    const formatMap: Record<string, string> = {
      "{H}": this.formatNumber(this.toHours(), short, level),
      "{M}": this.formatNumber(this.toMinutes(), short, level),
      "{S}": this.formatNumber(this.toSeconds(), short, level),
      "{MS}": this.formatNumber(this.durationMs, short, level),
      "{h}": this.formatNumber(hours, short, level),
      "{m}": this.formatNumber(minutes, short, level  ),
      "{s}": this.formatNumber(seconds, short, level),
      "{ms}": this.formatNumber(milliseconds, short, level),
    };

    let formatted = format;
    for (const [key, value] of Object.entries(formatMap)) {
      formatted = formatted.replace(key, value);
    }
    return formatted;
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
