"use client";

import type { ReactNode } from "react";

import { LeadsSearchProvider } from "./leads-search-context";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return <LeadsSearchProvider>{children}</LeadsSearchProvider>;
}
