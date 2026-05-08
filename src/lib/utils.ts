import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

  toFormattedString(format: string) {
    const hours = Math.floor(this.durationMs / 3_600_000);
    const minutes = Math.floor((this.durationMs % 3_600_000) / 60_000);
    const seconds = Math.floor((this.durationMs % 60_000) / 1_000);
    const milliseconds = this.durationMs % 1_000;
    return format
      .replace("{H}", this.toHours().toLocaleString())
      .replace("{M}", this.toMinutes().toLocaleString())
      .replace("{S}", this.toSeconds().toLocaleString())
      .replace("{MS}", this.durationMs.toLocaleString())
      .replace("{h}", hours.toLocaleString())
      .replace("{m}", minutes.toLocaleString())
      .replace("{s}", seconds.toLocaleString())
      .replace("{ms}", milliseconds.toLocaleString());
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
