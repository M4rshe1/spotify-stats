"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Rgb = { r: number; g: number; b: number };

const prominentColorCache = new Map<string, Rgb | null>();

async function extractProminentColor(imageUrl: string): Promise<Rgb | null> {
  const cached = prominentColorCache.get(imageUrl);
  if (cached !== undefined) {
    return cached;
  }

  async function compute(): Promise<Rgb | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("load"));
        img.src = imageUrl;
      });

      const w = 56;
      const h = 56;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);

      let wr = 0;
      let wg = 0;
      let wb = 0;
      let weightSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const a = data[i + 3]!;
        if (a < 16) continue;
        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        const chroma = mx - mn;
        const wpx = chroma * chroma + 6;
        wr += r * wpx;
        wg += g * wpx;
        wb += b * wpx;
        weightSum += wpx;
      }

      if (weightSum < 1) {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]!;
          if (a < 16) continue;
          sr += data[i]!;
          sg += data[i + 1]!;
          sb += data[i + 2]!;
          n++;
        }
        if (n < 1) return null;
        return {
          r: Math.round(sr / n),
          g: Math.round(sg / n),
          b: Math.round(sb / n),
        };
      }

      return {
        r: Math.round(wr / weightSum),
        g: Math.round(wg / weightSum),
        b: Math.round(wb / weightSum),
      };
    } catch {
      return null;
    }
  }

  const result = await compute();
  prominentColorCache.set(imageUrl, result);
  return result;
}

function rgba(rgb: Rgb, alpha: number) {
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${alpha})`;
}

export function CoverTintBackdrop({
  coverUrl,
  className,
}: {
  coverUrl: string | null;
  /** Include rounding (e.g. `rounded-md`) so the tint clips to row cards. */
  className?: string;
}) {
  const [accent, setAccent] = useState<Rgb | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!coverUrl) {
      setAccent(null);
      return;
    }
    void extractProminentColor(coverUrl).then((rgb) => {
      if (!cancelled) setAccent(rgb);
    });
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  if (!accent) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 isolate z-0 overflow-hidden opacity-[0.34] dark:opacity-[0.26]",
        className,
      )}
      aria-hidden
      style={{
        background: `linear-gradient(
          to right,
          ${rgba(accent, 0.72)} 0%,
          ${rgba(accent, 0.32)} 32%,
          ${rgba(accent, 0.1)} 55%,
          transparent 78%
        )`,
      }}
    />
  );
}
