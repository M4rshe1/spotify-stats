"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type BreadcrumbCrumb = {
  label: string;
  href: string;
};

type BreadcrumbContextValue = {
  override: BreadcrumbCrumb[] | null;
  setBreadcrumbs: (crumbs: BreadcrumbCrumb[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

type BreadcrumbProviderProps = {
  children: ReactNode;
};

export function BreadcrumbProvider({ children }: BreadcrumbProviderProps) {
  const pathname = usePathname();
  const [override, setOverride] = useState<BreadcrumbCrumb[] | null>(null);

  useEffect(() => {
    setOverride(null);
  }, [pathname]);

  const setBreadcrumbs = useCallback((crumbs: BreadcrumbCrumb[] | null) => {
    setOverride(crumbs);
  }, []);

  const value = useMemo(
    () => ({ override, setBreadcrumbs }),
    [override, setBreadcrumbs],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useSetBreadcrumbs() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useSetBreadcrumbs must be used within BreadcrumbProvider");
  }
  return ctx.setBreadcrumbs;
}

/** Used by `Header` to merge pathname-derived breadcrumbs with client-set overrides */
export function useBreadcrumbOverride() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbOverride must be used within BreadcrumbProvider");
  }
  return ctx.override;
}
