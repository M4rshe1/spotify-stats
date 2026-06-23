"use client";

import {
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";

export type FallbackImageProps = Omit<
  ComponentPropsWithoutRef<"img">,
  "src"
> & {
  sources: readonly (string | null | undefined)[];
  fallback?: ReactNode;
};

function normalizeSources(
  sources: readonly (string | null | undefined)[],
): string[] {
  return sources.filter((source): source is string => Boolean(source));
}

export function FallbackImage({
  sources,
  fallback = null,
  onError,
  ...imageProps
}: FallbackImageProps) {
  const validSources = normalizeSources(sources);
  const sourcesKey = validSources.join("\0");

  const [sourceIndex, setSourceIndex] = useState(0);
  const prevSourcesKey = useRef(sourcesKey);
  if (prevSourcesKey.current !== sourcesKey) {
    prevSourcesKey.current = sourcesKey;
    setSourceIndex(0);
  }

  const src = validSources[sourceIndex];
  if (!src) {
    return fallback;
  }

  function handleError(event: SyntheticEvent<HTMLImageElement, Event>) {
    onError?.(event);
    setSourceIndex((index) => index + 1);
  }

  return <img key={src} {...imageProps} src={src} onError={handleError} />;
}
