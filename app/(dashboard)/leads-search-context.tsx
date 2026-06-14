"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { INDUSTRIES } from "@/lib/agents/site-options";
import type { LeadSearchResult } from "@/lib/leads/types";

type LeadsSearchContextValue = {
  city: string;
  industry: string;
  results: LeadSearchResult[];
  hasSearched: boolean;
  showExistingSites: boolean;
  setCity: (value: string) => void;
  setIndustry: (value: string) => void;
  setResults: (value: LeadSearchResult[]) => void;
  setHasSearched: (value: boolean) => void;
  setShowExistingSites: (value: boolean) => void;
  persistSearchState: (
    nextCity: string,
    nextIndustry: string,
    nextResults: LeadSearchResult[],
    nextShowExistingSites: boolean,
  ) => void;
  clearSearch: () => void;
};

const LeadsSearchContext = createContext<LeadsSearchContextValue | null>(null);

export function LeadsSearchProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [results, setResults] = useState<LeadSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showExistingSites, setShowExistingSites] = useState(false);

  const value = useMemo<LeadsSearchContextValue>(
    () => ({
      city,
      industry,
      results,
      hasSearched,
      showExistingSites,
      setCity,
      setIndustry,
      setResults,
      setHasSearched,
      setShowExistingSites,
      persistSearchState: (
        nextCity,
        nextIndustry,
        nextResults,
        nextShowExistingSites,
      ) => {
        setCity(nextCity);
        setIndustry(nextIndustry);
        setResults(nextResults);
        setShowExistingSites(nextShowExistingSites);
        setHasSearched(true);
      },
      clearSearch: () => {
        setCity("");
        setIndustry(INDUSTRIES[0]);
        setResults([]);
        setHasSearched(false);
        setShowExistingSites(false);
      },
    }),
    [city, industry, results, hasSearched, showExistingSites],
  );

  return (
    <LeadsSearchContext.Provider value={value}>
      {children}
    </LeadsSearchContext.Provider>
  );
}

export function useLeadsSearch() {
  const context = useContext(LeadsSearchContext);

  if (!context) {
    throw new Error("useLeadsSearch must be used within LeadsSearchProvider");
  }

  return context;
}
