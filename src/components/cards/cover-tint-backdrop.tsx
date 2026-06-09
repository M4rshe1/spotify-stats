"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Rgb = { r: number; g: number; b: number };

const prominentColorCache = new Map<string, Rgb | null>();

function rgbToHsl(rgb: Rgb): { h: number; s: number; l: number } {
  let { r, g, b } = rgb;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s, l: l };
}

function hslToRgb(hsl: { h: number; s: number; l: number }): Rgb {
  let { h, s, l } = hsl;
  h = h / 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p: number, q: number, t: number) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function makeVibrant(rgb: Rgb): Rgb {
  const hsl = rgbToHsl(rgb);
  hsl.s = Math.min(hsl.s * 1.65, 1);
  return hslToRgb(hsl);
}

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
        return makeVibrant({
          r: Math.round(sr / n),
          g: Math.round(sg / n),
          b: Math.round(sb / n),
        });
      }

      return makeVibrant({
        r: Math.round(wr / weightSum),
        g: Math.round(wg / weightSum),
        b: Math.round(wb / weightSum),
      });
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
  colorOverride,
  fillsContainer = false,
}: {
  coverUrl: string | null;
  className?: string;
  colorOverride?: string;
  fillsContainer?: boolean;
}) {
  const [accent, setAccent] = useState<Rgb | null>(null);

  useEffect(() => {
    if (!!colorOverride && colorOverride.startsWith("#")) {
      setAccent({
        r: parseInt(colorOverride.slice(1, 3), 16),
        g: parseInt(colorOverride.slice(3, 5), 16),
        b: parseInt(colorOverride.slice(5, 7), 16),
      });

      return;
    }
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
        background: fillsContainer
          ? `linear-gradient(
          to right,
          ${rgba(accent, 0.72)} 0%,
          ${rgba(accent, 0.38)} 28%,
          ${rgba(accent, 0.22)} 55%,
          ${rgba(accent, 0.12)} 100%
        )`
          : `linear-gradient(
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
