"use client";

import { useSetBreadcrumbs, type BreadcrumbCrumb } from "@/providers/breadcrumb-provider";
import { useEffect, useMemo } from "react";

export type { BreadcrumbCrumb };

type PageBreadcrumbsProps = {
  trail: BreadcrumbCrumb[];
};

/**
 * Renders nothing. Registers `trail` in the breadcrumb header on mount and clears on unmount.
 * Safe to render from a server component parent (props are serialized to the client bundle).
 */
export function PageBreadcrumbs({ trail }: PageBreadcrumbsProps) {
  const setBreadcrumbs = useSetBreadcrumbs();
  const trailKey = useMemo(() => JSON.stringify(trail), [trail]);

  useEffect(() => {
    const parsed = JSON.parse(trailKey) as BreadcrumbCrumb[];
    setBreadcrumbs(parsed.length > 0 ? parsed : null);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs, trailKey]);

  return null;
}
