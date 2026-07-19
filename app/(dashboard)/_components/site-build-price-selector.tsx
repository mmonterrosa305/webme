"use client";

import {
  SITE_BUILD_PRICE_OPTIONS,
  type SiteBuildPriceUsd,
} from "@/lib/plans/build-price";

type SiteBuildPriceSelectorProps = {
  value: SiteBuildPriceUsd;
  onChange: (value: SiteBuildPriceUsd) => void;
  disabled?: boolean;
  id?: string;
};

/**
 * Three-button price tier control ($99 / $200 / $500).
 * Defaults to $99 at call sites via DEFAULT_SITE_BUILD_PRICE_USD.
 */
export function SiteBuildPriceSelector({
  value,
  onChange,
  disabled = false,
  id = "site-build-price",
}: SiteBuildPriceSelectorProps) {
  return (
    <div className="space-y-2">
      <div>
        <p
          id={`${id}-label`}
          className="text-sm font-medium text-neutral-800"
        >
          Site build price
        </p>
        <p className="text-xs text-neutral-500">
          Sets Claim This Site and Stripe checkout for this site.
        </p>
      </div>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="flex flex-wrap gap-2"
      >
        {SITE_BUILD_PRICE_OPTIONS.map((amount) => {
          const selected = value === amount;
          return (
            <button
              key={amount}
              id={`${id}-${amount}`}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(amount)}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500 hover:bg-neutral-50"
              }`}
            >
              ${amount}
            </button>
          );
        })}
      </div>
    </div>
  );
}
