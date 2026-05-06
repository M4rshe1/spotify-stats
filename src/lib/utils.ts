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
    return Math.floor(this.durationMs / 3600_000);
  }

  toMinutes() {
    return Math.floor(this.durationMs / 60000);
  }

  toSeconds() {
    return Math.floor(this.durationMs / 1000);
  }

  toString() {
    return `${this.toHours()}h ${this.toMinutes()}m ${this.toSeconds()}s`.trim();
  }
  toFormattedString(format: string) {
    const hours = Math.floor(this.durationMs / 3_600_000);
    const minutes = Math.floor((this.durationMs % 3_600_000) / 60_000);
    const seconds = Math.floor((this.durationMs % 60_000) / 1000);
    const milliseconds = this.durationMs % 1000;
    return format
      .replace("{H}", this.toHours().toString())
      .replace("{M}", this.toMinutes().toString())
      .replace("{S}", this.toSeconds().toString())
      .replace("{MS}", this.durationMs.toString())
      .replace("{h}", hours.toString())
      .replace("{m}", minutes.toString())
      .replace("{s}", seconds.toString())
      .replace("{ms}", milliseconds.toString());
  }
}

export function duration(durationMs: number) {
  return new Duration().fromMs(durationMs);
}

export function msToMin(durationMs: number) {
  return Math.floor(durationMs / 60000);
}

export function formatPercentage(percentage: number) {
  if (percentage == Infinity) {
    return "∞";
  }
  return `${percentage.toFixed(2)}%`;
}
