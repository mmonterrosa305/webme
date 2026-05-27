import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "WebMe Pricing",
};

const TIERS = [
  {
    name: "Monthly",
    setup: "$0",
    monthly: "$99/mo",
    description: "Most flexible. No setup fee and cancel anytime.",
    features: [
      "Site on webme subdomain (clientname.webme.io)",
      "WebMe-owned site (no ownership transfer)",
      "Cancel anytime, site goes offline if cancelled",
      "1 page",
      "1 update per month",
      "No custom domain",
    ],
  },
  {
    name: "Starter",
    setup: "$199",
    monthly: "$29/mo",
    description: "Best value for ownership + low monthly cost.",
    badge: "Most popular",
    features: [
      "Customer owns the site forever",
      "Custom domain setup included",
      "Site stays even if hosting is cancelled",
      "1 page",
      "2 updates per month",
      "No SEO, no e-commerce",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    setup: "$599",
    monthly: "$59/mo",
    description: "Advanced package for growth and online sales.",
    features: [
      "Customer owns the site forever",
      "Custom domain setup included",
      "Up to 6 pages",
      "SEO optimization + Google setup",
      "E-commerce capability",
      "Logo design included",
      "Unlimited monthly updates",
      "Priority support",
    ],
  },
] satisfies Array<{
  name: string;
  setup: string;
  monthly: string;
  description: string;
  features: readonly string[];
  badge?: string;
  highlighted?: boolean;
}>;

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-16 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            Simple pricing for local businesses
          </h1>
          <p className="mt-3 text-neutral-600">
            Choose the plan that fits your launch style and growth goals.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-2xl border bg-white p-6 shadow-sm ${
                tier.highlighted
                  ? "border-neutral-900 ring-2 ring-neutral-900"
                  : "border-neutral-200"
              }`}
            >
              <div className="mb-4 min-h-10">
                {tier.badge ? (
                  <span className="inline-flex rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                    {tier.badge}
                  </span>
                ) : null}
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">{tier.name}</h2>
              <p className="mt-2 text-neutral-600">{tier.description}</p>
              <p className="mt-4 text-3xl font-bold text-neutral-900">
                {tier.setup}
                <span className="ml-2 text-base font-normal text-neutral-500">
                  + {tier.monthly}
                </span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-neutral-700">
                {tier.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Get started
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-10 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-neutral-900">
              Feature comparison
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              See exactly what changes between Monthly, Starter, and Premium.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="px-6 py-3 font-medium">Feature</th>
                  <th className="px-6 py-3 font-medium">Monthly</th>
                  <th className="px-6 py-3 font-medium">Starter</th>
                  <th className="px-6 py-3 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-6 py-3 text-neutral-700">Upfront fee</td>
                  <td className="px-6 py-3">$0</td>
                  <td className="px-6 py-3">$199</td>
                  <td className="px-6 py-3">$599</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">Monthly fee</td>
                  <td className="px-6 py-3">$99/mo</td>
                  <td className="px-6 py-3">$29/mo</td>
                  <td className="px-6 py-3">$59/mo</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">Ownership</td>
                  <td className="px-6 py-3">WebMe owns it</td>
                  <td className="px-6 py-3">Customer owns forever</td>
                  <td className="px-6 py-3">Customer owns forever</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">Pages</td>
                  <td className="px-6 py-3">1 page</td>
                  <td className="px-6 py-3">1 page</td>
                  <td className="px-6 py-3">Up to 6 pages</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">Monthly updates</td>
                  <td className="px-6 py-3">1 update</td>
                  <td className="px-6 py-3">2 updates</td>
                  <td className="px-6 py-3">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">Custom domain</td>
                  <td className="px-6 py-3">No</td>
                  <td className="px-6 py-3">Included</td>
                  <td className="px-6 py-3">Included</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">SEO + Google setup</td>
                  <td className="px-6 py-3">No</td>
                  <td className="px-6 py-3">No</td>
                  <td className="px-6 py-3">Included</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">E-commerce</td>
                  <td className="px-6 py-3">No</td>
                  <td className="px-6 py-3">No</td>
                  <td className="px-6 py-3">Included</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-neutral-700">Logo design</td>
                  <td className="px-6 py-3">No</td>
                  <td className="px-6 py-3">No</td>
                  <td className="px-6 py-3">Included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
