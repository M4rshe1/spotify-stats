"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { FallbackImage } from "./fallback-image";

const PROXY_PATH = "/api/image";

export type ProxyImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src: string | null | undefined;
  alt: string;
  fallback?: ReactNode;
};

export function ProxyImage({
  src,
  alt,
  fallback = null,
  ...props
}: ProxyImageProps) {
  if (!src) {
    return fallback;
  }

  const urls = [src];

  if (!src.startsWith("/")) {
    urls.push(`${PROXY_PATH}?url=${encodeURIComponent(src)}`);
  }

  return (
    <FallbackImage
      sources={urls}
      alt={alt}
      fallback={fallback}
      {...props}
    />
  );
}
