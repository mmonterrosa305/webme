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

export function SiteBuildPriceSelector({
  value,
  onChange,
  disabled = false,
  id = "site-build-price",
}: SiteBuildPriceSelectorProps) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-medium text-neutral-800">
        Site build price
      </legend>
      <p className="text-xs text-neutral-500">
        Controls the Claim This Site button and Stripe checkout amount for this
        site.
      </p>
      <div className="flex flex-wrap gap-2">
        {SITE_BUILD_PRICE_OPTIONS.map((amount) => {
          const selected = value === amount;
          const inputId = `${id}-${amount}`;
          return (
            <label
              key={amount}
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                selected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                id={inputId}
                type="radio"
                name={id}
                value={amount}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(amount)}
                className="sr-only"
              />
              ${amount}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
