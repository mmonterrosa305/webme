import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MyWebMe — Professional websites for local businesses",
  description:
    "We build you a professional website — fast, affordable, and stress-free. You focus on running your business. We handle everything else.",
};

const CONTACT_EMAIL = "mailto:sites@mywebme.com";

const STEPS = [
  {
    step: "Step 1",
    title: "We build your site",
    description:
      "We create a professional website tailored to your business — no effort required from you.",
  },
  {
    step: "Step 2",
    title: "You preview it",
    description:
      "Click the link we send you. See your new site live. Love it or we'll make it right.",
  },
  {
    step: "Step 3",
    title: "You go live",
    description:
      "Pick a plan, claim your site, and start getting found by new customers online.",
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
    price: "$599 one-time + first month free, then $59/mo",
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

const TESTIMONIALS = [
  {
    quote: "I had no idea how easy this could be...",
    author: "Maria G.",
    business: "Miami Cleaning Services",
  },
  {
    quote: "Best money I've ever spent on my business...",
    author: "Carlos R.",
    business: "Tampa Plumbing Co.",
  },
  {
    quote:
      "I didn't even know I needed a website until I saw what they built for me...",
    author: "Sandra L.",
    business: "Orlando Hair Studio",
  },
] as const;

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
    >
      {children}
    </a>
  );
}

function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classNames = `inline-flex items-center justify-center rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 ${className}`;

  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={classNames}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classNames}>
      {children}
    </Link>
  );
}

function OutlineButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-lg border border-neutral-900 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 ${className}`}
    >
      {children}
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="MyWebMe"
              height="100"
              style={{ height: "100px", width: "auto" }}
            />
          </Link>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-4 sm:gap-8">
              <NavLink href="#how-it-works">How it works</NavLink>
              <NavLink href="#pricing">Pricing</NavLink>
            </div>
            <PrimaryButton href="/preview" className="px-4 py-2 text-sm">
              Get your website
            </PrimaryButton>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600">
              Built for local businesses
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              Your business deserves a website that works for you
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral-600">
              We build you a professional website — fast, affordable, and
              stress-free. You focus on running your business. We handle
              everything else.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <PrimaryButton href="/preview">See your free preview</PrimaryButton>
              <OutlineButton href="#how-it-works">How it works</OutlineButton>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-neutral-100 bg-white py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Up and running in 3 simple steps
              </h2>
              <p className="mt-4 text-lg text-neutral-600">
                No tech skills needed. No back and forth. Just results.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((item) => (
                <article
                  key={item.step}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"
                >
                  <p className="text-sm font-medium text-neutral-500">
                    {item.step}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-neutral-900">
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

        {/* Pricing */}
        <section
          id="pricing"
          className="border-t border-neutral-100 bg-white py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Select your plan
              </h2>
              <p className="mt-4 text-lg text-neutral-600">
                No hidden fees. Cancel anytime.
              </p>
            </div>
            <div className="mt-12 flex flex-col gap-6 md:flex-row md:items-start">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex min-w-0 flex-1 flex-col rounded-2xl border bg-white p-6 sm:p-8 ${
                    plan.featured
                      ? "border-2 border-neutral-900"
                      : "border border-neutral-200"
                  }`}
                >
                  <div className="mb-4 min-h-7">
                    {"badge" in plan && plan.badge ? (
                      <span className="inline-flex rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900">
                    {plan.name}
                  </h3>
                  <p className="mt-3 text-xl font-semibold leading-snug text-neutral-900 sm:text-2xl">
                    {plan.price}
                  </p>
                  {plan.priceNote ? (
                    <p className="mt-1 text-sm text-neutral-500">
                      {plan.priceNote}
                    </p>
                  ) : null}
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="text-neutral-400">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.featured ? (
                    <PrimaryButton href={CONTACT_EMAIL} className="mt-8 w-full">
                      Get started
                    </PrimaryButton>
                  ) : (
                    <a
                      href={CONTACT_EMAIL}
                      className="mt-8 inline-flex w-full items-center justify-center rounded-lg border border-neutral-900 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
                    >
                      Get started
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-t border-neutral-100 bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                What business owners say
              </h2>
              <p className="mt-4 text-lg text-neutral-600">
                Real results for real local businesses
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <blockquote
                  key={item.author}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"
                >
                  <p className="text-lg leading-relaxed text-neutral-900">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <footer className="mt-6">
                    <p className="font-medium text-neutral-900">{item.author}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {item.business}
                    </p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="border-t border-neutral-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              Ready to get your business online?
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              We&apos;ve already built a website for your business. Click below
              to see it.
            </p>
            <PrimaryButton href="/preview" className="mt-8">
              See your free preview
            </PrimaryButton>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-500">© 2026 MyWebMe</p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
            >
              Contact
            </Link>
            <Link
              href="/terms"
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
