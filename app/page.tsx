import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MyWebMe — Professional websites for local businesses",
  description:
    "We build your business a real website in 24 hours. No tech skills needed. Preview free, then go live when you're ready.",
};

const STEPS = [
  {
    number: "1",
    title: "We find your business",
    description:
      "We search for businesses like yours that need a website.",
  },
  {
    number: "2",
    title: "We build your site",
    description:
      "A fully designed, professional website built for your industry in 24 hours.",
  },
  {
    number: "3",
    title: "You approve and go live",
    description:
      "Review it, request changes, then publish with one click.",
  },
] as const;

const PLANS = [
  {
    name: "Basic",
    price: "$99/mo",
    priceNote: "no setup fee",
    features: [
      "Professional 1-page website",
      "Hosted on our domain",
      "Mobile-friendly design",
      "Contact form included",
      "Cancel anytime",
    ],
    featured: false,
  },
  {
    name: "Pro",
    price: "$199 one-time + first month free, then $29/mo",
    priceNote: null,
    badge: "Most popular",
    features: [
      "Everything in Basic",
      "You own the website",
      "Custom domain name",
      "1 fully designed page",
      "Google-ready setup",
      "Site stays live if you cancel",
      "Edit your website anytime",
      "First month of hosting free",
    ],
    featured: true,
  },
  {
    name: "Elite",
    priceIntro: "$599 one-time + first month free, then",
    priceStrikethrough: "$59/mo",
    pricePromo: "$9.99/mo",
    offerExpires: "Offer expires 7/1",
    priceNote: null,
    features: [
      "Everything in Pro",
      "6 fully designed pages",
      "SEO optimization",
      "E-commerce ready",
      "Custom logo design",
      "Priority support",
      "Edit your website anytime",
      "First month of hosting free",
    ],
    featured: false,
  },
] as const;

const SAMPLE_SITES = [
  {
    name: "Sunshine Pool Service",
    industry: "Pool Service",
    slug: "sunshine-pool-service-miami",
  },
  {
    name: "Apex HVAC Solutions",
    industry: "HVAC",
    slug: "apex-hvac-solutions-tampa",
  },
  {
    name: "Bright Smile Dental",
    industry: "Dental",
    slug: "bright-smile-dental-orlando",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "Within two weeks of going live, my phone started ringing more. People tell me they found me online and the site made us look legit.",
    author: "Maria G.",
    business: "Miami Cleaning Services",
  },
  {
    quote:
      "I was getting maybe one call a week from Google. Now it's three or four. Best investment I've made for my plumbing business.",
    author: "Carlos R.",
    business: "Tampa Plumbing Co.",
  },
  {
    quote:
      "Clients book appointments straight from the website. I didn't think a site would matter for a salon, but the calls prove it does.",
    author: "Sandra L.",
    business: "Orlando Hair Studio",
  },
] as const;

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`text-2xl font-semibold lowercase tracking-tight ${className}`}
    >
      mywebme
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo className="text-neutral-900" />
          <Link
            href="/build"
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section
          className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32"
          style={{ backgroundColor: "#0f172a" }}
        >
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your business deserves a real website.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              We build it for you in 24 hours. No tech skills needed. No
              templates to figure out.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#live-preview"
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-white/80 bg-transparent px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                See a live example
              </a>
              <Link
                href="/build"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-neutral-900 transition-colors hover:bg-slate-100 sm:w-auto"
              >
                Get your free preview
              </Link>
            </div>
            <p className="mt-8 text-sm text-slate-400 sm:text-base">
              ⭐ Trusted by local businesses across the US
            </p>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="bg-white py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                How it works
              </h2>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((item) => (
                <article
                  key={item.number}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-8 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white">
                    {item.number}
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-neutral-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-neutral-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Live preview */}
        <section
          id="live-preview"
          className="py-20 sm:py-28"
          style={{ backgroundColor: "#0f172a" }}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                See what we build
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Real websites we&apos;ve built for real businesses.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {SAMPLE_SITES.map((site) => (
                <article
                  key={site.slug}
                  className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-8"
                >
                  <h3 className="text-xl font-semibold text-white">
                    {site.name}
                  </h3>
                  <span className="mt-3 inline-flex w-fit rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200">
                    {site.industry}
                  </span>
                  <div className="mt-8 flex-1" />
                  <Link
                    href={`/site/${site.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    View site
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="bg-neutral-50 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Simple, honest pricing
              </h2>
              <p className="mt-4 text-lg text-neutral-600">
                No hidden fees. Cancel anytime.
              </p>
            </div>
            <div className="mt-14 flex flex-col gap-8 lg:flex-row lg:items-stretch">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex min-w-0 flex-1 flex-col rounded-3xl border bg-white p-8 shadow-sm sm:p-10 ${
                    plan.featured
                      ? "border-2 border-neutral-900 shadow-md ring-1 ring-neutral-900/5 lg:scale-[1.02]"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="mb-5 min-h-8">
                    {"badge" in plan && plan.badge ? (
                      <span className="inline-flex rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900">
                    {plan.name}
                  </h3>
                  {"priceIntro" in plan ? (
                    <div className="mt-5">
                      <p className="text-xl font-semibold leading-snug text-neutral-900 sm:text-2xl">
                        {plan.priceIntro}
                      </p>
                      <p className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
                        <span
                          className="text-neutral-400"
                          style={{ textDecoration: "line-through" }}
                        >
                          {plan.priceStrikethrough}
                        </span>{" "}
                        <span
                          className="font-bold"
                          style={{ color: "#16a34a" }}
                        >
                          {plan.pricePromo}
                        </span>
                      </p>
                      <p className="mt-2 text-xs font-medium text-orange-600">
                        {plan.offerExpires}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-5 text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
                      {plan.price}
                    </p>
                  )}
                  {plan.priceNote ? (
                    <p className="mt-2 text-sm text-neutral-500">
                      {plan.priceNote}
                    </p>
                  ) : null}
                  <ul className="mt-8 flex-1 space-y-4 text-base text-neutral-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <span className="mt-0.5 text-emerald-600">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/build"
                    className={`mt-10 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold transition-colors ${
                      plan.featured
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "border-2 border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    Get started
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                What business owners say
              </h2>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <blockquote
                  key={item.author}
                  className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50/80 p-8"
                >
                  <p className="flex-1 text-base leading-relaxed text-neutral-700">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <footer className="mt-6 border-t border-neutral-200 pt-6">
                    <p className="font-semibold text-neutral-900">
                      {item.author}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {item.business}
                    </p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t border-slate-800 py-12"
        style={{ backgroundColor: "#0f172a" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Logo className="text-white" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                Professional websites for local businesses. Built fast, priced
                fairly.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <a
                href="#how-it-works"
                className="text-slate-300 transition-colors hover:text-white"
              >
                How it works
              </a>
              <a
                href="#live-preview"
                className="text-slate-300 transition-colors hover:text-white"
              >
                Examples
              </a>
              <a
                href="#pricing"
                className="text-slate-300 transition-colors hover:text-white"
              >
                Pricing
              </a>
              <Link
                href="/build"
                className="text-slate-300 transition-colors hover:text-white"
              >
                Get started
              </Link>
              <Link
                href="/contact"
                className="text-slate-300 transition-colors hover:text-white"
              >
                Contact
              </Link>
              <Link
                href="/privacy"
                className="text-slate-300 transition-colors hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-slate-300 transition-colors hover:text-white"
              >
                Terms
              </Link>
            </div>
          </div>
          <p className="mt-10 border-t border-slate-800 pt-8 text-sm text-slate-500">
            © {new Date().getFullYear()} MyWebMe. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
