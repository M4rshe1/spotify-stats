"use client";

import {
  useBreadcrumbs,
  type BreadcrumbCrumb,
} from "@/providers/breadcrumb-provider";
import { useEffect } from "react";

export type { BreadcrumbCrumb };

type PageBreadcrumbsProps = {
  trail: BreadcrumbCrumb[];
};

export function PageBreadcrumbs({ trail }: PageBreadcrumbsProps) {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs(trail.length > 0 ? trail : null);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs, trail]);

  return null;
}
