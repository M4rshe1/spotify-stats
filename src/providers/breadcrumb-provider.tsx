"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BreadcrumbCrumb = {
  label: string;
  href: string;
};

type BreadcrumbContextValue = {
  breadcrumbs: BreadcrumbCrumb[] | null;
  setBreadcrumbs: (crumbs: BreadcrumbCrumb[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

type BreadcrumbProviderProps = {
  children: ReactNode;
};

export function BreadcrumbProvider({ children }: BreadcrumbProviderProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbCrumb[] | null>(
    null,
  );

  const value = useMemo(
    () => ({ breadcrumbs, setBreadcrumbs }),
    [breadcrumbs, setBreadcrumbs],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbs must be used within BreadcrumbProvider");
  }
  return {
    breadcrumbs: ctx.breadcrumbs,
    setBreadcrumbs: ctx.setBreadcrumbs,
  };
}
