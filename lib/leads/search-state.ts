import { INDUSTRIES } from "@/lib/agents/site-options";
import type { LeadSearchResult } from "@/lib/leads/types";

export type LeadsSearchModuleState = {
  city: string;
  industry: string;
  results: LeadSearchResult[];
  hasSearched: boolean;
  showExistingSites: boolean;
};

const leadsSearchState: LeadsSearchModuleState = {
  city: "",
  industry: INDUSTRIES[0],
  results: [],
  hasSearched: false,
  showExistingSites: false,
};

export function getLeadsSearchState(): LeadsSearchModuleState {
  return leadsSearchState;
}

export function persistLeadsSearchState(
  partial: Partial<LeadsSearchModuleState>,
): void {
  if (partial.city !== undefined) {
    leadsSearchState.city = partial.city;
  }

  if (partial.industry !== undefined) {
    leadsSearchState.industry = partial.industry;
  }

  if (partial.results !== undefined) {
    leadsSearchState.results = partial.results;
  }

  if (partial.hasSearched !== undefined) {
    leadsSearchState.hasSearched = partial.hasSearched;
  }

  if (partial.showExistingSites !== undefined) {
    leadsSearchState.showExistingSites = partial.showExistingSites;
  }
}

export function persistLeadsSearchStateFull(
  city: string,
  industry: string,
  results: LeadSearchResult[],
  showExistingSites: boolean,
): void {
  leadsSearchState.city = city;
  leadsSearchState.industry = industry;
  leadsSearchState.results = results;
  leadsSearchState.showExistingSites = showExistingSites;
  leadsSearchState.hasSearched = true;
}

export function clearLeadsSearchState(): void {
  leadsSearchState.city = "";
  leadsSearchState.industry = INDUSTRIES[0];
  leadsSearchState.results = [];
  leadsSearchState.hasSearched = false;
  leadsSearchState.showExistingSites = false;
}
